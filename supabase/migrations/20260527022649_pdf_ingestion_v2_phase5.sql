-- ============================================================
-- Pipeline v2 — Phase 5: Math Notation Repair
--
-- Spec: docs/ingestion/pipeline-v2-redesign-plan.md (Phase 5
-- section, replaced after user review).
--
-- Detects OCR-mangled math (x2 → x², ambiguous fractions, etc.)
-- and either auto-repairs the LOW-RISK cases or routes to
-- needs_human_review with the candidate attached. Cautious by
-- design — never mutates question_text or choice_text unless
-- ALL 8 conditions of the auto-repair gate pass.
--
-- STORAGE MODEL
--   quiz_questions.raw_question_text = original extraction
--   quiz_questions.question_text     = active website text
--                                      (== raw_question_text unless
--                                       a verified_auto_repair fired)
--   answer_choices.raw_choice_text   = original
--   answer_choices.choice_text       = active website choice
--   math_repair_records              = full audit trail
--
-- All changes are ADDITIVE. We do NOT drop or rename existing
-- columns. The raw_*_text columns are backfilled from the
-- current value of question_text / choice_text on existing rows
-- so the "rolled back" state is recoverable for every row.
-- ============================================================

-- ── quiz_questions: storage model + opt-in marker ───────────────
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS raw_question_text TEXT,
  ADD COLUMN IF NOT EXISTS math_notation_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS math_notation_status TEXT;

-- Backfill: every existing row treats its current question_text as
-- the original. After this runs, no row has raw_question_text=null;
-- new imports also set it explicitly in import-csv-direct.
UPDATE public.quiz_questions
SET raw_question_text = question_text
WHERE raw_question_text IS NULL;

-- Now make raw_question_text NOT NULL — it's the source of truth.
ALTER TABLE public.quiz_questions
  ALTER COLUMN raw_question_text SET NOT NULL;

CREATE INDEX IF NOT EXISTS quiz_questions_math_notation_checked_idx
  ON public.quiz_questions(math_notation_checked_at)
  WHERE math_notation_checked_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS quiz_questions_math_notation_status_idx
  ON public.quiz_questions(math_notation_status)
  WHERE math_notation_status IS NOT NULL;

COMMENT ON COLUMN public.quiz_questions.raw_question_text IS
  'Immutable snapshot of the originally-extracted question_text. '
  'question_text may diverge from this after a Phase 5 '
  'verified_auto_repair fires. Read this column to see what the '
  'PDF originally produced; read question_text to see what the '
  'student sees today.';

COMMENT ON COLUMN public.quiz_questions.math_notation_checked_at IS
  'Opt-in marker for Phase 5 publish-gate rules. NULL means Phase 5 '
  'has never inspected this row; the new math-notation gates short-'
  'circuit. Same pattern as source_assets_processed_at from Phase 3.';

COMMENT ON COLUMN public.quiz_questions.math_notation_status IS
  'App-enforced (no DB CHECK in phase 5). One of: no_repair_needed, '
  'verified_auto_repair, suggested_repair_needs_review, '
  'ambiguous_repair, unrepairable_from_source.';

-- ── answer_choices: same storage model for choice_text ──────────
ALTER TABLE public.answer_choices
  ADD COLUMN IF NOT EXISTS raw_choice_text TEXT;

UPDATE public.answer_choices
SET raw_choice_text = choice_text
WHERE raw_choice_text IS NULL;

ALTER TABLE public.answer_choices
  ALTER COLUMN raw_choice_text SET NOT NULL;

COMMENT ON COLUMN public.answer_choices.raw_choice_text IS
  'Immutable snapshot of the originally-extracted choice_text. '
  'Same role as quiz_questions.raw_question_text — preserved so a '
  'Phase 5 repair can be rolled back per-choice if review rejects it.';

-- ── math_repair_records: full audit trail ──────────────────────
CREATE TABLE IF NOT EXISTS public.math_repair_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,

  -- Which text was inspected. Phase 5 covers 'question_text' and
  -- 'choice_text' only; other fields (passage, explanation_text)
  -- are deferred to Phase 5.5.
  field TEXT NOT NULL CHECK (field IN ('question_text', 'choice_text')),
  -- For choice_text: 'A' / 'B' / 'C' / 'D'. NULL when field='question_text'.
  field_index TEXT,

  -- The before/after text for this specific field.
  raw_text TEXT NOT NULL,
  repaired_text TEXT NOT NULL,

  -- Which of the 5 risk tiers (see math-notation-logic.mjs).
  risk_tier TEXT NOT NULL CHECK (risk_tier IN (
    'low_risk_ocr',
    'medium_risk_grouping',
    'high_risk_answer_changing',
    'open_ended_uncertain',
    'visual_unclear'
  )),
  -- e.g. 'bare_digit_after_letter', 'ambiguous_fraction',
  -- 'sqrt_without_parens', 'missing_caret_visual', etc. Free-text;
  -- enumeration enforced in app code first.
  detection_pattern TEXT,

  -- 8-condition gate evidence (per user policy).
  visual_confirmed BOOLEAN,
  visual_confirmation_confidence NUMERIC,
  solver_agreement_count INT,
  changes_verified_answer BOOLEAN,
  creates_answer_key_dispute BOOLEAN,
  is_open_ended_ambiguous BOOLEAN,

  -- Per-record status — drives the question's math_notation_status.
  status TEXT NOT NULL CHECK (status IN (
    'no_repair_needed',
    'verified_auto_repair',
    'suggested_repair_needs_review',
    'ambiguous_repair',
    'unrepairable_from_source'
  )),

  -- Non-null when the repair was auto-applied to the live field.
  applied_at TIMESTAMPTZ,

  -- Free-form evidence: model responses, candidate alternatives,
  -- sympy output, solver vote tally, etc.
  raw_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS math_repair_records_question_id_idx
  ON public.math_repair_records(question_id, created_at DESC);

CREATE INDEX IF NOT EXISTS math_repair_records_status_idx
  ON public.math_repair_records(status);

CREATE INDEX IF NOT EXISTS math_repair_records_risk_tier_idx
  ON public.math_repair_records(risk_tier);

CREATE INDEX IF NOT EXISTS math_repair_records_applied_idx
  ON public.math_repair_records(applied_at)
  WHERE applied_at IS NOT NULL;

COMMENT ON TABLE public.math_repair_records IS
  'Phase 5 math-notation repair audit trail. One row per detected '
  'suspicious pattern. Append-only — re-running phase 5 produces new '
  'rows, never overwrites. Each row carries the full evidence the '
  '8-condition auto-repair gate evaluated.';

-- ── Phase 5 signals view ──────────────────────────────────────
-- Mirrors the Phase 3 signals view pattern so publish-gate.mjs
-- can hydrate per-row math-repair counts in one query.
CREATE OR REPLACE VIEW public.quiz_questions_phase5_signals AS
SELECT
  q.id                              AS question_id,
  q.math_notation_checked_at,
  q.math_notation_status,
  -- Most-recent record per question (highest created_at). The
  -- script writes at most one record per (question, field, run) so
  -- "most recent" is the active one.
  mr.status                         AS latest_repair_status,
  mr.risk_tier                      AS latest_repair_risk_tier,
  mr.applied_at                     AS latest_repair_applied_at,
  EXISTS(
    SELECT 1 FROM public.math_repair_records r
    WHERE r.question_id = q.id
      AND r.status IN ('suggested_repair_needs_review',
                       'ambiguous_repair',
                       'unrepairable_from_source')
  )                                  AS has_unreviewed_repair,
  EXISTS(
    SELECT 1 FROM public.math_repair_records r
    WHERE r.question_id = q.id
      AND r.status = 'verified_auto_repair'
  )                                  AS has_verified_auto_repair
FROM public.quiz_questions q
LEFT JOIN LATERAL (
  SELECT status, risk_tier, applied_at
  FROM public.math_repair_records mr
  WHERE mr.question_id = q.id
  ORDER BY created_at DESC
  LIMIT 1
) mr ON TRUE;

COMMENT ON VIEW public.quiz_questions_phase5_signals IS
  'Read-only aggregate for publish-gate.mjs. Surfaces the per-row '
  'math-notation status + repair existence without an N+1 join.';

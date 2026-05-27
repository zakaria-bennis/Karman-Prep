-- ============================================================
-- Pipeline v2 — Phase 7: Explanation Generation After Verification
--
-- Spec: docs/ingestion/pipeline-v2-redesign-plan.md (Phase 7
-- section, replaced after user review).
--
-- Adds the storage for the richer explanation_v2 bundle (per-choice
-- explanations + evidence + optional misconception notes + tip
-- fields + slug alignment), the opt-in marker, the per-question
-- status, and the append-only QA audit table.
--
-- DESIGN NOTES
--   · explanation_v2          — JSONB canonical bundle. Legacy
--     explanation_text / explanation_per_choice / desmos_strategy
--     are MIRRORED from this for UI back-compat but the JSONB is
--     the source of truth going forward.
--   · explanation_v2_filled_at — opt-in marker. NULL means Phase 7
--     hasn't filled this row; the new publish-gate rules
--     short-circuit. Same pattern as source_assets_processed_at,
--     math_notation_checked_at, answer_verified_at.
--   · explanation_v2_status    — app-enforced enum (no DB CHECK so
--     we can add statuses without a migration). Values:
--       not_started, skipped_not_eligible, generated,
--       qa_passed, qa_failed, needs_human_review,
--       stale_answer_changed
--   · explanation_qa_records   — append-only audit. One row per QA
--     attempt. Captures schema verdict, critic verdict, regen-
--     attempt counter, model used.
--
-- All changes are ADDITIVE. We do NOT drop or rename existing
-- columns. explanation_text / explanation_per_choice continue to
-- be NOT NULL TEXT — Phase 7's fill-explanations-v2 mirrors into
-- them after generating explanation_v2.
-- ============================================================

-- ── quiz_questions: 3 new columns ──────────────────────────────
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS explanation_v2 JSONB,
  ADD COLUMN IF NOT EXISTS explanation_v2_filled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS explanation_v2_status TEXT;

CREATE INDEX IF NOT EXISTS quiz_questions_explanation_v2_filled_idx
  ON public.quiz_questions(explanation_v2_filled_at)
  WHERE explanation_v2_filled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS quiz_questions_explanation_v2_status_idx
  ON public.quiz_questions(explanation_v2_status)
  WHERE explanation_v2_status IS NOT NULL;

COMMENT ON COLUMN public.quiz_questions.explanation_v2 IS
  'Phase 7 canonical explanation bundle (JSONB). Shape: '
  '{version, generated_at, generator_model, critic_model, status, '
  'correct_reasoning, choices: {A,B,C,D: {explanation, evidence, '
  'misconception_note, internal_category}}, normal_tip, desmos_tip, '
  'acceptable_forms, slug_alignment, qa_notes, admin_diagnostic_note}. '
  'Legacy explanation_text + explanation_per_choice + desmos_strategy '
  'are mirrored from this for back-compat; the JSONB is source of truth.';

COMMENT ON COLUMN public.quiz_questions.explanation_v2_filled_at IS
  'Opt-in marker for Phase 7 publish-gate rules. NULL means Phase 7 '
  'has never processed this row; the new gates short-circuit. Same '
  'pattern as source_assets_processed_at, math_notation_checked_at, '
  'answer_verified_at.';

COMMENT ON COLUMN public.quiz_questions.explanation_v2_status IS
  'App-enforced (no DB CHECK in phase 7). One of: not_started, '
  'skipped_not_eligible, generated, qa_passed, qa_failed, '
  'needs_human_review, stale_answer_changed.';

-- ── explanation_qa_records: append-only audit ─────────────────
CREATE TABLE IF NOT EXISTS public.explanation_qa_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,

  -- Which attempt this is (1 = first generation; 2 = critic-driven repair).
  attempt_number INT NOT NULL CHECK (attempt_number >= 1 AND attempt_number <= 2),

  -- Generator metadata for the explanation_v2 this row audits.
  generator_role TEXT NOT NULL,
  generator_model TEXT NOT NULL,
  generator_cost_estimate NUMERIC,

  -- Schema verdict — runs first; if 'fail' the LLM critic is skipped.
  schema_result TEXT NOT NULL CHECK (schema_result IN ('pass', 'fail')),
  schema_missing_fields TEXT[],
  schema_invalid_fields TEXT[],

  -- Critic verdict — only populated when schema_result='pass'.
  critic_role TEXT,
  critic_model TEXT,
  critic_result TEXT CHECK (
    critic_result IS NULL OR critic_result IN (
      'pass',
      'fail_fixable',
      'fail_serious'
    )
  ),
  critic_findings JSONB,
  critic_cost_estimate NUMERIC,

  -- Final per-attempt outcome (drives the question's
  -- explanation_v2_status after the latest attempt).
  outcome TEXT NOT NULL CHECK (outcome IN (
    'qa_passed',
    'will_retry',
    'qa_failed',
    'needs_human_review'
  )),

  -- Snapshot of the explanation_v2 JSONB at this attempt. Lets a
  -- reviewer see what attempt 1 produced even after attempt 2
  -- overwrote the live column.
  explanation_snapshot JSONB,

  -- Free-form notes / debug.
  raw_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS explanation_qa_records_question_id_idx
  ON public.explanation_qa_records(question_id, created_at DESC);

CREATE INDEX IF NOT EXISTS explanation_qa_records_outcome_idx
  ON public.explanation_qa_records(outcome);

CREATE INDEX IF NOT EXISTS explanation_qa_records_schema_idx
  ON public.explanation_qa_records(schema_result);

CREATE INDEX IF NOT EXISTS explanation_qa_records_critic_idx
  ON public.explanation_qa_records(critic_result)
  WHERE critic_result IS NOT NULL;

COMMENT ON TABLE public.explanation_qa_records IS
  'Phase 7 explanation-QA audit trail. One row per attempt (max 2). '
  'Append-only — re-running QA on a question produces new rows. '
  'Schema verdict + critic verdict + the explanation_v2 snapshot.';

-- ── Phase 7 signals view ──────────────────────────────────────
-- Per-question aggregate that publish-gate.mjs reads to hydrate the
-- new Phase 7 gates without an N+1 join. Mirrors the Phase 3/5/6
-- signal-view pattern.
CREATE OR REPLACE VIEW public.quiz_questions_phase7_signals AS
SELECT
  q.id                                  AS question_id,
  q.explanation_v2_filled_at,
  q.explanation_v2_status,
  -- Latest QA attempt summary (highest attempt_number for this question).
  latest.attempt_number                 AS latest_qa_attempt_number,
  latest.outcome                        AS latest_qa_outcome,
  latest.schema_result                  AS latest_schema_result,
  latest.critic_result                  AS latest_critic_result,
  latest.created_at                     AS latest_qa_created_at
FROM public.quiz_questions q
LEFT JOIN LATERAL (
  SELECT
    attempt_number, outcome, schema_result, critic_result, created_at
  FROM public.explanation_qa_records r
  WHERE r.question_id = q.id
  ORDER BY r.created_at DESC
  LIMIT 1
) latest ON TRUE;

COMMENT ON VIEW public.quiz_questions_phase7_signals IS
  'Read-only aggregate for publish-gate.mjs. Surfaces the per-row '
  'Phase 7 status + the most recent QA attempt outcome.';

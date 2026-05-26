-- ============================================================
-- Pipeline v2 — Phase 2: Answer-Key Correction System
--
-- Spec: docs/ingestion/pipeline-v2-redesign-plan.md §872-1490.
--
-- v1 collapsed answer-key information into quiz_questions.correct_answer.
-- v2 phase 2 separates:
--   printed_answer            — what the original printed key says
--   manual_correction_answer  — what handwritten correction says (if any)
--   selected_official_answer  — pipeline's chosen key after reading corrections
--   verified_answer           — independent solver's conclusion
--   correct_answer            — active answer used by the app after verification
--
-- The official key is ~95% reliable. Manual red corrections override
-- printed answers only when visually confirmed at high confidence.
--
-- All changes are ADDITIVE. Phase 1's answer_key_entries shell gets
-- extended; nothing existing is dropped or renamed.
-- ============================================================

-- ── Extend answer_key_entries with Phase 2 fields ──────────────
ALTER TABLE public.answer_key_entries
  ADD COLUMN IF NOT EXISTS section TEXT,                  -- 'reading' | 'math'
  ADD COLUMN IF NOT EXISTS module TEXT,                   -- 'M1' | 'M2' | '1' | '2' | NULL
  ADD COLUMN IF NOT EXISTS source_question_number INT,    -- 1..N within section
  ADD COLUMN IF NOT EXISTS answer_mode TEXT,              -- 'multiple_choice' | 'numeric_entry'
  ADD COLUMN IF NOT EXISTS correction_detection_model TEXT,
  ADD COLUMN IF NOT EXISTS correction_detection_provider TEXT,
  ADD COLUMN IF NOT EXISTS printed_answer_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS printed_answer_crossed_out_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS selected_official_answer_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS acceptable_answers JSONB,
  ADD COLUMN IF NOT EXISTS answer_equivalence_status TEXT,
  ADD COLUMN IF NOT EXISTS review_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS review_reason TEXT;

CREATE INDEX IF NOT EXISTS answer_key_entries_source_locator_idx
  ON public.answer_key_entries(source_question_number, section, module);

CREATE INDEX IF NOT EXISTS answer_key_entries_review_required_idx
  ON public.answer_key_entries(review_required) WHERE review_required = TRUE;

-- Promote status column to enum-checked. Phase 1 left this free-text;
-- Phase 2 nails down the allowed values. We DROP the constraint if it
-- exists (idempotent) then re-add.
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.answer_key_entries'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.answer_key_entries DROP CONSTRAINT %I', cname);
  END IF;

  ALTER TABLE public.answer_key_entries
    ADD CONSTRAINT answer_key_entries_status_check
    CHECK (status IS NULL OR status IN (
      'printed_key_used_no_correction',
      'corrected_key_verified',
      'manual_correction_selected_pending_verification',
      'correction_unclear',
      'correction_disputed',
      'printed_key_crossed_out_no_readable_replacement',
      'missing_answer_key',
      'answer_key_row_unmatched'
    ));
END $$;

COMMENT ON COLUMN public.answer_key_entries.status IS
  'Enum CHECK applied in phase 2. Allowed: printed_key_used_no_correction, '
  'corrected_key_verified, manual_correction_selected_pending_verification, '
  'correction_unclear, correction_disputed, '
  'printed_key_crossed_out_no_readable_replacement, missing_answer_key, '
  'answer_key_row_unmatched.';

COMMENT ON COLUMN public.answer_key_entries.acceptable_answers IS
  'Open-ended math: array of equivalent forms for numeric_entry questions. '
  'e.g. ["3/2", "1.5", "1.50"]. Used by the grader to mark equivalence not '
  'mismatch.';

-- ── quiz_questions.answer_key_status — promote to CHECK ────────
-- Phase 1 left this free-text. Phase 2 narrows the allowed values
-- so the publish-gate cascade has known states to switch on.
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.quiz_questions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%answer_key_status%';

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.quiz_questions DROP CONSTRAINT %I', cname);
  END IF;

  ALTER TABLE public.quiz_questions
    ADD CONSTRAINT quiz_questions_answer_key_status_check
    CHECK (answer_key_status IS NULL OR answer_key_status IN (
      'printed_key_used_no_correction',
      'corrected_key_verified',
      'correct',
      'probably_wrong',
      'unverifiable',
      'formatting_error',
      'missing_answer_key',
      'question_unanswerable',
      'correction_unclear',
      'correction_disputed'
    ));
END $$;

-- ── quiz_questions.answer_verification_status — CHECK ──────────
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.quiz_questions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%answer_verification_status%';

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.quiz_questions DROP CONSTRAINT %I', cname);
  END IF;

  ALTER TABLE public.quiz_questions
    ADD CONSTRAINT quiz_questions_answer_verification_status_check
    CHECK (answer_verification_status IS NULL OR answer_verification_status IN (
      'unverified',
      'verified',
      'verified_pro',
      'verified_opus',
      'disputed',
      'unverifiable',
      'equivalent'
    ));
END $$;

-- ── source_assets: extend asset_type CHECK ─────────────────────
-- Phase 2 introduces 'answer_key_page' as a distinct type from the
-- pre-existing 'answer_key_crop' (which Phase 2 will use for per-row
-- cell crops). Both stay.
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.source_assets'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%asset_type%';

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.source_assets DROP CONSTRAINT %I', cname);
  END IF;

  ALTER TABLE public.source_assets
    ADD CONSTRAINT source_assets_asset_type_check
    CHECK (asset_type IN (
      'page_image',
      'question_crop',
      'expanded_question_crop',
      'figure_crop',
      'table_crop',
      'chart_crop',
      'graph_crop',
      'answer_key_page',
      'answer_key_crop',
      'calculator_artifact',
      'background_ui_artifact'
    ));
END $$;

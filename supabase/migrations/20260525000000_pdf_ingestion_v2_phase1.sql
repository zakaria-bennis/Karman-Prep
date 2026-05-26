-- ============================================================
-- Pipeline v2 — Phase 1: Publish Safety Layer
--
-- Spec: docs/ingestion/pipeline-v2-redesign-plan.md §283-869.
--
-- This migration is the foundation of v2. It adds the schema
-- needed to separate INGESTION metadata (import_status — what
-- the importer thought about the row) from STUDENT VISIBILITY
-- (publish_status — whether the row is allowed to reach learners).
--
-- The central rule v1 violated:
--   import_status = 'ok'  ⇏  student-facing
--
-- After this migration, the only path to student visibility is
-- publish_status IN ('publish_ready', 'publish_ready_with_verified_repair').
-- The publish_status starts as 'draft' on every new import and is
-- promoted by the publish-gate script ONLY after KaTeX validation,
-- grader consensus, and slug validity all check out.
--
-- All changes are ADDITIVE. We do not drop is_live, import_status,
-- or any v1 column. The rollback plan in §835 of the spec relies
-- on additive-only changes so the old pipeline keeps working until
-- v2 is fully cut over.
-- ============================================================

-- ── 1.1 publish_status on quiz_questions ───────────────────────
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS publish_status TEXT NOT NULL DEFAULT 'draft'
  CHECK (publish_status IN (
    'draft',
    'publish_ready',
    'publish_ready_with_verified_repair',
    'needs_human_review',
    'blocked_missing_visual',
    'blocked_katex_error',
    'blocked_slug_uncertain',
    'blocked_answer_dispute',
    'corrupt_question',
    'duplicate_detected',
    'rejected'
  ));

CREATE INDEX IF NOT EXISTS quiz_questions_publish_status_idx
  ON public.quiz_questions(publish_status);

COMMENT ON COLUMN public.quiz_questions.publish_status IS
  'Student visibility gate. Every new row starts as ''draft''. Only '
  'publish-gate.mjs (run after grading + KaTeX validation) promotes '
  'rows to ''publish_ready''. import_status remains for ingestion '
  'metadata only — it does NOT control student visibility.';

-- ── 1.2 Answer-verification fields ─────────────────────────────
-- These hold the v2 answer-key correction system results. Phase 1
-- creates the columns; Phase 2 fills them with correction-aware
-- parsing. For v1-compat rows, publish-gate seeds them from the
-- printed correct_answer.
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS selected_official_answer TEXT,
  ADD COLUMN IF NOT EXISTS verified_answer TEXT,
  ADD COLUMN IF NOT EXISTS answer_key_status TEXT,
  ADD COLUMN IF NOT EXISTS answer_verification_status TEXT;

CREATE INDEX IF NOT EXISTS quiz_questions_answer_key_status_idx
  ON public.quiz_questions(answer_key_status);

CREATE INDEX IF NOT EXISTS quiz_questions_answer_verification_status_idx
  ON public.quiz_questions(answer_verification_status);

-- App-code-enforced allowed values for answer_key_status:
--   printed_key_used_no_correction
--   corrected_key_verified
--   correct
--   probably_wrong
--   unverifiable
--   formatting_error
--   missing_answer_key
--   question_unanswerable
--   correction_unclear
--   correction_disputed
COMMENT ON COLUMN public.quiz_questions.answer_key_status IS
  'Answer-key evidence status. Enforced in app code first; promoted '
  'to a CHECK constraint after Phase 2 fills the value distribution.';

-- ── 1.3 content_hash_v2 ────────────────────────────────────────
-- Improved dedup key. v1 used SHA-1 of question_text + 4 choices
-- only — collided on cross-text questions where stem + choices
-- were identical but passages differed (audit CRIT-4).
-- v2 includes subject, domain, answer_format, ALL passage fields,
-- plus stem + choices. SHA-256. Not yet UNIQUE — wait until backfill
-- is collision-tested.
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS content_hash_v2 TEXT;

CREATE INDEX IF NOT EXISTS quiz_questions_content_hash_v2_idx
  ON public.quiz_questions(content_hash_v2);

COMMENT ON COLUMN public.quiz_questions.content_hash_v2 IS
  'SHA-256 of subject|domain|answer_format|passage_intro|passage|'
  'passage_a|passage_b|question_text|choice_a..d. Replaces v1 '
  'content_hash (which collided on cross-text questions per audit '
  'CRIT-4). Not yet UNIQUE — backfill in progress.';

-- ── 2. Replace live view to use publish_status ─────────────────
-- The is_live generated column stays (still useful for admin
-- filtering on the legacy concept), but the student-facing view
-- now reads publish_status only. Per spec §421-441.
CREATE OR REPLACE VIEW public.quiz_questions_live AS
  SELECT * FROM public.quiz_questions
  WHERE publish_status IN ('publish_ready', 'publish_ready_with_verified_repair');

COMMENT ON VIEW public.quiz_questions_live IS
  'Student-facing view. Filters on publish_status (v2 gate). A row '
  'reaches students ONLY when publish_status IS ''publish_ready'' or '
  '''publish_ready_with_verified_repair''. import_status no longer '
  'controls visibility — it is ingestion metadata only.';

-- ── 3. grader_runs (append-only audit log) ─────────────────────
-- Purpose: preserve every per-model grader conclusion instead of
-- overwriting in quiz_questions.grader_votes. The JSONB column
-- stays for UI badges (latest summary); this table is the truth.
CREATE TABLE IF NOT EXISTS public.grader_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,

  -- All rows from one grader invocation share a run_group_id so a
  -- single "Pass 1 + Pass 2 + Pass 3" sweep can be reconstructed.
  run_group_id UUID,
  -- e.g. 'gemini_flash_solver', 'deepseek_solver', 'groq_llama_solver',
  -- 'gemini_pro_tiebreaker', 'claude_opus_arbiter'.
  grader_role TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,

  -- The model's answer + confidence + verdict signals.
  selected_answer TEXT,
  normalized_answer TEXT,
  confidence NUMERIC,
  answer_key_match BOOLEAN,
  is_answerable BOOLEAN,

  -- Sidecar flags the grader can surface even when not strictly
  -- about the answer (e.g. "answer choice C has missing exponent").
  suspected_formatting_issue BOOLEAN,
  formatting_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  visual_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  reasoning_summary TEXT,
  choice_analysis_json JSONB,

  -- Full audit trail.
  raw_response_json JSONB,
  input_hash TEXT,
  output_hash TEXT,
  cost_estimate NUMERIC,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS grader_runs_question_id_idx
  ON public.grader_runs(question_id, created_at DESC);

CREATE INDEX IF NOT EXISTS grader_runs_run_group_id_idx
  ON public.grader_runs(run_group_id);

CREATE INDEX IF NOT EXISTS grader_runs_role_model_idx
  ON public.grader_runs(grader_role, provider, model);

COMMENT ON TABLE public.grader_runs IS
  'Append-only log of every per-model grader conclusion. v1 '
  'overwrote into quiz_questions.grader_votes JSONB, losing '
  'historical evidence when a row was re-graded. v2 keeps that '
  'JSONB as latest-summary (UI badges) and writes here as audit '
  'truth. One row per (question, model, run).';

-- ── 4. source_assets (original-evidence registry) ──────────────
-- Phase 1 populates this lightly: existing figure crops + source
-- PDFs. Phase 4 adds page crops, question-region crops, etc.
CREATE TABLE IF NOT EXISTS public.source_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE,

  pdf_job_id UUID REFERENCES public.pdf_processing_jobs(id) ON DELETE SET NULL,
  source_pdf TEXT,
  page_number INT,

  asset_type TEXT NOT NULL CHECK (asset_type IN (
    'page_image',
    'question_crop',
    'expanded_question_crop',
    'figure_crop',
    'table_crop',
    'chart_crop',
    'graph_crop',
    'answer_key_crop',
    'calculator_artifact',
    'background_ui_artifact'
  )),

  asset_path TEXT NOT NULL,
  public_url TEXT,
  bbox JSONB,

  -- Used by the relevance system (Phase 4).
  crop_complete BOOLEAN,
  relevance TEXT CHECK (relevance IN ('required', 'optional', 'irrelevant', 'uncertain')),
  repeated_across_pages BOOLEAN NOT NULL DEFAULT FALSE,
  use_in_solving BOOLEAN NOT NULL DEFAULT FALSE,

  validation_status TEXT,
  notes TEXT,
  raw_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS source_assets_question_id_idx
  ON public.source_assets(question_id);

CREATE INDEX IF NOT EXISTS source_assets_pdf_page_idx
  ON public.source_assets(source_pdf, page_number);

CREATE INDEX IF NOT EXISTS source_assets_type_idx
  ON public.source_assets(asset_type);

COMMENT ON TABLE public.source_assets IS
  'Original-evidence registry: every artifact the importer/extractor '
  'kept that ties back to a question. Phase 1 only writes '
  'figure_crop rows for existing R2 images. Phase 4 adds page_image, '
  'question_crop, answer_key_crop, etc.';

-- ── 5. answer_key_entries (shell — Phase 2 fills it) ───────────
-- Phase 1 creates the table and writes ONE entry per imported
-- row mirroring the printed correct_answer. Phase 2 replaces this
-- with correction-aware parsing (red-ink scribbles on the key page,
-- crossed-out printed answer, etc.).
CREATE TABLE IF NOT EXISTS public.answer_key_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE,

  printed_answer TEXT,
  printed_answer_crossed_out BOOLEAN,

  manual_correction_present BOOLEAN NOT NULL DEFAULT FALSE,
  manual_correction_color TEXT,
  manual_correction_answer TEXT,
  manual_correction_confidence NUMERIC,

  selected_official_answer TEXT,
  selection_reason TEXT,

  answer_key_crop_path TEXT,
  answer_key_page INT,
  answer_key_bbox JSONB,

  status TEXT,
  raw_model_response JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS answer_key_entries_question_id_idx
  ON public.answer_key_entries(question_id);

CREATE INDEX IF NOT EXISTS answer_key_entries_status_idx
  ON public.answer_key_entries(status);

COMMENT ON TABLE public.answer_key_entries IS
  'Per-question answer-key evidence. Phase 1 writes a minimal '
  'entry per imported row (status=printed_key_used_no_correction). '
  'Phase 2 fills the correction-aware fields.';

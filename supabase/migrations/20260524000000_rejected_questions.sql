-- ============================================================
-- rejected_questions — recoverable soft-delete bin for questions
-- the admin removed during preview-validation (not via the live
-- quiz, not a hard delete).
--
-- Stores a JSONB snapshot of the quiz_questions row + its
-- answer_choices at the moment of rejection. Restoring = read
-- snapshot back into quiz_questions. Permanent delete = drop
-- this row.
--
-- JSONB snapshot (instead of mirroring every column) keeps this
-- schema stable as quiz_questions evolves — adding a column to
-- quiz_questions doesn't break old rejected rows or require
-- backfill.
--
-- Denormalized columns (source_pdf, source_page, domain,
-- question_preview) are duplicated on top of the snapshot so the
-- /admin/questions/rejected list page can sort/filter without
-- expanding the JSONB.
-- ============================================================

CREATE TABLE IF NOT EXISTS rejected_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The id the question had when it was still in quiz_questions.
  -- Used to detect when a re-import wants to recreate something
  -- we previously rejected.
  original_id uuid NOT NULL,

  -- Full point-in-time snapshot of the quiz_questions row.
  question_snapshot jsonb NOT NULL,
  -- Full point-in-time snapshot of the row's answer_choices.
  -- Shape: [{ letter: "A", choice_text: "..." }, ...]
  choices_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Rejection metadata.
  rejected_at timestamptz NOT NULL DEFAULT now(),
  rejected_by_user_id text,
  rejected_reason text,

  -- Denormalized columns for fast listing without JSONB extraction.
  -- Populated from the snapshot at insert time; if the snapshot
  -- changes (it shouldn't), these go stale. The recovery page
  -- shows the snapshot's question_text directly, so staleness
  -- here is purely a UX nit, not a data integrity issue.
  source_pdf text,
  source_page int,
  domain text,
  subject text,
  question_preview text,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rejected_questions_rejected_at_idx
  ON rejected_questions (rejected_at DESC);

CREATE INDEX IF NOT EXISTS rejected_questions_source_pdf_idx
  ON rejected_questions (source_pdf);

CREATE INDEX IF NOT EXISTS rejected_questions_original_id_idx
  ON rejected_questions (original_id);

COMMENT ON TABLE rejected_questions IS
  'Soft-delete bin for questions removed via the preview-validation '
  'flow. Recoverable via /admin/questions/rejected. Full quiz_questions '
  'row + answer_choices snapshot stored as JSONB so schema changes '
  'to quiz_questions do not break old rejected rows.';

COMMENT ON COLUMN rejected_questions.original_id IS
  'The quiz_questions.id this row held before rejection. Same id is '
  'used on restore so any external references (e.g. analytics) stay '
  'stable.';

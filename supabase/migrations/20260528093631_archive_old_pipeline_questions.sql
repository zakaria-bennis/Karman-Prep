-- ============================================================
-- archive_old_pipeline_questions — separate the pre-Phase-8.3
-- "old pipeline" content from the validated post-fix imports.
--
-- The product owner's reasoning: archive = "retired", students
-- see only what the new pipeline produced. Old pipeline content
-- stays inspectable by admins (via a separate /admin/questions/
-- archive view) but is invisible to students.
--
-- IMPLEMENTATION
-- 1. Add nullable `archived_at` TIMESTAMPTZ column.
-- 2. Redefine the existing `is_live` generated column to ALSO
--    require archived_at IS NULL. Every existing call site that
--    filters `.eq("is_live", true)` automatically respects the
--    archive boundary — one source of truth, no chance of a
--    forgotten check leaving archived content visible.
-- 3. Backfill: archive every row EXCEPT the 202406asiav2.pdf
--    smoke-test rows — the only content imported under a pipeline
--    with all known regressions fixed.
--
-- ROLLBACK: clear archived_at on individual rows to re-activate.
--   UPDATE quiz_questions SET archived_at = NULL WHERE id = '<uuid>';
-- The column itself is safe to keep after reversal.
-- ============================================================

-- 1. Add the column. Nullable + default NULL keeps existing
--    INSERT statements working without modification.
ALTER TABLE quiz_questions
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN quiz_questions.archived_at IS
'When set, hides this row from students entirely (via the is_live generated column) and from the default admin views. Admin pages can opt into showing archived rows via an explicit filter. NULL = active. Set en masse for pre-Phase-8.3 content via the 20260528 migration; new rows always insert NULL.';

-- 2. Drop the view + index + column that depend on the OLD
--    is_live definition. is_live is a STORED generated column;
--    PostgreSQL doesn't allow ALTER COLUMN to change the
--    expression — we have to drop and recreate.
--
--    Order matters: view depends on column, index depends on
--    column. Drop view first, then column (index drops with
--    column via implicit CASCADE on column).
DROP VIEW IF EXISTS public.quiz_questions_live;
ALTER TABLE public.quiz_questions DROP COLUMN IF EXISTS is_live;

-- 3. Re-add is_live with the EXTENDED definition:
--    · still hide needs_review rows (the original semantic)
--    · also hide archived rows (the new semantic)
ALTER TABLE public.quiz_questions
ADD COLUMN is_live BOOLEAN
GENERATED ALWAYS AS (
  (import_status IS NULL OR import_status = 'ok')
  AND archived_at IS NULL
) STORED;

COMMENT ON COLUMN public.quiz_questions.is_live IS
'TRUE when this question is ready for student consumption. Requires (import_status IS NULL OR ''ok'') AND archived_at IS NULL. Extended from the original definition in migration 20260518004500 to include the archive check (20260528).';

-- 4. Re-create the partial index on the live set.
CREATE INDEX IF NOT EXISTS quiz_questions_is_live_idx
ON public.quiz_questions (is_live)
WHERE is_live = true;

-- 5. Re-create the student-facing view.
CREATE OR REPLACE VIEW public.quiz_questions_live AS
SELECT * FROM public.quiz_questions WHERE is_live = true;

COMMENT ON VIEW public.quiz_questions_live IS
'Student-facing view of quiz_questions. Filters on the is_live generated column so needs_review rows AND archived rows never reach students. Admin code reads quiz_questions directly to see everything; student-facing code reads this view.';

-- 6. Partial index on archived rows for the /admin/questions/archive
--    page that lists them most-recent-first.
CREATE INDEX IF NOT EXISTS quiz_questions_archived_at_idx
ON public.quiz_questions (archived_at DESC)
WHERE archived_at IS NOT NULL;

-- 7. Index for the new source_pdf filter dropdown — fast distinct +
--    fast filter when an admin selects one PDF.
CREATE INDEX IF NOT EXISTS quiz_questions_source_pdf_idx
ON public.quiz_questions (source_pdf)
WHERE source_pdf IS NOT NULL;

-- 8. Backfill. Mark every existing row archived EXCEPT the
--    202406asiav2.pdf smoke-test rows. This is the entire point
--    of the migration — without it, the column would just be
--    NULL everywhere and nothing would change.
--
--    Why this exact cutoff: 202406asiav2.pdf is the ONLY PDF
--    to land in the bank with all of these fixes applied:
--      · Phase 8.1 source_pdf injection (PR #180)
--      · Phase 3 page-render zero-padding (PR #181)
--      · Phase 8.3 audit module wiring (the original phase)
--    Every prior row was imported under a pipeline that had at
--    least one silent regression. Student-facing risk is too
--    high to leave them active.
UPDATE quiz_questions
SET archived_at = NOW()
WHERE source_pdf IS DISTINCT FROM '202406asiav2.pdf';

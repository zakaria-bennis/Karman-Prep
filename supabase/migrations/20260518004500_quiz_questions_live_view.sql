-- Enforce "students only see live questions" at the database level.
-- Audit findings CRIT-2 + HIGH-14 (docs/question-bank-audit-2026-05-17.md).
--
-- TWO PIECES, ONE MIGRATION
-- ----------------------------------------------------------------
--
-- 1. Generated column `is_live` (HIGH-14)
--      Replaces the parallel `import_status.is.null,import_status.eq.ok`
--      filter chains that live throughout the app code. Every consumer
--      that needs the "is this live?" predicate filters on the one
--      column. If a new status like 'rejected' or 'archived' gets
--      added later, the generated expression below is the single
--      place to update — not 12+ scattered filter call sites.
--
-- 2. View `quiz_questions_live` (CRIT-2)
--      A pre-filtered view containing only live rows. Student-facing
--      query code reads from THIS view instead of the raw
--      quiz_questions table. A future engineer (or ML agent, or
--      import script) who forgets to add the live filter is
--      structurally prevented from leaking needs_review /
--      partial_emit / inferred-answer rows to students — the view
--      doesn't expose them.
--
--      Admin code keeps reading quiz_questions directly. The view
--      is a read-only convenience; mutations still go through the
--      base table.
--
-- IDEMPOTENT: ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS +
-- CREATE OR REPLACE VIEW. Safe to re-run.

-- ── 1. Generated column ──────────────────────────────────────
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS is_live BOOLEAN
  GENERATED ALWAYS AS (import_status IS NULL OR import_status = 'ok') STORED;

-- Partial index on live rows only — every student-facing query
-- filters is_live = true, so the index doesn't need to cover the
-- (much smaller) set of flagged rows.
CREATE INDEX IF NOT EXISTS quiz_questions_is_live_idx
  ON public.quiz_questions (is_live)
  WHERE is_live = true;

-- ── 2. View ──────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.quiz_questions_live AS
  SELECT * FROM public.quiz_questions WHERE is_live = true;

-- Document the view's role so any DB-level reader (psql, dashboard,
-- pgAdmin) sees the constraint that the codebase relies on.
COMMENT ON VIEW public.quiz_questions_live IS
  'Student-facing view of quiz_questions. Filters on the is_live ' ||
  'generated column so PDF-imported needs_review rows, inferred ' ||
  'answers, and other not-yet-accepted content never reach students. ' ||
  'Admin code reads quiz_questions directly to see everything; ' ||
  'student-facing code reads this view. Audit finding CRIT-2.';

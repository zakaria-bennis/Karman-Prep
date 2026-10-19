-- The archive migration recreated this view using is_live alone, which can
-- include newly imported draft rows. Keep the archive filter and require an
-- explicit publication decision at the database read boundary as well.
CREATE OR REPLACE VIEW public.quiz_questions_live AS
SELECT * FROM public.quiz_questions
WHERE is_live = true
  AND publish_status IN ('publish_ready', 'publish_ready_with_verified_repair');

COMMENT ON VIEW public.quiz_questions_live IS
  'Student-facing view. Requires both a live/unarchived row and an approved publication status. Draft and review rows are not student-visible.';

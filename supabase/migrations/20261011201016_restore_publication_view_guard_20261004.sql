-- Recorded from production supabase_migrations.schema_migrations (20261011201016).
-- Applied by hand on 20261011; this file makes the repo match production history. Do not edit.
-- The archive migration recreated this view using is_live alone, which can
-- include newly imported draft rows. Keep the archive filter and require an
-- explicit publication decision at the database read boundary as well.
-- Preserve the existing view's column order. New base-table columns may have
-- been added since the last view definition; SELECT * can then fail under
-- CREATE OR REPLACE VIEW or unexpectedly widen the student-facing view.
DO $$
DECLARE existing_columns text;
BEGIN
  SELECT string_agg(format('%I', attname), ', ' ORDER BY attnum)
    INTO existing_columns
    FROM pg_attribute
   WHERE attrelid = 'public.quiz_questions_live'::regclass
     AND attnum > 0 AND NOT attisdropped;
  IF existing_columns IS NULL THEN RAISE EXCEPTION 'Live question view has no columns'; END IF;
  EXECUTE format(
    'CREATE OR REPLACE VIEW public.quiz_questions_live AS SELECT %s FROM public.quiz_questions WHERE is_live = true AND publish_status IN (''publish_ready'', ''publish_ready_with_verified_repair'')',
    existing_columns
  );
END $$;

COMMENT ON VIEW public.quiz_questions_live IS
  'Student-facing view. Requires both a live/unarchived row and an approved publication status. Draft and review rows are not student-visible.';

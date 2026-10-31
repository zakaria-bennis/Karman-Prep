-- Recorded from production supabase_migrations.schema_migrations (20261013231801).
-- Applied by hand on 20261013; this file makes the repo match production history. Do not edit.
-- Preserve the source's separate Reading and Writing sections when no
-- numbered module exists. The importer/publish gate bind this exception to
-- the two reviewed source PDF hashes; the DB constraint enforces the shape.
ALTER TABLE public.quiz_questions
  DROP CONSTRAINT IF EXISTS quiz_questions_source_identity_complete;

ALTER TABLE public.quiz_questions
  ADD CONSTRAINT quiz_questions_source_identity_complete
  CHECK (
    source_version IS NULL OR (
      source_version ~ '^[a-f0-9]{64}$'
      AND source_section IS NOT NULL
      AND source_module IS NOT NULL
      AND (
        (source_section IN ('reading', 'math') AND source_module IN ('M1', 'M2'))
        OR (source_section IN ('reading', 'writing') AND source_module = 'UNSPECIFIED')
      )
      AND source_question_number IS NOT NULL AND source_question_number > 0
      AND source_occurrence IS NOT NULL AND source_occurrence > 0
    )
  ) NOT VALID;

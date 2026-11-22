-- Undo 20261122020000_question_origin.sql. Drops only what it added.
-- Delete the generated questions first (scripts/generator/load.ts --remove-batch) if they
-- must not become originals.
drop index if exists public.quiz_questions_origin_idx;
alter table public.quiz_questions
  drop constraint if exists quiz_questions_generated_practice_only,
  drop constraint if exists quiz_questions_origin_check;
alter table public.quiz_questions
  drop column if exists generator,
  drop column if exists origin;
-- after this, also: delete from supabase_migrations.schema_migrations where version = '20261122020000';

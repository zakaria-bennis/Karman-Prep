-- Undo 20261031050000_figure_spec.sql. Drops only the two columns it added.
alter table public.answer_choices
  drop column if exists choice_figure_spec;
alter table public.quiz_questions
  drop column if exists figure_spec;
-- after this, also: delete from supabase_migrations.schema_migrations where version = '20261031050000';

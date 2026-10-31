-- Undo 20261031040000_question_calibration_fields.sql. Drops only the columns and indexes it added.
drop index if exists public.quiz_questions_skill_id_idx;
drop index if exists public.quiz_questions_pool_idx;
alter table public.quiz_questions
  drop column if exists calib_updated_at,
  drop column if exists calib_model,
  drop column if exists calib_answer_count,
  drop column if exists calib_guessing,
  drop column if exists calib_discrimination,
  drop column if exists calib_difficulty,
  drop column if exists pool,
  drop column if exists variant_group_id,
  drop column if exists skill_id,
  drop column if exists source_position,
  drop column if exists source_route,
  drop column if exists source_difficulty_label,
  drop column if exists difficulty_editorial,
  drop column if exists difficulty_rubric_version,
  drop column if exists difficulty_source;
-- after this, also: delete from supabase_migrations.schema_migrations where version = '20261031040000';

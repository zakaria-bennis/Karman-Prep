-- Per-question fields for difficulty calibration, adaptive tests and the test pool
-- (docs/research/2026-10-bluebook-difficulty-and-adaptivity.md, Part 6.1).
-- Additive only: every column is nullable or has a default, nothing existing changes.
-- Rollback: supabase/rollbacks/20261031040000_question_calibration_fields.down.sql

alter table public.quiz_questions
  add column if not exists difficulty_source text
    check (difficulty_source in ('editorial_rubric', 'position_reanchor', 'source_label', 'student_data')),
  add column if not exists difficulty_rubric_version text,
  add column if not exists difficulty_editorial smallint
    check (difficulty_editorial between 1 and 7),
  add column if not exists source_difficulty_label text,
  add column if not exists source_route text
    check (source_route in ('harder', 'easier')),
  add column if not exists source_position real
    check (source_position between 0 and 1),
  add column if not exists skill_id text,
  add column if not exists variant_group_id text,
  add column if not exists pool text not null default 'practice'
    check (pool in ('practice', 'test', 'tryout')),
  add column if not exists calib_difficulty real,
  add column if not exists calib_discrimination real,
  add column if not exists calib_guessing real,
  add column if not exists calib_answer_count integer not null default 0
    check (calib_answer_count >= 0),
  add column if not exists calib_model text,
  add column if not exists calib_updated_at timestamptz;

comment on column public.quiz_questions.difficulty_source is 'Where difficulty_level came from: editorial_rubric, position_reanchor, source_label or student_data.';
comment on column public.quiz_questions.difficulty_editorial is 'The original editorial 1-7 rating, kept as the calibration prior when difficulty_level is re-anchored.';
comment on column public.quiz_questions.source_route is 'For a module-2 source question: whether it came from the harder or the easier route (null for module 1 or unknown).';
comment on column public.quiz_questions.source_position is 'Position in the source module, 0 = first question, 1 = last.';
comment on column public.quiz_questions.skill_id is 'The 39-skill catalog id (copy of the approved catalog_skill_id, for querying and blueprints).';
comment on column public.quiz_questions.pool is 'practice: shown in drills and endless mode. test: reserved for full-length tests, never shown in practice. tryout: unscored test slot.';
comment on column public.quiz_questions.calib_difficulty is 'Fitted difficulty from student data (null until calibrated); calib_model names the model and version.';

create index if not exists quiz_questions_pool_idx on public.quiz_questions (pool);
create index if not exists quiz_questions_skill_id_idx on public.quiz_questions (skill_id);

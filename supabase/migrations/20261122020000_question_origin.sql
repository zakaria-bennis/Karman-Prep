-- Original or generated (overnight build 2026-11-22, shared contract 2 in
-- docs/overnight/2026-11-22-portal-complete.md).
--
-- origin: 'original' for every question that came from a real source (all rows today, by the
-- default), 'generated' for a question made by the question generator (src/lib/generator/ for
-- Math, scripts/generator/ for Reading and Writing).
-- generator: null for originals; for a generated question, how it was made:
--   { kind: "math-template" | "rw-helper", template, seed, batch, checks, ... }.
--
-- Generated questions are used in practice only, never in an exam: the last check refuses a
-- generated row in any pool but 'practice'. Students never see origin; an admin sees a small
-- "Generated" mark after a server-side admin check.
--
-- Additive only: one defaulted column and one nullable column, nothing existing changes.
-- Rollback: supabase/rollbacks/20261122020000_question_origin.down.sql

alter table public.quiz_questions
  add column if not exists origin text not null default 'original',
  add column if not exists generator jsonb;

alter table public.quiz_questions
  drop constraint if exists quiz_questions_origin_check;
alter table public.quiz_questions
  add constraint quiz_questions_origin_check check (origin in ('original', 'generated'));

alter table public.quiz_questions
  drop constraint if exists quiz_questions_generated_practice_only;
alter table public.quiz_questions
  add constraint quiz_questions_generated_practice_only
    check (origin = 'original' or pool = 'practice');

create index if not exists quiz_questions_origin_idx on public.quiz_questions (origin);

comment on column public.quiz_questions.origin is 'original: from a real source. generated: made by the question generator. Admin only; never sent to students.';
comment on column public.quiz_questions.generator is 'Null for originals. For generated questions: kind (math-template or rw-helper), template, seed, batch and checks.';

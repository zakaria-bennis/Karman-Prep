-- Generated questions on demand, and the admin tools for them (founder, 2026-11-22 round 2:
-- docs/overnight/2026-11-22-round2-spec.md).
--
-- Math is no longer stored in big batches. A generated Math question is written to the bank only when
-- it is served to a student (src/lib/generator/serve.ts), so it can sit in the Mistake Log and be
-- redone like any bank question. Its generator record (template and seed) rebuilds the same question.
--
-- 1. One stored row per generated question: a unique index on generator->>'stable_id'
--    ("gen:<template>:<seed>" for Math, "rw:<batch>:<id>" for Reading and Writing).
-- 2. admin_switches: sitewide switches an admin flips. 'hide_generated' takes every generated
--    question out of every student pool at once (src/lib/generator/switch.ts).
-- 3. generated_question_reports: an admin's report of a bad generated question. Reporting also hides
--    the question (import_status needs_review), so it leaves every pool.
--
-- Additive only. Written by the server with the service role; no student can read these tables.
-- Rollback: supabase/rollbacks/20261122060000_generated_on_demand.down.sql

create unique index if not exists quiz_questions_generated_stable_idx
  on public.quiz_questions ((generator ->> 'stable_id'))
  where origin = 'generated';

create table if not exists public.admin_switches (
  key text primary key check (key in ('hide_generated')),
  on_value boolean not null default false,
  updated_by text,
  updated_at timestamptz not null default now()
);

alter table public.admin_switches enable row level security;
revoke all on public.admin_switches from anon, authenticated;

create table if not exists public.generated_question_reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  reported_by text not null,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists generated_question_reports_question_idx
  on public.generated_question_reports (question_id);

alter table public.generated_question_reports enable row level security;
revoke all on public.generated_question_reports from anon, authenticated;

comment on table public.admin_switches is 'Sitewide admin switches. hide_generated: no generated question reaches a student while on.';
comment on table public.generated_question_reports is 'Admin reports of bad generated questions; a reported question is hidden at once.';

-- 4. Live practice questions behind each of the 72 by origin, for the admin's counts in the Library.
create or replace view public.skill72_origin_counts
  with (security_invoker = true) as
  select s.skill_id::text as skill_id, q.origin, count(*)::integer as questions
  from public.question_skills72 s
  join public.quiz_questions q on q.id = s.question_id
  where q.is_live and q.pool = 'practice'
  group by s.skill_id, q.origin;

revoke all on public.skill72_origin_counts from anon, authenticated;

-- Full-length exams (overnight build 2026-11-22, Exams stream; plan: docs/overnight/2026-11-22-portal-complete.md).
--
-- Twenty adaptive exams built from real bank questions held back from all practice. Each exam has, per
-- section, a Module 1 and an easier and a harder Module 2; every module holds 2 unscored trial questions.
-- A held question is marked in quiz_questions.pool ('test' for scored, 'tryout' for trial), and every
-- practice pool reads only pool = 'practice' (src/lib/assembler/pools.ts). The Practice plan's fixed set of
-- 5,000 questions (levels 1 to 6, never an exam question) is marked in quiz_questions.practice_plan.
--
-- Additive only: four new tables, one defaulted column, one function. Nothing existing changes.
-- Service role only, like quiz_runs: students reach these tables through server actions that check
-- ownership. Rollback: supabase/rollbacks/20261122030000_exams.down.sql

-- One row per exam.
create table if not exists public.exam_forms (
  form smallint primary key check (form between 1 and 99),
  level text not null check (level in ('standard', 'hard')),
  seed text not null,
  -- How closely the form matches the measured blueprint, written by scripts/exams/build-forms.ts.
  report jsonb not null default '{}'::jsonb check (jsonb_typeof(report) = 'object'),
  built_at timestamptz not null default now()
);

-- Every question of every form, in order. A question sits in at most one form.
create table if not exists public.exam_form_items (
  form smallint not null references public.exam_forms (form) on delete cascade,
  section text not null check (section in ('reading', 'math')),
  module text not null check (module in ('module1', 'easier', 'harder')),
  position smallint not null check (position between 0 and 39),
  question_id uuid not null references public.quiz_questions (id),
  trial boolean not null default false,
  primary key (form, section, module, position),
  unique (question_id)
);

-- One sitting of one exam by one student. `plan` is the module plan as served (the modules, their start and
-- submit times and deadlines, the route taken, the break). Questions are read by id from the bank when a
-- module opens (lean: the database has a 500 MB cap), and answer keys never leave the server.
create table if not exists public.exam_sittings (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,                           -- Clerk id, like quiz_runs
  form smallint not null references public.exam_forms (form),
  time_zone text not null,
  opened_by text not null check (opened_by in ('window', 'pass', 'test-switch')),
  started_at timestamptz not null default now(),
  plan jsonb not null check (jsonb_typeof(plan) = 'object'),
  completed_at timestamptz,
  result jsonb check (result is null or jsonb_typeof(result) = 'object'),
  coins integer not null default 0 check (coins >= 0),
  unique (student_id, form)
);
create index if not exists exam_sittings_student_idx on public.exam_sittings (student_id, started_at desc);
create index if not exists exam_sittings_open_idx on public.exam_sittings (student_id) where completed_at is null;

-- Every answer with its time: saved as the student works, graded when the module is submitted.
create table if not exists public.exam_responses (
  sitting_id uuid not null references public.exam_sittings (id) on delete cascade,
  module text not null check (module in ('rw1', 'rw2', 'm1', 'm2')),
  position smallint not null check (position between 0 and 39),
  question_id uuid not null references public.quiz_questions (id),
  answer text check (answer is null or char_length(answer) <= 40),
  is_correct boolean,                                  -- null until the module is submitted
  trial boolean not null default false,
  seconds integer not null default 0 check (seconds between 0 and 86400),
  changes smallint not null default 0 check (changes between 0 and 999),
  flagged boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (sitting_id, question_id)
);
create index if not exists exam_responses_question_idx on public.exam_responses (question_id);

alter table public.exam_forms enable row level security;
alter table public.exam_form_items enable row level security;
alter table public.exam_sittings enable row level security;
alter table public.exam_responses enable row level security;
revoke all on public.exam_forms, public.exam_form_items, public.exam_sittings, public.exam_responses
  from public, anon, authenticated;
grant select, insert, update, delete on public.exam_forms, public.exam_form_items, public.exam_sittings,
  public.exam_responses to service_role;

-- The Practice plan's fixed set of 5,000 questions (founder, 2026-11-13: levels 1 to 6, never an exam
-- question; Pro gets everything else). Marked by scripts/exams/mark-practice-plan.ts.
alter table public.quiz_questions
  add column if not exists practice_plan boolean not null default false;
create index if not exists quiz_questions_practice_plan_idx
  on public.quiz_questions (practice_plan) where practice_plan;
comment on column public.quiz_questions.practice_plan is
  'In the Practice plan''s fixed set of 5,000 (levels 1 to 6, never an exam question). The plan gate reads it.';

-- Starts a sitting with an Exam pass outside the Saturday window, in one transaction: the pass is used
-- only if the sitting is saved. Returns the new sitting id; raises 'no exam pass' when none is held.
create or replace function public.exam_start_with_pass(
  p_student text,
  p_form smallint,
  p_time_zone text,
  p_plan jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  sitting uuid;
begin
  update public.portal_rewards
     set passes = jsonb_set(passes, '{Exam pass}',
           to_jsonb(coalesce((passes ->> 'Exam pass')::int, 0) - 1)),
         updated_at = now()
   where student_id = p_student
     and coalesce((passes ->> 'Exam pass')::int, 0) > 0;
  if not found then
    raise exception 'no exam pass';
  end if;
  insert into public.exam_sittings (student_id, form, time_zone, opened_by, plan)
  values (p_student, p_form, p_time_zone, 'pass', p_plan)
  returning id into sitting;
  return sitting;
end;
$$;

revoke all on function public.exam_start_with_pass(text, smallint, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.exam_start_with_pass(text, smallint, text, jsonb) to service_role;

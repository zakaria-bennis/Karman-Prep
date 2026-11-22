-- Curated review homework (founder, round 2, 2026-11-22): each week Karman builds a review set from
-- the skills a Cohort or Private student has due for review (student_skill72_reviews), their tutor
-- sends it with one tap, and it shows on the student's Homework, due before Saturday's exam. It
-- holds 8 to 20 questions, growing with what is due (src/lib/portal/review-set-rules.ts). The
-- questions are picked when the student starts it, fresh ones of each skill.
--   student_id  the student's Clerk id, like the other quiz tables.
--   week_of     the Saturday exam it is due before (one set a student a week).
--   skill_ids   the 72-skills it reviews, the most overdue first.
--   status      'draft' (built, waiting for the tutor) or 'sent'. Done is read from the quiz run
--               (scope 'review-set:<id>'), so nothing here is written twice.
--   sent_by     the tutor (or admin) who sent it.
-- Additive only: a new table, a few small rows a student a month (500 MB cap). Read and written by
-- the server (service role) only: row level security is on with no policies.

create table if not exists public.review_sets (
  id uuid primary key default gen_random_uuid(),
  student_id text not null check (char_length(student_id) between 3 and 80),
  week_of date not null,
  skill_ids text[] not null check (cardinality(skill_ids) between 1 and 10),
  size smallint not null check (size between 8 and 20),
  status text not null default 'draft' check (status in ('draft', 'sent')),
  sent_by uuid references public.users (id) on delete set null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, week_of),
  constraint review_sets_sent_has_time check (status = 'draft' or sent_at is not null)
);

alter table public.review_sets enable row level security;
revoke all on public.review_sets from anon, authenticated;

comment on table public.review_sets is
  'Weekly curated review sets: built from due skills, sent by the tutor. Server only.';

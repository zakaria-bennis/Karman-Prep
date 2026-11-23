-- Spaced reviews inside the Daily 10, and Streak savers used by hand (founder, round 2,
-- 2026-11-22). Additive.
--
-- student_skill72_reviews: when each of the 72 skills is next due for a review. Gaps grow after a
-- right answer (1, 3, 7, 14, 30 days); a miss brings it back tomorrow (src/lib/play/reviews.ts).
-- The Daily 10 gives up to five of its ten to skills that are due.
--
-- student_streak_saves: days a student kept their streak with a Streak saver (asked the morning
-- after a missed day). A saved day counts as practiced for the streak and the coin multiplier.

create table if not exists public.student_skill72_reviews (
  student_id text not null,                          -- Clerk id, like the other quiz tables
  skill_id text not null,                            -- one of the 72 (src/lib/skills/ids72.ts)
  step smallint not null default 0 check (step between 0 and 10),
  due_on date not null,
  updated_at timestamptz not null default now(),
  primary key (student_id, skill_id)
);

create index if not exists student_skill72_reviews_due
  on public.student_skill72_reviews (student_id, due_on);

alter table public.student_skill72_reviews enable row level security;

drop policy if exists "skill72_reviews_own" on public.student_skill72_reviews;
create policy "skill72_reviews_own"
  on public.student_skill72_reviews for select
  using (student_id = (auth.jwt() ->> 'sub'));

create table if not exists public.student_streak_saves (
  student_id text not null,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (student_id, day)
);

alter table public.student_streak_saves enable row level security;

drop policy if exists "streak_saves_own" on public.student_streak_saves;
create policy "streak_saves_own"
  on public.student_streak_saves for select
  using (student_id = (auth.jwt() ->> 'sub'));

revoke all on public.student_skill72_reviews from anon, authenticated;
grant select on public.student_skill72_reviews to authenticated;
revoke all on public.student_streak_saves from anon, authenticated;
grant select on public.student_streak_saves to authenticated;

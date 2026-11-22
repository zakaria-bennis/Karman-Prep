-- Quiz modes (overnight build 2026-11-22, Quiz modes stream): the 72 skills' levels and the coin ledger.
--
-- student_skill72_levels: each student's level on each of the 72 skills (src/lib/skills/ids72.ts), in
-- the portal's four: 0 Not started, 1 Learning, 2 Understanding, 3 Proficient. Moved by the founder's
-- rule (src/lib/play/mastery.ts): a skill set finished in full moves a skill up one level after a run
-- of right answers in a row (3 to Learning, 4 to Understanding, 5 to Proficient); the Daily 10 moves
-- skills up and down. Until a skill has a row here, the portal reads its level from the old sub-skill
-- levels (src/lib/portal/skill-bridge.ts).
--
-- student_coin_awards: the coins each finished activity earned (src/lib/coins/earn.ts: right answers,
-- finishing, level-ups, streaks, the challenge multiplier), one row an activity. A balance is these
-- plus the older per-answer awards (student_point_awards) less what was spent (portal_rewards.spent).
-- award_key is unique, so a retried finish can never pay twice.
--
-- Additive and idempotent. Written only by the server with the service role; a student may read
-- their own rows.

create table if not exists public.student_skill72_levels (
  student_id text not null,
  skill_id text not null check (char_length(skill_id) between 3 and 80),
  level smallint not null default 0 check (level between 0 and 3),
  -- skill sets finished on this skill
  sets integer not null default 0 check (sets >= 0),
  updated_at timestamptz not null default now(),
  primary key (student_id, skill_id)
);

alter table public.student_skill72_levels enable row level security;

drop policy if exists "skill72_levels_own" on public.student_skill72_levels;
create policy "skill72_levels_own"
  on public.student_skill72_levels for select
  using (student_id = auth.jwt() ->> 'sub');

revoke all on public.student_skill72_levels from anon, authenticated;
grant select on public.student_skill72_levels to authenticated;

create table if not exists public.student_coin_awards (
  award_key text primary key check (char_length(award_key) between 3 and 200),
  student_id text not null,
  coins integer not null check (coins between 1 and 100000),
  source text not null check (
    source in ('skill-set', 'daily-ten', 'endless', 'time-trial', 'challenge', 'strategy', 'review')
  ),
  -- how the coins were earned: the lines shown on the ending, and the multiplier
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists student_coin_awards_student_idx
  on public.student_coin_awards (student_id, created_at desc);

alter table public.student_coin_awards enable row level security;

drop policy if exists "coin_awards_own" on public.student_coin_awards;
create policy "coin_awards_own"
  on public.student_coin_awards for select
  using (student_id = auth.jwt() ->> 'sub');

revoke all on public.student_coin_awards from anon, authenticated;
grant select on public.student_coin_awards to authenticated;

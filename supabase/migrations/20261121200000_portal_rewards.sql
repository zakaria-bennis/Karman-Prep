-- The rebuilt student portal's Rewards (founder, 2026-11-16 and 2026-11-18): what a student has
-- spent their coins on, the things to wear won from boxes, the passes they hold, and what their
-- character has on. Coins are earned only by practice (student_point_awards); a balance is the
-- coins earned less `spent`. One row a student. Written only by the portal's server actions with
-- the service role, which check every price and balance.

create table if not exists public.portal_rewards (
  student_id text primary key,                       -- Clerk id, like the other quiz tables
  spent integer not null default 0 check (spent >= 0),
  owned text[] not null default '{}' check (cardinality(owned) <= 100),
  passes jsonb not null default '{}'::jsonb check (jsonb_typeof(passes) = 'object'),
  face text not null default 'fox',
  outfit jsonb not null default '{}'::jsonb check (jsonb_typeof(outfit) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.portal_rewards enable row level security;

drop policy if exists "portal_rewards_own" on public.portal_rewards;
create policy "portal_rewards_own"
  on public.portal_rewards for select
  using (student_id = auth.jwt() ->> 'sub');

revoke all on public.portal_rewards from anon, authenticated;
grant select on public.portal_rewards to authenticated;

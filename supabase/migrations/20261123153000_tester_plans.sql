-- The testing switch (founder, 2026-11-23: "anyone who accesses the website now is a tester, so they
-- should be able to freely go from one plan to another"). While the site password is on, a signed-in
-- student may pick any of the five plans in Settings, and `getPlan` gives them that plan instead of
-- the one they paid for. With the password off (at launch) the server ignores this table, so the
-- switch disappears without a code change. Nothing here touches Stripe.
--   user_id   the student's Clerk id, as in plan_grants
--   plan_id   the plan they picked
-- Additive only: a new table. Read and written by the server (service role); students never reach
-- it directly, so row level security is on with no policies.
create table if not exists public.tester_plans (
  user_id text primary key,
  plan_id text not null
    check (plan_id in ('free', 'practice', 'pro', 'cohort', 'private-10')),
  updated_at timestamptz not null default now()
);

alter table public.tester_plans enable row level security;

comment on table public.tester_plans is
  'The plan a tester picked with the testing switch; counts only while SITE_PASSWORD is set. Rules in src/lib/plans/tester.ts.';

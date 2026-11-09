-- Plan grants: plan access that does not come from a Stripe subscription.
-- One row per one-time purchase (cohort, private-10, private-20), school
-- seat, tutor-affiliate student code or admin grant. Recurring plans stay in
-- public.subscriptions. src/lib/plans/ turns both tables into a user's access:
-- the most generous active source wins.
-- Written only by the server via the service role; no public read or write access.
-- Rollback: drop table if exists public.plan_grants;

create table if not exists public.plan_grants (
  id uuid primary key default gen_random_uuid(),
  user_id text not null, -- Clerk user id of the student who gets the access
  plan_id text not null
    check (plan_id in ('practice', 'pro', 'cohort', 'private-10', 'private-20')),
  source text not null
    check (source in ('purchase', 'school', 'tutor-affiliate', 'admin')),
  source_ref text,
  sponsor_user_id text,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  -- A tutor-affiliate grant only counts while its tutor's subscription is active,
  -- so it must name the tutor.
  constraint plan_grants_affiliate_sponsor_check
    check (source <> 'tutor-affiliate' or sponsor_user_id is not null)
);

comment on table public.plan_grants is
  'Plan access outside Stripe subscriptions: one-time purchases, school seats, tutor-affiliate codes, admin grants. Rules in src/lib/plans/.';
comment on column public.plan_grants.source_ref is
  'What created the grant: Stripe checkout session id (purchase), school license id (school), affiliate redemption id (tutor-affiliate).';
comment on column public.plan_grants.sponsor_user_id is
  'Clerk id of the tutor whose tutor-affiliate subscription pays for this grant. The grant counts only while that subscription is active.';
comment on column public.plan_grants.expires_at is
  'Null means open-ended. One-time purchases expire 12 months after purchase.';
comment on column public.plan_grants.revoked_at is
  'Set when a grant is withdrawn (refund, student removed). Revoked rows are kept for history.';

alter table public.plan_grants enable row level security;
-- No policies on purpose: only the service role (which bypasses RLS)
-- reads or writes this table.
revoke all on table public.plan_grants from public, anon, authenticated;

create index if not exists plan_grants_user_idx
  on public.plan_grants (user_id) where revoked_at is null;

create index if not exists plan_grants_sponsor_idx
  on public.plan_grants (sponsor_user_id) where revoked_at is null;

-- Webhook retries and repeated portal calls land on the same row instead of
-- adding a second grant.
create unique index if not exists plan_grants_source_ref_user_key
  on public.plan_grants (source, source_ref, user_id);

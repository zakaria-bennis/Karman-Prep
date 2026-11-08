-- Subscriptions move to the plan ladder (founder, 2026-11-08). A row is one
-- renewing Stripe plan: practice, pro or tutor-affiliate, billed every month
-- or every 3 months. One-time purchases (cohort, private-10, private-20) live
-- in public.plan_grants. plan_id replaces the old tier column (group,
-- small_group, private, elite) for billing; tier stays, nullable, for the
-- scheduling code that still reads it.
-- There are no paying users, but any old row is mapped rather than dropped:
-- group and small_group become practice, private and elite become pro, all
-- billed monthly. A row with any other tier stops the migration at the
-- not-null step instead of guessing.
-- The status check also widens to every Stripe subscription status, so a
-- webhook for an unpaid, paused or expired subscription can be saved.
-- Written only by the Stripe webhook via the service role.
--
-- Rollback:
--   update public.subscriptions set tier = case plan_id when 'pro' then 'elite' else 'group' end where tier is null;
--   alter table public.subscriptions alter column tier set not null,
--     drop column plan_id, drop column billing_term, drop column current_period_end;

alter table public.subscriptions
  add column if not exists plan_id text,
  add column if not exists billing_term text,
  add column if not exists current_period_end timestamptz;

-- Backfill from the old tier while it still exists (a re-run skips this).
do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'subscriptions'
       and column_name = 'tier'
  ) then
    execute $sql$
      update public.subscriptions
         set plan_id = case tier
                         when 'group' then 'practice'
                         when 'small_group' then 'practice'
                         when 'private' then 'pro'
                         when 'elite' then 'pro'
                       end
       where plan_id is null
    $sql$;
  end if;
end $$;

update public.subscriptions set billing_term = 'month' where billing_term is null;

alter table public.subscriptions
  alter column plan_id set not null,
  alter column billing_term set not null,
  drop constraint if exists subscriptions_plan_id_check,
  add constraint subscriptions_plan_id_check
    check (plan_id in ('practice', 'pro', 'tutor-affiliate')),
  drop constraint if exists subscriptions_billing_term_check,
  add constraint subscriptions_billing_term_check
    check (billing_term in ('month', 'quarter'));

-- The old tier column stays for now, nullable, because the booking and
-- cohort code still reads it as a delivery format (group, small_group,
-- private, elite). New rows leave it null. Dropping it is a follow-up once
-- scheduling reads plan_grants instead (see docs/overnight/reports/pricing.md).
alter table public.subscriptions
  alter column tier drop not null;

-- Replace whichever check bounds status (the original was auto-named).
do $$
declare
  con_name text;
begin
  for con_name in
    select conname
      from pg_constraint
     where conrelid = 'public.subscriptions'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.subscriptions drop constraint %I', con_name);
  end loop;
end $$;

alter table public.subscriptions
  add constraint subscriptions_status_check
    check (status in ('active', 'trialing', 'past_due', 'incomplete', 'incomplete_expired',
                      'unpaid', 'paused', 'canceled'));

comment on column public.subscriptions.plan_id is
  'The renewing plan: practice, pro or tutor-affiliate (src/lib/marketing/offer.ts PLAN_IDS).';
comment on column public.subscriptions.billing_term is
  'month = billed every month, quarter = billed every 3 months.';
comment on column public.subscriptions.current_period_end is
  'When the paid period ends: the next renewal, or the end of access after a cancellation.';

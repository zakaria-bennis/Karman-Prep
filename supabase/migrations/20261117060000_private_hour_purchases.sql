-- Extra tutoring hours bought from the Schedule tab (founder, 2026-11-17). Additive only.
--
-- One row for each paid purchase, written by the Stripe webhook when the payment clears. The
-- Schedule's hours will be counted from the package plus these rows once bookings are real.
-- Server only (service role).

create table if not exists public.private_hour_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  hours integer not null check (hours between 1 and 40),
  amount_cents integer not null check (amount_cents >= 0),
  -- one row a payment, however many times Stripe sends the event
  stripe_checkout_session_id text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists private_hour_purchases_user_idx
  on public.private_hour_purchases (user_id, created_at desc);

alter table public.private_hour_purchases enable row level security;

drop policy if exists "private_hour_purchases_service_all" on public.private_hour_purchases;
create policy "private_hour_purchases_service_all"
  on public.private_hour_purchases for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Seat reservations: a family reserves and pays for a cohort seat from the marketing site, before the
-- student has an account (founder, 2026-11-13). One row per reservation. A row starts when the family's
-- contact details are in ("started"), so an unfinished reservation can be followed up; the Stripe webhook
-- marks it "paid"; the student's account is linked when they create it with the claim link; the founder
-- then places the student in a class by score ("placed"). Written only by the service role.

create table if not exists public.seat_reservations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- who filled the form in
  filled_by text not null check (filled_by in ('parent', 'student')),
  parent_name text not null,
  parent_email text not null,
  parent_phone text not null,
  student_first_name text not null,
  -- the latest official SAT score; null means no SAT yet, so a placement test sets the start
  start_score smallint check (start_score is null or (start_score between 400 and 1600 and start_score % 10 = 0)),
  -- offer.ts program id, e.g. "cohort-march-2027"
  program_id text,
  payment_option text check (payment_option in ('full', 'installments')),
  status text not null default 'started' check (status in ('started', 'paid', 'placed', 'cancelled')),
  -- the link the family opens after paying, to create the student's account
  claim_token uuid not null default gen_random_uuid() unique,
  stripe_customer_id text,
  stripe_checkout_session_id text unique,
  paid_at timestamptz,
  -- the student's Clerk id, once the account is created and linked
  clerk_user_id text,
  claimed_at timestamptz
);

alter table public.seat_reservations enable row level security;
-- No policies on purpose: only the service role (which bypasses RLS) reads or writes this table.

create index if not exists seat_reservations_status_created_idx
  on public.seat_reservations (status, created_at desc);
create index if not exists seat_reservations_parent_email_idx
  on public.seat_reservations (parent_email);

-- Moves and cancels of Private sessions, and the late pass they spend (founder, 2026-11-16 and
-- 2026-11-17: three moves a month across all of a student's sessions; with less than 24 hours'
-- notice a move or cancel spends the package's one free late pass, which the tutor can give back).
-- The booking endpoints (src/app/api/bookings/*) write one row for each change they make; the rules
-- (src/lib/bookings/rules.ts) and the Schedule tab read them back.
--   kind            'move' or 'cancel'.
--   late            made with less than 24 hours' notice.
--   used_late_pass  this change spent the package's free late pass.
--   by_tutor        the tutor made it: it never counts against the student.
--   from_start      the session's start before the change; to_start its new start (moves only).
--   by_user_id      who made it (the student or the tutor; later a parent).
--   pass_back_at    when the tutor gave the late pass back. Setting this one column on the row that
--                   spent the pass gives the student the pass again.
-- Additive only: a new table. Kept lean for the database's 500 MB cap (a few small rows a student a
-- month). Read and written by the server (service role) only, so row level security is on with no
-- policies.

create table if not exists public.booking_changes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  kind text not null check (kind in ('move', 'cancel')),
  late boolean not null default false,
  used_late_pass boolean not null default false,
  by_tutor boolean not null default false,
  from_start timestamptz,
  to_start timestamptz,
  by_user_id uuid references public.users (id) on delete set null,
  pass_back_at timestamptz,
  created_at timestamptz not null default now(),
  constraint booking_changes_pass_is_late check (not used_late_pass or late),
  constraint booking_changes_tutor_spends_no_pass check (not (by_tutor and used_late_pass)),
  constraint booking_changes_pass_back_needs_pass check (pass_back_at is null or used_late_pass)
);

create index if not exists booking_changes_student_idx
  on public.booking_changes (student_id, created_at);

alter table public.booking_changes enable row level security;
revoke all on public.booking_changes from anon, authenticated;

comment on table public.booking_changes is
  'Moves and cancels of Private sessions, and the late pass they spend. Server only.';

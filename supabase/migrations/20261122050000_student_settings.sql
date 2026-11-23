-- The student's own settings, kept with their account instead of one browser (founder, 2026-11-18:
-- "they move to the student's account when the portal reads real data"). One row per student.
--   prefs        the choices in Settings (sound, music, text size, the glass, calculator unit, the
--                timer, reminders...), as the portal's own keys. Unknown keys are ignored when read.
--   welcomed_at  when the student first saw the portal's welcome, so it shows once per account,
--                not once per browser.
-- Additive only: a new table. Read and written by the server (service role); students never reach
-- it directly, so row level security is on with no policies.
create table if not exists public.student_settings (
  user_id uuid primary key references public.users (id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  welcomed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.student_settings enable row level security;

comment on table public.student_settings is
  'Student portal settings (prefs) and first-welcome time, one row per student. Server only.';

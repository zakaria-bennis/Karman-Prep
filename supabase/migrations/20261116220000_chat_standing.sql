-- A student's standing in chat (founder, 2026-11-16). The moderation check counts academic dishonesty
-- (passing answers about in place of working a question out): the first time the student is warned,
-- the second time their chats are paused until a tutor or the founder has looked and lifted the
-- pause. Sexual content caught by the check pauses at once, with no warning. A paused student can
-- read but cannot send anything, in the class chat or in a private one.
-- One row per student who has ever been counted. Written only by the service role.

create table if not exists public.chat_standing (
  user_id uuid primary key references public.users(id) on delete cascade,
  -- how many times the check has caught answer-sharing since the last review
  integrity_strikes integer not null default 0 check (integrity_strikes >= 0),
  -- set while the student's chats are paused
  paused_at timestamptz,
  paused_reason text check (paused_reason is null or paused_reason in ('integrity', 'content')),
  -- who lifted the last pause, and when
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists chat_standing_paused_idx
  on public.chat_standing (paused_at desc)
  where paused_at is not null;

alter table public.chat_standing enable row level security;

drop policy if exists "chat_standing_service_all" on public.chat_standing;
create policy "chat_standing_service_all"
  on public.chat_standing for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

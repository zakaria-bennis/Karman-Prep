-- Calendar feed links: one secret link per student or parent, used by
-- GET /api/calendar/feed/<token> so Apple Calendar, Google Calendar and
-- Outlook can subscribe to a person's Karman calendar without signing in.
--
-- The token is the only credential, so it is long (32 random bytes,
-- base64url) and the table is service-role only. Resetting the link
-- replaces the token, which stops every old subscription.

create table if not exists public.calendar_feed_tokens (
  user_id    uuid        primary key references public.users(id) on delete cascade,
  token      text        not null unique check (token ~ '^[A-Za-z0-9_-]{43}$'),
  created_at timestamptz not null default now()
);

alter table public.calendar_feed_tokens enable row level security;
-- No policies on purpose: only the service role (which bypasses RLS)
-- reads or writes this table.
revoke all on public.calendar_feed_tokens from anon, authenticated;

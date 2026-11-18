-- Chat: what the new Chat page needs kept (founder, 2026-11-16). Additive only.
--
-- 1. chat_reactions: one reaction a person on one message, in the class chat or a private chat.
-- 2. A question attached to a message, kept as it looked when it was sent.
-- 3. Announcements: a kind of message in the class's own channel that only the tutor posts.
-- 4. Private chats: a reply to one message, a message written by the after-hours assistant, and
--    chats between a privately tutored student and their tutor (no class, so no cohort).
-- 5. chat_channel_reads: when a person last read the class chat and its announcements.
-- 6. chat_presence: when a person was last here, and where they are typing.
--
-- Server only (service role). Every read and write goes through the chat routes.

create table if not exists public.chat_reactions (
  message_kind text not null check (message_kind in ('channel', 'dm')),
  message_id uuid not null,
  user_id uuid not null references public.users(id) on delete cascade,
  reaction text not null check (reaction in (
    'up', 'down', 'wow', 'what', 'ha', 'check', 'cross', 'fire', 'hundred', 'eyes',
    'bot', 'party', 'star', 'bulb', 'rocket', 'target', 'brain', 'sweat', 'fear', 'cool'
  )),
  created_at timestamptz not null default now(),
  primary key (message_kind, message_id, user_id)
);
alter table public.chat_reactions enable row level security;
drop policy if exists "chat_reactions_service_all" on public.chat_reactions;
create policy "chat_reactions_service_all"
  on public.chat_reactions for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

alter table public.chat_messages add column if not exists question jsonb;
alter table public.chat_messages drop constraint if exists chat_messages_message_type_check;
alter table public.chat_messages add constraint chat_messages_message_type_check
  check (message_type in ('cohort_message', 'qa_question', 'qa_answer', 'announcement'));

alter table public.direct_messages add column if not exists question jsonb;
alter table public.direct_messages add column if not exists parent_message_id uuid
  references public.direct_messages(id) on delete set null;
alter table public.direct_messages add column if not exists from_assistant boolean not null default false;
alter table public.direct_messages alter column cohort_id drop not null;

create table if not exists public.chat_channel_reads (
  user_id uuid not null references public.users(id) on delete cascade,
  channel_id uuid not null references public.chat_channels(id) on delete cascade,
  scope text not null check (scope in ('chat', 'announcements')),
  read_at timestamptz not null default now(),
  primary key (user_id, channel_id, scope)
);
alter table public.chat_channel_reads enable row level security;
drop policy if exists "chat_channel_reads_service_all" on public.chat_channel_reads;
create policy "chat_channel_reads_service_all"
  on public.chat_channel_reads for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.chat_presence (
  user_id uuid primary key references public.users(id) on delete cascade,
  seen_at timestamptz not null default now(),
  -- 'channel:<channel id>' or 'dm:<the other person's user id>' while typing there
  typing_in text,
  typing_at timestamptz
);
create index if not exists chat_presence_typing_idx
  on public.chat_presence (typing_in)
  where typing_in is not null;
alter table public.chat_presence enable row level security;
drop policy if exists "chat_presence_service_all" on public.chat_presence;
create policy "chat_presence_service_all"
  on public.chat_presence for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- The team's message assistant (founder, 2026-11-12). Additive only.
--
-- The assistant reads each family's conversation in family_messages and helps the team answer.
-- It never writes to a family: it sorts each conversation (needs you / handled / FYI), sums it
-- up, and drafts a reply that a person edits and sends. Only a staff member's Send posts a
-- message. It runs only with MESSAGE_ASSISTANT=on and an ANTHROPIC_API_KEY on the server.
--
-- 1. family_message_triage: the assistant's latest read of one family's conversation.
-- 2. family_message_drafts: every draft it wrote, who asked for it, and who sent what. Kept as
--    the record of what the assistant suggested and what a person actually sent.
--
-- Server only (service role). Parents and students never see either table.

CREATE TABLE IF NOT EXISTS public.family_message_triage (
  parent_user_id    uuid        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  student_user_id   uuid        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  state             text        NOT NULL CHECK (state IN ('needs_you', 'handled', 'fyi')),
  summary           text        NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 1000),
  -- What the family is asking for, in a line; empty when nothing is asked.
  asking            text        NOT NULL DEFAULT '' CHECK (char_length(asking) <= 500),
  -- The newest message the assistant had read, so it only reads a conversation again when
  -- something new arrives.
  last_message_id   uuid        REFERENCES public.family_messages (id) ON DELETE SET NULL,
  model             text        NOT NULL,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_user_id, student_user_id)
);
ALTER TABLE public.family_message_triage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "family_message_triage_service" ON public.family_message_triage;
CREATE POLICY "family_message_triage_service"
  ON public.family_message_triage FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.family_message_drafts (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id       uuid        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  student_user_id      uuid        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  -- 'reply' answers the conversation; 'reschedule' offers new times for a missed or moved session.
  kind                 text        NOT NULL DEFAULT 'reply' CHECK (kind IN ('reply', 'reschedule')),
  -- What the staff member told the assistant to say, when they asked for a redraft.
  instruction          text        CHECK (instruction IS NULL OR char_length(instruction) <= 2000),
  draft                text        NOT NULL CHECK (char_length(draft) BETWEEN 1 AND 4000),
  model                text        NOT NULL,
  requested_by_user_id uuid        REFERENCES public.users (id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  status               text        NOT NULL DEFAULT 'drafted' CHECK (status IN ('drafted', 'sent', 'discarded')),
  -- Filled when a person sends: their final words (edited or not) and the message it became.
  sent_body            text        CHECK (sent_body IS NULL OR char_length(sent_body) BETWEEN 1 AND 4000),
  sent_message_id      uuid        REFERENCES public.family_messages (id) ON DELETE SET NULL,
  sent_by_user_id      uuid        REFERENCES public.users (id) ON DELETE SET NULL,
  sent_at              timestamptz
);
CREATE INDEX IF NOT EXISTS family_message_drafts_family_idx
  ON public.family_message_drafts (parent_user_id, student_user_id, created_at DESC);
ALTER TABLE public.family_message_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "family_message_drafts_service" ON public.family_message_drafts;
CREATE POLICY "family_message_drafts_service"
  ON public.family_message_drafts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

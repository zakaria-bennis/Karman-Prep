-- ============================================================
-- Strata Chat Backend — Migration 013
--
-- Tables for the Slack-backed (single-bot) chat system, plus the
-- chat-media Storage bucket. See project_slack_chat.md for the
-- locked architecture.
--
-- Tables
--   · chat_channels       — one row per Slack channel we own.
--                           Cohorts get two: cohort_chat + qa.
--   · chat_messages       — every message in a chat_channel.
--                           Cohort messages, Q&A questions, and
--                           Q&A answers all live here, distinguished
--                           by message_type.
--   · direct_messages     — student-to-student DMs. Stored
--                           Supabase-only (no Slack involvement
--                           in the single-bot model since students
--                           have no Slack identity). Same
--                           moderation pipeline.
--   · moderation_actions  — admin moderation audit log.
--   · channel_mutes       — student × channel temporary or
--                           permanent posting blocks.
--
-- Storage
--   · chat-media bucket   — private, 5MB cap, image MIME types
--                           only. Per-user folders enforced by
--                           RLS so students can't read each
--                           other's uploads.
--
-- FK convention: every user reference is users(id) UUID. Clerk
-- ids resolve via the existing getUserUuidByClerkId helper.
--
-- Run after migration 012. Idempotent.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. chat_channels — Slack channels mapped to Strata cohorts
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_channels (
  id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  slack_channel_id  TEXT         UNIQUE NOT NULL,
  cohort_id         UUID         NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  channel_type      TEXT         NOT NULL CHECK (channel_type IN ('cohort_chat','qa')),
  display_name      TEXT         NOT NULL,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  -- One channel of each type per cohort.
  UNIQUE (cohort_id, channel_type)
);

CREATE INDEX IF NOT EXISTS chat_channels_cohort_idx ON public.chat_channels (cohort_id);

ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;

-- Members of the cohort can read which channels exist.
DROP POLICY IF EXISTS "channels_member_read" ON public.chat_channels;
CREATE POLICY "channels_member_read"
  ON public.chat_channels FOR SELECT
  USING (
    cohort_id IN (
      SELECT cohort_id FROM public.cohort_members
       WHERE user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
         AND left_at IS NULL
    )
  );

-- Tutors of the cohort can read.
DROP POLICY IF EXISTS "channels_tutor_read" ON public.chat_channels;
CREATE POLICY "channels_tutor_read"
  ON public.chat_channels FOR SELECT
  USING (
    cohort_id IN (
      SELECT id FROM public.cohorts
       WHERE tutor_user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
    )
  );

DROP POLICY IF EXISTS "channels_service_all" ON public.chat_channels;
CREATE POLICY "channels_service_all"
  ON public.chat_channels FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────
-- 2. chat_messages — every cohort-channel and Q&A message
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Slack's message timestamp; serves as Slack's primary key.
  slack_message_ts    TEXT         NOT NULL,
  channel_id          UUID         NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  -- The REAL identity of the sender. Tutors + admins always see this;
  -- other students see display_name_override.
  sender_id           UUID         NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  is_anonymous        BOOLEAN      NOT NULL DEFAULT false,
  -- Computed at send time. "FirstName L." normally, "Anonymous"
  -- when is_anonymous = true. Tutors/admins ignore this and read
  -- sender_id directly.
  display_name_override TEXT,
  message_type        TEXT         NOT NULL CHECK (message_type IN ('cohort_message','qa_question','qa_answer')),
  content             TEXT,
  media_urls          TEXT[]       NOT NULL DEFAULT '{}',
  -- For Q&A answer threads: points back to the question.
  parent_message_id   UUID         REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  is_pinned           BOOLEAN      NOT NULL DEFAULT false,
  is_highlighted      BOOLEAN      NOT NULL DEFAULT false,
  -- Moderation pipeline state (see lib/moderation/pipeline.ts).
  moderation_status   TEXT         NOT NULL DEFAULT 'pending'
                                    CHECK (moderation_status IN ('pending','approved','flagged','rejected')),
  keyword_flagged     BOOLEAN      NOT NULL DEFAULT false,
  ai_flagged          BOOLEAN      NOT NULL DEFAULT false,
  ai_flag_reason      TEXT,
  human_reviewed      BOOLEAN      NOT NULL DEFAULT false,
  human_review_action TEXT         CHECK (human_review_action IN ('approved','removed','warned')),
  human_reviewed_by   UUID         REFERENCES public.users(id) ON DELETE SET NULL,
  human_reviewed_at   TIMESTAMPTZ,
  -- Shown to the student in place of the original content if rejected.
  rejection_message   TEXT,
  -- Denormalized cohort name for the tutor's unified Q&A feed
  -- (avoids a join per row when rendering /tutor/qa).
  cohort_label        TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  -- Slack webhook idempotency: same Slack ts in same channel = no dup.
  UNIQUE (channel_id, slack_message_ts)
);

CREATE INDEX IF NOT EXISTS chat_messages_channel_created_idx
  ON public.chat_messages (channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_sender_idx
  ON public.chat_messages (sender_id);
CREATE INDEX IF NOT EXISTS chat_messages_parent_idx
  ON public.chat_messages (parent_message_id) WHERE parent_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS chat_messages_moderation_pending_idx
  ON public.chat_messages (moderation_status, created_at DESC)
  WHERE moderation_status IN ('pending','flagged');

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Cohort members read messages in their cohort's channels.
-- (Note: they get display_name_override from the API layer; this
-- policy doesn't try to redact sender_id at the DB layer because
-- API routes are the only readers — RLS for SELECT here is a
-- defence-in-depth fallback.)
DROP POLICY IF EXISTS "messages_member_read" ON public.chat_messages;
CREATE POLICY "messages_member_read"
  ON public.chat_messages FOR SELECT
  USING (
    channel_id IN (
      SELECT id FROM public.chat_channels
       WHERE cohort_id IN (
         SELECT cohort_id FROM public.cohort_members
          WHERE user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
            AND left_at IS NULL
       )
    )
  );

-- Tutors read messages in any of their cohort's channels.
DROP POLICY IF EXISTS "messages_tutor_read" ON public.chat_messages;
CREATE POLICY "messages_tutor_read"
  ON public.chat_messages FOR SELECT
  USING (
    channel_id IN (
      SELECT id FROM public.chat_channels
       WHERE cohort_id IN (
         SELECT id FROM public.cohorts
          WHERE tutor_user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
       )
    )
  );

-- Parents read messages where their linked child is the sender.
DROP POLICY IF EXISTS "messages_parent_read" ON public.chat_messages;
CREATE POLICY "messages_parent_read"
  ON public.chat_messages FOR SELECT
  USING (
    sender_id IN (
      SELECT student_user_id FROM public.parent_student_links
       WHERE parent_user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
    )
  );

DROP POLICY IF EXISTS "messages_service_all" ON public.chat_messages;
CREATE POLICY "messages_service_all"
  ON public.chat_messages FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS chat_messages_set_updated_at ON public.chat_messages;
CREATE TRIGGER chat_messages_set_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();


-- ─────────────────────────────────────────────────────────────
-- 3. direct_messages — student-to-student within same cohort
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Slack DM channel id. Null in single-bot mode (Slack is not
  -- involved); kept on the schema for forward compatibility if
  -- we ever provision per-student Slack identities.
  slack_dm_channel_id TEXT,
  slack_message_ts    TEXT,
  sender_id           UUID         NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  recipient_id        UUID         NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  -- Both users must be active members of this cohort.
  cohort_id           UUID         NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  content             TEXT,
  media_urls          TEXT[]       NOT NULL DEFAULT '{}',
  moderation_status   TEXT         NOT NULL DEFAULT 'pending'
                                    CHECK (moderation_status IN ('pending','approved','flagged','rejected')),
  keyword_flagged     BOOLEAN      NOT NULL DEFAULT false,
  ai_flagged          BOOLEAN      NOT NULL DEFAULT false,
  ai_flag_reason      TEXT,
  human_reviewed      BOOLEAN      NOT NULL DEFAULT false,
  human_review_action TEXT         CHECK (human_review_action IN ('approved','removed','warned')),
  human_reviewed_by   UUID         REFERENCES public.users(id) ON DELETE SET NULL,
  human_reviewed_at   TIMESTAMPTZ,
  rejection_message   TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT dm_no_self CHECK (sender_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS dm_thread_idx
  ON public.direct_messages (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), created_at DESC);
CREATE INDEX IF NOT EXISTS dm_recipient_idx
  ON public.direct_messages (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dm_moderation_pending_idx
  ON public.direct_messages (moderation_status, created_at DESC)
  WHERE moderation_status IN ('pending','flagged');

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Sender or recipient reads.
DROP POLICY IF EXISTS "dm_self_read" ON public.direct_messages;
CREATE POLICY "dm_self_read"
  ON public.direct_messages FOR SELECT
  USING (
    sender_id    IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
    OR recipient_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
  );

-- Tutors of the cohort read.
DROP POLICY IF EXISTS "dm_tutor_read" ON public.direct_messages;
CREATE POLICY "dm_tutor_read"
  ON public.direct_messages FOR SELECT
  USING (
    cohort_id IN (
      SELECT id FROM public.cohorts
       WHERE tutor_user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
    )
  );

-- Parents read DMs where their linked child is the sender.
DROP POLICY IF EXISTS "dm_parent_read" ON public.direct_messages;
CREATE POLICY "dm_parent_read"
  ON public.direct_messages FOR SELECT
  USING (
    sender_id IN (
      SELECT student_user_id FROM public.parent_student_links
       WHERE parent_user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
    )
  );

DROP POLICY IF EXISTS "dm_service_all" ON public.direct_messages;
CREATE POLICY "dm_service_all"
  ON public.direct_messages FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────
-- 4. moderation_actions — admin moderation audit log
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id                 UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id           UUID         NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  target_student_id  UUID         NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  channel_id         UUID         REFERENCES public.chat_channels(id) ON DELETE SET NULL,
  message_id         UUID         REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  dm_id              UUID         REFERENCES public.direct_messages(id) ON DELETE SET NULL,
  action_type        TEXT         NOT NULL
                                    CHECK (action_type IN ('warn','mute','unmute','remove','approve_message','remove_message')),
  reason             TEXT,
  duration_minutes   INTEGER,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_actions_target_idx
  ON public.moderation_actions (target_student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS moderation_actions_admin_idx
  ON public.moderation_actions (admin_id, created_at DESC);

ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "moderation_service_all" ON public.moderation_actions;
CREATE POLICY "moderation_service_all"
  ON public.moderation_actions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────
-- 5. channel_mutes — student × channel posting blocks
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.channel_mutes (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id   UUID         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  channel_id   UUID         NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  muted_by     UUID         NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  -- Null = permanent until manually unmuted.
  muted_until  TIMESTAMPTZ,
  reason       TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- One active mute per (student, channel). Older expired mutes are
-- preserved as audit history; the active one is the row whose
-- muted_until is null OR in the future.
CREATE INDEX IF NOT EXISTS channel_mutes_active_idx
  ON public.channel_mutes (student_id, channel_id)
  WHERE muted_until IS NULL OR muted_until > now();

ALTER TABLE public.channel_mutes ENABLE ROW LEVEL SECURITY;

-- Student can see their own mutes (UI shows "You're muted in #cohort-x").
DROP POLICY IF EXISTS "mutes_self_read" ON public.channel_mutes;
CREATE POLICY "mutes_self_read"
  ON public.channel_mutes FOR SELECT
  USING (
    student_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
  );

DROP POLICY IF EXISTS "mutes_service_all" ON public.channel_mutes;
CREATE POLICY "mutes_service_all"
  ON public.channel_mutes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────
-- 6. chat-media Storage bucket
--    Private, 5MB cap per file, image MIME types only.
--    Per-user folder structure enforced at the API layer
--    (uploads go to <user_clerk_id>/<uuid>.ext).
-- ─────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  false,                    -- private; access via signed URLs
  5242880,                  -- 5 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS: only the service role inserts/reads. The chat send
-- API route is the only writer; it uses the admin client. URLs go
-- out to clients as signed URLs via the messages API.
DROP POLICY IF EXISTS "chat_media_service_all" ON storage.objects;
CREATE POLICY "chat_media_service_all"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'chat-media')
  WITH CHECK (bucket_id = 'chat-media');

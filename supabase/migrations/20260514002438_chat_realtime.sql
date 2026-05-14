-- ============================================================
-- 015_chat_realtime.sql
--
-- Adds chat_messages and direct_messages to the
-- supabase_realtime publication so the browser client receives
-- INSERT / UPDATE events. Without this the CohortChat /
-- DirectMessage components silently miss new rows.
--
-- Idempotent: ALTER PUBLICATION ... ADD TABLE errors if the
-- table is already a member, so we wrap in DO blocks that
-- swallow the duplicate_object exception.
-- ============================================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

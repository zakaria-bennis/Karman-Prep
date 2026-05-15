-- ============================================================
-- Idempotent chat sends — audit issue #5.
--
-- Before: chat/send + chat/dm route posted to Slack first, then
-- inserted the DB row. If the Slack POST succeeded but the response
-- timed out, the route returned 502 — the user clicked "Send"
-- again and we posted a duplicate to Slack.
--
-- The fix has two layers:
--   1. We pass a Slack `client_msg_id` (deterministic hash of
--      sender + content + channel + 1-minute bucket) so Slack
--      dedupes natively if we hit chat.postMessage twice for the
--      same logical send.
--   2. We persist that client_msg_id on our chat_messages /
--      direct_messages row with a partial unique index, so OUR
--      insert path is also idempotent (the second call returns
--      the existing row instead of writing a new one or re-posting
--      to Slack).
--
-- The unique index is partial — only enforced on non-rejected
-- rows. A keyword-blocked message gets a random client_msg_id and
-- we want a clean slate so subsequent user clicks aren't blocked.
-- ============================================================

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS client_msg_id UUID;

ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS client_msg_id UUID;

-- chat_messages dedup scope: (channel_id, client_msg_id) — a sender
-- could theoretically post the same content to two different
-- channels and we'd want both to land.
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_messages_dedupe
  ON public.chat_messages (channel_id, client_msg_id)
  WHERE client_msg_id IS NOT NULL AND moderation_status <> 'rejected';

-- direct_messages dedup scope: (sender_id, recipient_id, client_msg_id).
CREATE UNIQUE INDEX IF NOT EXISTS idx_direct_messages_dedupe
  ON public.direct_messages (sender_id, recipient_id, client_msg_id)
  WHERE client_msg_id IS NOT NULL AND moderation_status <> 'rejected';

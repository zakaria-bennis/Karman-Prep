-- ============================================================
-- 016_dm_read_state.sql
--
-- Adds read_at to direct_messages so the chat sidebar can show
-- per-thread unread counts and pull threads with new messages
-- to the top.
--
-- read_at is set to now() when the recipient opens the thread
-- (POST /api/chat/dm/read marks all unread DMs from the other
-- party as read in one update).
--
-- A partial index on (recipient_id, sender_id) WHERE read_at
-- IS NULL keeps the unread-count query cheap.
-- ============================================================

ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS dm_unread_idx
  ON public.direct_messages (recipient_id, sender_id)
  WHERE read_at IS NULL;

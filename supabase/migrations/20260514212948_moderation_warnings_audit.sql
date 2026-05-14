-- ============================================================
-- Moderation triage extension.
--
-- The existing moderation_actions table (created in 20260514002436_chat.sql)
-- already supports action_type = 'warn' / 'approve_message' / 'remove_message'
-- with admin_id + target_student_id + reason. We don't need a separate
-- warnings table — counting warn-rows gives the "prior warnings" badge.
--
-- This migration just adds:
--   · a `severity` column to moderation_actions so admins can grade
--     warnings as low / medium / high (NULL for non-warn actions).
--   · an index that supports counting warnings per user fast — the
--     existing target_student_id index is broader; this partial
--     one is purpose-built for the queue UI's inline badge.
-- ============================================================

ALTER TABLE public.moderation_actions
  ADD COLUMN IF NOT EXISTS severity TEXT
    CHECK (severity IN ('low','medium','high'));

-- Hot path: count warnings per user for the queue UI badge.
CREATE INDEX IF NOT EXISTS idx_moderation_actions_warn_target
  ON public.moderation_actions (target_student_id, created_at DESC)
  WHERE action_type = 'warn';

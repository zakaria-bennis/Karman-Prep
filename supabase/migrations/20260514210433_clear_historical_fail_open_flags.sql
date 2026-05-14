-- ============================================================
-- One-time historical cleanup: clear ai_flagged on messages
-- that landed via the OLD fail-open moderation pipeline.
--
-- Before the fail-closed switch, a moderation-provider error
-- caused us to deliver the message with ai_flagged=true and a
-- specific signature reason. The pipeline is now fail-closed
-- (provider errors → reject), so that signature can never be
-- produced again — meaning this UPDATE only ever touches rows
-- from the pre-fail-closed era.
--
-- We clear ai_flagged + ai_flag_reason so the upcoming
-- /admin/moderation queue UI doesn't open with a backlog of
-- artefacts that have no admin action.
--
-- Affects ~10 rows in dev (admin test data, all from
-- bennisz@outlook.com); should be 0 rows in prod (no users yet).
-- ============================================================

UPDATE chat_messages
SET
  ai_flagged = false,
  ai_flag_reason = NULL
WHERE
  ai_flag_reason = 'Both moderation providers errored — delivering and flagging for review.';

UPDATE direct_messages
SET
  ai_flagged = false,
  ai_flag_reason = NULL
WHERE
  ai_flag_reason = 'Both moderation providers errored — delivering and flagging for review.';

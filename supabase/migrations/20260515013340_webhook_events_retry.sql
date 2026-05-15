-- ============================================================
-- webhook_events: retry tracking columns.
--
-- Audit issue #14. Before this change, the Stripe Connect webhook
-- (and any other webhook using the shared webhook_events log)
-- silently swallowed processing failures: it marked the row
-- processed=true with an error_message and returned 200, so Stripe
-- stopped delivering. The payout_requests row would stay "approved"
-- forever with no retry path.
--
-- Now: on processing failure the handler bumps `attempts`, returns
-- 5xx, and Stripe retries (Stripe's built-in webhook retry runs for
-- ~3 days with exponential backoff). After `gave_up_at` is set, the
-- handler stops returning 5xx and the row is parked for admin
-- triage.
--
-- Columns are nullable / defaulted to keep this migration backward-
-- compatible with already-logged rows.
-- ============================================================

ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS attempts   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gave_up_at TIMESTAMPTZ;

-- Index unprocessed-and-not-given-up rows so the admin "stuck
-- webhooks" view (and any future retry cron) can find them cheaply.
CREATE INDEX IF NOT EXISTS idx_webhook_events_unprocessed_open
  ON webhook_events(source, received_at DESC)
  WHERE processed = FALSE AND gave_up_at IS NULL;

COMMENT ON COLUMN webhook_events.attempts IS
  'Number of times we have run the source-specific processor on this row. Incremented on every attempt, including the first. See /api/webhooks/stripe-connect/route.ts.';
COMMENT ON COLUMN webhook_events.gave_up_at IS
  'Set once attempts exceeds the per-source cap. Stops Stripe retries (handler returns 200 from this point) and routes the row to admin triage.';

-- ============================================================
-- Status Email Automation & Tutor Earnings — Phase 1 schema
--
-- Decisions locked in 2026-05-04:
--   1. Hourly rate only, $35/hr default, prorated by minutes
--   2. Fireflies (not Fathom) for transcripts
--   3. No SMS in v1 — Resend email only (no Twilio columns)
--   4. 1:1 only (private + elite) in v1 — gated at app layer, no schema impact
--   5. Per-tutor signature override (users.email_signature)
--   6. Webhook dedup via external_event_id
--   7. Extend `bookings` (no separate sessions table)
--   8. Use existing `parent_student_links` (no new student_parents table)
--   9. /tutor/earnings page (app layer, no schema impact)
--   10. Server-action gating + service-role; no RLS policies
--
-- Run as a single transaction. All steps are idempotent.
-- ============================================================

BEGIN;

-- ──────────────────────────────────────────────────────────
-- 1. Extend `bookings` — the existing "sessions" table
--    bookings already has: tutor_id, student_id, plan_tier,
--    zoom_meeting_id, zoom_join_url, scheduled_start/end,
--    duration_minutes, status. We add transcript + recap +
--    payout fields here.
-- ──────────────────────────────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS transcript               TEXT,
  ADD COLUMN IF NOT EXISTS transcript_source        VARCHAR(20),
  ADD COLUMN IF NOT EXISTS transcript_received_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_draft             JSONB,
  ADD COLUMN IF NOT EXISTS status_draft_created_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_draft_edited_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recap_email_sent         BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS recap_sent_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recap_resend_message_id  TEXT,
  ADD COLUMN IF NOT EXISTS payout_status            VARCHAR(20) DEFAULT 'not_eligible' NOT NULL,
  ADD COLUMN IF NOT EXISTS payout_amount            NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS payout_request_id        UUID,
  ADD COLUMN IF NOT EXISTS tutor_hours              NUMERIC(5,2);

COMMENT ON COLUMN bookings.transcript_source IS 'fireflies | manual';
COMMENT ON COLUMN bookings.payout_status     IS 'not_eligible | pending | requested | approved | paid';
COMMENT ON COLUMN bookings.tutor_hours       IS 'duration_minutes / 60.0 — pre-computed for fast SUM in earnings view';
COMMENT ON COLUMN bookings.payout_amount     IS '(duration_minutes / 60) * users.hourly_rate at the time recap is sent';

-- ──────────────────────────────────────────────────────────
-- 2. Tutor payment fields on `users`
--    Tutors share the users table with everyone else; these
--    fields are only meaningful when role='tutor'. App layer
--    enforces that (no CHECK constraint to keep flexibility).
-- ──────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS zelle_email              TEXT,
  ADD COLUMN IF NOT EXISTS zelle_phone              TEXT,
  ADD COLUMN IF NOT EXISTS bank_name                TEXT,
  ADD COLUMN IF NOT EXISTS hourly_rate              NUMERIC(8,2) DEFAULT 35.00,
  ADD COLUMN IF NOT EXISTS payment_method           VARCHAR(20) DEFAULT 'zelle',
  ADD COLUMN IF NOT EXISTS payment_info_updated_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_signature          TEXT;

COMMENT ON COLUMN users.hourly_rate     IS 'USD/hour. Default $35. Prorated by minutes when computing payout.';
COMMENT ON COLUMN users.payment_method  IS 'zelle | stripe_connect | manual';
COMMENT ON COLUMN users.email_signature IS 'Per-tutor recap email sign-off. NULL falls back to "Best regards, {first_name} {last_name}".';

-- ──────────────────────────────────────────────────────────
-- 3. payout_requests
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payout_requests (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_amount           NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  total_hours            NUMERIC(6,2)  NOT NULL CHECK (total_hours  >= 0),
  booking_ids            UUID[] NOT NULL,
  booking_count          INTEGER GENERATED ALWAYS AS (array_length(booking_ids, 1)) STORED,
  status                 VARCHAR(20) NOT NULL DEFAULT 'pending_approval',
  payment_method         VARCHAR(20) NOT NULL DEFAULT 'zelle',
  zelle_recipient_email  TEXT,
  zelle_recipient_phone  TEXT,
  requested_at           TIMESTAMPTZ DEFAULT NOW(),
  approved_at            TIMESTAMPTZ,
  paid_at                TIMESTAMPTZ,
  cancelled_at           TIMESTAMPTZ,
  approved_by_user_id    UUID REFERENCES users(id),
  notes                  TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_tutor_status
  ON payout_requests(tutor_user_id, status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status_requested
  ON payout_requests(status, requested_at DESC);

COMMENT ON COLUMN payout_requests.status IS 'pending_approval | approved | paid | cancelled | failed';

-- ──────────────────────────────────────────────────────────
-- 4. status_email_log — audit trail of recap email sends
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS status_email_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  tutor_user_id       UUID NOT NULL REFERENCES users(id),
  student_user_id     UUID NOT NULL REFERENCES users(id),
  recipient_emails    TEXT[],
  channels_used       TEXT[] NOT NULL DEFAULT ARRAY['email'],
  status              VARCHAR(20) NOT NULL,
  resend_message_id   TEXT,
  error_message       TEXT,
  sent_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_email_log_booking
  ON status_email_log(booking_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_email_log_tutor
  ON status_email_log(tutor_user_id, sent_at DESC);

COMMENT ON COLUMN status_email_log.status        IS 'sent | partial_failure | failed';
COMMENT ON COLUMN status_email_log.channels_used IS 'array of: email (sms added in v2)';

-- ──────────────────────────────────────────────────────────
-- 5. webhook_events — raw payload archive + dedup
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source             VARCHAR(20) NOT NULL,
  external_event_id  TEXT,
  event_type         VARCHAR(60),
  raw_payload        JSONB NOT NULL,
  booking_id         UUID REFERENCES bookings(id),
  processed          BOOLEAN DEFAULT FALSE NOT NULL,
  processed_at       TIMESTAMPTZ,
  error_message      TEXT,
  received_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Dedup: same (source, external_event_id) → second insert is rejected.
-- Partial index because some sources may not provide an event id.
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_dedup
  ON webhook_events(source, external_event_id)
  WHERE external_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_events_source_processed
  ON webhook_events(source, processed, received_at DESC);

COMMENT ON COLUMN webhook_events.source IS 'fireflies | (future: zoom, stripe, …)';

-- ──────────────────────────────────────────────────────────
-- 6. notifications — in-app inbox for "draft ready" etc.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(40) NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,
  read        BOOLEAN DEFAULT FALSE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, read, created_at DESC);

COMMENT ON COLUMN notifications.type IS
  'recap_draft_ready | payout_approved | payout_paid | payout_cancelled';

-- ──────────────────────────────────────────────────────────
-- 7. tutor_earnings_summary — materialized view for fast
--    dashboard reads. Refresh after any payout state change.
-- ──────────────────────────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS tutor_earnings_summary;
CREATE MATERIALIZED VIEW tutor_earnings_summary AS
SELECT
  u.id AS tutor_user_id,
  COALESCE(SUM(b.tutor_hours),    0) AS total_hours_worked,
  COALESCE(SUM(b.payout_amount),  0) AS total_earnings,
  COALESCE(SUM(b.payout_amount) FILTER (WHERE b.payout_status IN ('pending','requested')), 0) AS pending_amount,
  COALESCE(SUM(b.payout_amount) FILTER (WHERE b.payout_status = 'approved'),                0) AS approved_amount,
  COALESCE(SUM(b.payout_amount) FILTER (WHERE b.payout_status = 'paid'),                    0) AS paid_amount,
  COUNT(b.id) FILTER (WHERE b.recap_email_sent = TRUE)        AS sessions_with_recap,
  COUNT(b.id) FILTER (WHERE b.payout_status = 'paid')         AS sessions_paid,
  NOW() AS last_refreshed_at
FROM users u
LEFT JOIN bookings b ON b.tutor_id = u.id
WHERE u.role = 'tutor'
GROUP BY u.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tutor_earnings_summary_tutor
  ON tutor_earnings_summary(tutor_user_id);

CREATE OR REPLACE FUNCTION refresh_tutor_earnings_summary()
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY tutor_earnings_summary;
END;
$$;

-- ──────────────────────────────────────────────────────────
-- 8. updated_at trigger for payout_requests
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payout_requests_updated ON payout_requests;
CREATE TRIGGER trg_payout_requests_updated
  BEFORE UPDATE ON payout_requests
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

COMMIT;

-- ──────────────────────────────────────────────────────────
-- Post-migration sanity checks (run separately, not in txn):
--
--   SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--   WHERE table_name='bookings'
--     AND column_name IN ('transcript','status_draft','recap_email_sent','payout_status','payout_amount','tutor_hours');
--
--   SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--   WHERE table_name='users'
--     AND column_name IN ('zelle_email','hourly_rate','payment_method','email_signature');
--
--   SELECT to_regclass('public.payout_requests'),
--          to_regclass('public.status_email_log'),
--          to_regclass('public.webhook_events'),
--          to_regclass('public.notifications');
--
--   SELECT * FROM tutor_earnings_summary LIMIT 5;
-- ──────────────────────────────────────────────────────────

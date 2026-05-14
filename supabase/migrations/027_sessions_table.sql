-- ============================================================
-- Add `sessions` table — the actual class meeting, independent
-- of how many students enrolled.
--
-- Per-session pay model:
--   · Tutor gets paid ONCE per session (not per enrolled student)
--   · For 1:1 bookings: 1 booking ↔ 1 session
--   · For group bookings: N bookings → 1 session
--
-- Also adds `bookings.session_id` (FK) and `payout_requests.session_ids`.
--
-- Backfill happens in migration 006. Don't drop booking-side
-- payout columns yet — do that in a later cleanup once we've
-- confirmed nothing's broken.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  tutor_id   UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  cohort_id  UUID          REFERENCES cohorts(id) ON DELETE SET NULL,

  -- Schedule
  scheduled_start  TIMESTAMPTZ NOT NULL,
  scheduled_end    TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER GENERATED ALWAYS AS (
    (EXTRACT(EPOCH FROM (scheduled_end - scheduled_start)) / 60)::int
  ) STORED,

  -- Zoom (populated at booking-time + post-meeting webhook)
  zoom_meeting_id      TEXT,
  zoom_join_url        TEXT,
  zoom_recording_url   TEXT,
  zoom_attended_emails TEXT[],
  zoom_attended_at     TIMESTAMPTZ,

  -- Transcript + recap
  transcript               TEXT,
  transcript_source        VARCHAR(20),
  transcript_received_at   TIMESTAMPTZ,
  status_draft             JSONB,
  status_draft_created_at  TIMESTAMPTZ,
  status_draft_edited_at   TIMESTAMPTZ,
  recap_email_sent         BOOLEAN DEFAULT FALSE NOT NULL,
  recap_sent_at            TIMESTAMPTZ,
  recap_resend_message_ids TEXT[],

  -- Payout
  payout_status      VARCHAR(20) DEFAULT 'not_eligible' NOT NULL,
  payout_amount      NUMERIC(10,2),
  payout_request_id  UUID,
  tutor_hours        NUMERIC(5,2),

  -- Lifecycle
  status      VARCHAR(20) DEFAULT 'scheduled' NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE sessions IS
  'One row per actual class meeting. Bookings (per-student enrollments) link in via session_id.';
COMMENT ON COLUMN sessions.zoom_attended_emails IS
  'Populated by Zoom webhook after meeting.ended — list of participant emails for admin verification.';
COMMENT ON COLUMN sessions.payout_amount IS
  'Per-session pay (tutor_hours × hourly_rate). Same for 1:1 and group sessions — no per-student multiplier.';

CREATE INDEX IF NOT EXISTS idx_sessions_tutor_start
  ON sessions(tutor_id, scheduled_start DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_cohort
  ON sessions(cohort_id) WHERE cohort_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_zoom_meeting
  ON sessions(zoom_meeting_id) WHERE zoom_meeting_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_payout_status
  ON sessions(payout_status) WHERE payout_status != 'not_eligible';

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_sessions_updated ON sessions;
CREATE TRIGGER trg_sessions_updated
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Link bookings → sessions (nullable so existing rows survive until backfill)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_session
  ON bookings(session_id) WHERE session_id IS NOT NULL;

-- payout_requests gets a session_ids array (replaces booking_ids semantically;
-- old booking_ids stays around for audit until cleanup)
ALTER TABLE payout_requests
  ADD COLUMN IF NOT EXISTS session_ids UUID[];

COMMIT;

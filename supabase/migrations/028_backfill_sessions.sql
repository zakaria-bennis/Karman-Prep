-- ============================================================
-- Backfill: collapse existing per-booking payout/recap data
-- into per-session rows.
--
-- Logic:
--   · For each unique (tutor_id, cohort_id, scheduled_start) tuple,
--     create ONE session row using the first booking's data.
--   · Link every matching booking back to that session via
--     bookings.session_id.
--   · Zero out per-booking payout fields for GROUP bookings only
--     (cohort_id IS NOT NULL) so we don't double-count if anything
--     accidentally still aggregates from bookings.
--   · 1:1 bookings keep their payout fields (1 booking = 1 session,
--     so no risk of duplication).
--
-- Then rebuild the materialized view to aggregate from sessions.
-- ============================================================

BEGIN;

-- 1. Create one session per unique (tutor, cohort_or_id, start)
INSERT INTO sessions (
  tutor_id, cohort_id, scheduled_start, scheduled_end,
  zoom_meeting_id, zoom_join_url,
  transcript, transcript_source, transcript_received_at,
  status_draft, status_draft_created_at, status_draft_edited_at,
  recap_email_sent, recap_sent_at,
  payout_status, payout_amount, payout_request_id, tutor_hours,
  status, created_at
)
SELECT DISTINCT ON (tutor_id, COALESCE(cohort_id::text, ''), scheduled_start)
  tutor_id, cohort_id, scheduled_start, scheduled_end,
  zoom_meeting_id, zoom_join_url,
  transcript, transcript_source, transcript_received_at,
  status_draft, status_draft_created_at, status_draft_edited_at,
  recap_email_sent, recap_sent_at,
  payout_status, payout_amount, payout_request_id, tutor_hours,
  status, created_at
FROM bookings
WHERE session_id IS NULL
ORDER BY tutor_id, COALESCE(cohort_id::text, ''), scheduled_start, id;

-- 2. Link every booking to its session (handles 1:1 and groups)
UPDATE bookings b
   SET session_id = s.id
  FROM sessions s
 WHERE b.session_id IS NULL
   AND b.tutor_id = s.tutor_id
   AND b.scheduled_start = s.scheduled_start
   AND b.cohort_id IS NOT DISTINCT FROM s.cohort_id;

-- 3. Zero out per-seat payout on GROUP bookings (cohort_id NOT NULL)
--    The session row already has the correct per-session amount.
UPDATE bookings
   SET payout_amount = 0,
       tutor_hours   = 0,
       payout_status = 'not_eligible'
 WHERE cohort_id IS NOT NULL;

-- 4. Backfill payout_requests.session_ids from booking_ids → look up the
--    session for each booking and dedupe.
UPDATE payout_requests pr
   SET session_ids = (
     SELECT ARRAY_AGG(DISTINCT b.session_id)
       FROM bookings b
      WHERE b.id = ANY (pr.booking_ids)
        AND b.session_id IS NOT NULL
   )
 WHERE session_ids IS NULL
   AND booking_ids IS NOT NULL;

-- 5. Rebuild materialized view to aggregate from sessions
DROP MATERIALIZED VIEW IF EXISTS tutor_earnings_summary CASCADE;
CREATE MATERIALIZED VIEW tutor_earnings_summary AS
SELECT
  u.id AS tutor_user_id,
  COALESCE(SUM(s.tutor_hours),    0) AS total_hours_worked,
  COALESCE(SUM(s.payout_amount),  0) AS total_earnings,
  COALESCE(SUM(s.payout_amount) FILTER (WHERE s.payout_status IN ('pending','requested')), 0) AS pending_amount,
  COALESCE(SUM(s.payout_amount) FILTER (WHERE s.payout_status = 'approved'),                0) AS approved_amount,
  COALESCE(SUM(s.payout_amount) FILTER (WHERE s.payout_status = 'paid'),                    0) AS paid_amount,
  COUNT(s.id) FILTER (WHERE s.recap_email_sent = TRUE)        AS sessions_with_recap,
  COUNT(s.id) FILTER (WHERE s.payout_status = 'paid')         AS sessions_paid,
  NOW() AS last_refreshed_at
FROM users u
LEFT JOIN sessions s ON s.tutor_id = u.id
WHERE u.role IN ('tutor', 'admin')
GROUP BY u.id;

CREATE UNIQUE INDEX idx_tutor_earnings_summary_tutor
  ON tutor_earnings_summary(tutor_user_id);

COMMIT;

-- Sanity check (run separately):
--   SELECT count(*) AS bookings, count(DISTINCT session_id) AS sessions FROM bookings WHERE session_id IS NOT NULL;
--   SELECT * FROM tutor_earnings_summary WHERE tutor_user_id = 'e2245a2b-1932-45c5-a889-157ff031fd85';
--   For the seeded admin: expect ~7 sessions (5 1:1 + 1 small_group + 1 seminar)
--                          pending_amount = 5×1:1 + 1×$52.50 + 1×$70 = 236.25 + 122.50 = $358.75

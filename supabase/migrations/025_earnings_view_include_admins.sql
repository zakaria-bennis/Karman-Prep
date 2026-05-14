-- ============================================================
-- Fix: tutor_earnings_summary materialized view excluded admins
-- who happen to also tutor. The dev/admin user (bennisz@outlook.com)
-- has role='admin' but is acting as a tutor for testing — the
-- view filtered them out, so the dashboard showed null.
--
-- Change: WHERE clause now includes both 'tutor' and 'admin'.
-- Real tutors are unaffected; admins who tutor now appear.
--
-- Idempotent: drops + recreates view + index.
-- ============================================================

BEGIN;

DROP MATERIALIZED VIEW IF EXISTS tutor_earnings_summary CASCADE;

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
WHERE u.role IN ('tutor', 'admin')
GROUP BY u.id;

CREATE UNIQUE INDEX idx_tutor_earnings_summary_tutor
  ON tutor_earnings_summary(tutor_user_id);

COMMIT;

-- Sanity check (run separately):
--   SELECT * FROM tutor_earnings_summary WHERE tutor_user_id = 'e2245a2b-1932-45c5-a889-157ff031fd85';
--   Expect: pending_amount = 236.25, total_hours_worked = 6.75

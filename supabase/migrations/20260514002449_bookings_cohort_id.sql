-- ============================================================
-- Add cohort_id to bookings so we can show "Tutor session for
-- Cohort X" in the earnings dashboard for group/seminar sessions.
--
-- Nullable: 1:1 (private/elite) bookings stay cohort_id=NULL.
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES cohorts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_cohort
  ON bookings(cohort_id) WHERE cohort_id IS NOT NULL;

COMMENT ON COLUMN bookings.cohort_id IS
  'For group/seminar bookings, links back to the cohort row. NULL for 1:1 sessions.';

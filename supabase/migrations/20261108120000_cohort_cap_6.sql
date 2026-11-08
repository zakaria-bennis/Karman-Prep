-- ============================================================
-- Cohort (tier='small_group') cap from 5 to 6.
-- Per the plan ladder (founder, 2026-11-08): at most six students
-- in a cohort (MARCH_PROGRAM.paidSeats in src/lib/marketing/offer.ts).
-- The weekly live session (tier='group') cap stays at 250.
-- Rollback: re-run 20260514002452_cohort_cap_250.sql (small_group
-- BETWEEN 1 AND 5) after checking no cohort has max_size 6.
-- ============================================================

ALTER TABLE cohorts DROP CONSTRAINT IF EXISTS cohort_size_within_tier_cap;
ALTER TABLE cohorts
  ADD CONSTRAINT cohort_size_within_tier_cap
  CHECK (
    (tier = 'small_group' AND max_size BETWEEN 1 AND 6)
    OR (tier = 'group'    AND max_size BETWEEN 1 AND 250)
  );

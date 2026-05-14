-- ============================================================
-- Bump seminar (tier='group') cohort cap from 200 → 250.
-- Per product spec: small group ≤ 5, seminar ≤ 250.
-- ============================================================

ALTER TABLE cohorts DROP CONSTRAINT IF EXISTS cohort_size_within_tier_cap;
ALTER TABLE cohorts
  ADD CONSTRAINT cohort_size_within_tier_cap
  CHECK (
    (tier = 'small_group' AND max_size BETWEEN 1 AND 5)
    OR (tier = 'group'    AND max_size BETWEEN 1 AND 250)
  );

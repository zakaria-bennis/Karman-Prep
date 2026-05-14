-- ============================================================
-- 018_diagnostic_total_score_range.sql
--
-- Widen diagnostic_results.score_range_{low,high} constraints
-- from the original 200-800 (math section only) to 200-1600
-- (full SAT total). The diagnostic now scores all 8 official
-- domains and reports a section-summed total, so the previous
-- ceiling rejected every submission with "score_range_high
-- violates check constraint".
--
-- Idempotent: drops the old constraints by name (created
-- automatically with the original CHECK clauses) and re-adds
-- new ones.
-- ============================================================

ALTER TABLE public.diagnostic_results
  DROP CONSTRAINT IF EXISTS diagnostic_results_score_range_low_check,
  DROP CONSTRAINT IF EXISTS diagnostic_results_score_range_high_check;

ALTER TABLE public.diagnostic_results
  ADD CONSTRAINT diagnostic_results_score_range_low_check
    CHECK (score_range_low BETWEEN 200 AND 1600),
  ADD CONSTRAINT diagnostic_results_score_range_high_check
    CHECK (score_range_high BETWEEN 200 AND 1600);

-- ============================================================
-- Track when a cohort has had its out-of-band Cal/Zoom setup
-- completed by an admin. Closes audit issue #4: the seminar
-- overflow webhook auto-creates sibling cohorts but the admin
-- has to manually wire up the Cal event-type + Zoom integration
-- on Cal.com itself, and there's been no visible signal in
-- Karman if they forget.
--
-- A NULL value means "still needs admin to configure Cal/Zoom"
-- and drives both the yellow badge on /admin/cohorts and the
-- daily reminder email cron.
--
-- Only group + small_group cohorts use this flag — private + elite
-- are 1:1 and run through the per-tutor Cal OAuth flow (PR #33).
-- That said, we set the column on the whole table to keep the
-- schema simple; UI + cron filter to the relevant tiers.
--
-- Backfill: every existing cohort gets setup_completed_at = created_at.
-- We don't want one PR to make every legacy cohort suddenly show
-- "needs setup" — only NEW cohorts created after this migration
-- (e.g. by the seminar overflow webhook) start with NULL.
-- ============================================================

ALTER TABLE public.cohorts
  ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMPTZ;

-- Backfill: legacy cohorts are considered "set up" so the badge
-- doesn't suddenly appear on hundreds of rows. Idempotent — only
-- touches rows where the column is still NULL.
UPDATE public.cohorts
SET setup_completed_at = created_at
WHERE setup_completed_at IS NULL;

-- Hot path for the badge + cron: "which group/small_group cohorts
-- still need setup AND aren't archived?"
CREATE INDEX IF NOT EXISTS idx_cohorts_needs_setup
  ON public.cohorts (created_at)
  WHERE setup_completed_at IS NULL AND archived_at IS NULL;

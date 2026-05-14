-- ============================================================
-- Soft-archive support for empty cohorts.
--
-- Group + small_group cohorts that hit zero active members should
-- silently disappear from every dashboard. We don't hard-delete:
-- tutor notes, past DMs, and historical bookings stay intact for
-- forensics, and if the same SAT date / tutor / tier needs to be
-- rebuilt later we can spin up a fresh row rather than dig the
-- old one out of a cascade.
--
-- Triggers:
--   · actionRemoveCohortMember (admin UI) — archives after the
--     last student leaves
--   · dropFromActiveCohort (Stripe webhook) — same
--   · restoreLastCohort (Stripe webhook) — un-archives if the
--     student rejoining was the one whose leave archived it
--
-- Reads:
--   · every list query filters `archived_at IS NULL`. Detail
--     pages still load archived rows by primary key so admins
--     can audit them by URL.
-- ============================================================

ALTER TABLE public.cohorts
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Hot path: the admin + tutor dashboards order by sat_date and
-- filter by tier on the unarchived set. Partial index keeps both
-- the filter and the ORDER cheap.
CREATE INDEX IF NOT EXISTS idx_cohorts_active
  ON public.cohorts (sat_date, tier)
  WHERE archived_at IS NULL;

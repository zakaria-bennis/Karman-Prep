-- ============================================================
-- Track onboarding-placement failures — audit issue #10.
--
-- Today /api/onboarding/submit wraps placeInCohort() and
-- assignTutorOneToOne() in a try/catch that logs + continues:
-- the student lands on /dashboard/student with no cohort/tutor
-- and no signal in the admin console. We now set this column
-- to now() on failure (placement throw OR no available tutor)
-- so the student dashboard can render a "we're matching you"
-- banner AND the admin can list the failures.
--
-- Self-clearing semantics: the dashboard banner ANDs this flag
-- with "has no active cohort_members / tutor_assignments row" —
-- so admin manually placing the student makes the banner go
-- away without needing a separate "mark resolved" action.
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS placement_failure_at TIMESTAMPTZ;

-- Admin discovery path: list students whose placement is still
-- waiting on us. Partial index because the vast majority of
-- users are NULL here.
CREATE INDEX IF NOT EXISTS idx_users_placement_failure
  ON public.users (placement_failure_at DESC)
  WHERE placement_failure_at IS NOT NULL;

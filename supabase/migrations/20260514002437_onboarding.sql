-- ============================================================
-- Strata Onboarding Questionnaire — Migration 014
--
-- Adds the columns needed for the post-payment questionnaire
-- that drives auto cohort placement + 1:1 tutor matching.
--
-- A user is "onboarded" when onboarding_completed_at is set.
-- The dashboard layout redirects to /onboarding/questionnaire
-- whenever onboarding_completed_at IS NULL.
--
-- Existing test_* users + the bennisz@outlook admin are
-- back-filled with onboarding_completed_at so they don't get
-- bumped into a half-empty questionnaire.
--
-- Run in Supabase SQL Editor after migration 013. Idempotent.
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_completed_at  TIMESTAMPTZ,

  -- Required for ALL tiers (set in step 1 of the questionnaire).
  ADD COLUMN IF NOT EXISTS goal_sat_score           INT,
  ADD COLUMN IF NOT EXISTS hs_year                  TEXT,

  -- Recent SAT (set if student has taken it).
  ADD COLUMN IF NOT EXISTS recent_sat_math          INT,
  ADD COLUMN IF NOT EXISTS recent_sat_reading       INT,
  ADD COLUMN IF NOT EXISTS recent_sat_time_pressure BOOLEAN,

  -- PSAT (set if student has taken it).
  ADD COLUMN IF NOT EXISTS psat_score               INT,

  -- Required for Private + Elite tiers (one-on-one matching).
  ADD COLUMN IF NOT EXISTS available_days           TEXT[],
  ADD COLUMN IF NOT EXISTS available_times          TEXT[],
  ADD COLUMN IF NOT EXISTS time_zone                TEXT,

  -- Family / marketing (collected from everyone).
  ADD COLUMN IF NOT EXISTS parent_email_collected   TEXT,
  ADD COLUMN IF NOT EXISTS parent_phone_collected   TEXT,
  ADD COLUMN IF NOT EXISTS heard_about_strata       TEXT;

-- Range / enum constraints, applied via DO block so re-runs
-- don't choke on "constraint already exists".
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_hs_year_check') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_hs_year_check
      CHECK (hs_year IS NULL OR hs_year IN ('freshman','sophomore','junior','senior'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_goal_sat_check') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_goal_sat_check
      CHECK (goal_sat_score IS NULL OR (goal_sat_score BETWEEN 400 AND 1600));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_recent_sat_math_check') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_recent_sat_math_check
      CHECK (recent_sat_math IS NULL OR (recent_sat_math BETWEEN 200 AND 800));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_recent_sat_reading_check') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_recent_sat_reading_check
      CHECK (recent_sat_reading IS NULL OR (recent_sat_reading BETWEEN 200 AND 800));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_psat_check') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_psat_check
      CHECK (psat_score IS NULL OR (psat_score BETWEEN 320 AND 1520));
  END IF;
END $$;

-- Back-fill: existing test users + the live admin shouldn't be
-- redirected into the questionnaire.
UPDATE public.users
   SET onboarding_completed_at = COALESCE(onboarding_completed_at, now())
 WHERE clerk_id LIKE 'test_%'
    OR clerk_id = 'user_3Cee37IQmC3gnCXv9XeM8K12dsE';

-- Index used by the dashboard layout's redirect guard.
CREATE INDEX IF NOT EXISTS users_onboarding_pending_idx
  ON public.users (clerk_id)
  WHERE onboarding_completed_at IS NULL;

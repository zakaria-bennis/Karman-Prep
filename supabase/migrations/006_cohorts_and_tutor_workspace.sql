-- ============================================================
-- Strata Cohorts + Tutor Workspace — Migration 006
--
-- Phase 1 foundation for cohort-based tiers (seminar, small group)
-- and 1:1 tutor assignments (private, elite).
--
-- Adds:
--   · sat_dates            — official College Board test dates (cohort anchor)
--   · cohorts              — one per (tier + SAT date + tutor)
--   · cohort_members       — who's in which cohort (1 active per student)
--   · tutor_assignments    — 1:1 tutor-student pairings for private / elite
--   · cohort_waitlist      — upgrade edge case when no small_group has capacity
--   · tutor_notes          — tutor's free-form notes (general, per-student, or per-cohort)
--   · users.first_name     — needed for cohort member list (first-name-only)
--   · users.last_name      — populated alongside first_name from Clerk
--   · users.avatar_url     — optional student profile photo (Supabase Storage)
--
-- Run this in the Supabase SQL editor after migration 005.
-- Idempotent — safe to re-run.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. User profile fields (name + avatar)
--    first_name lets us show "members list by first name only"
--    without exposing email or last name.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS first_name  TEXT,
  ADD COLUMN IF NOT EXISTS last_name   TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url  TEXT;


-- ─────────────────────────────────────────────────────────────
-- 2. sat_dates — official College Board test dates
--    Seed these manually (or via a scheduled scraper) from
--    https://satsuite.collegeboard.org/sat/dates-deadlines.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sat_dates (
  test_date                   DATE         PRIMARY KEY,
  registration_deadline       DATE         NOT NULL,
  late_registration_deadline  DATE,
  source_url                  TEXT,
  imported_at                 TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.sat_dates ENABLE ROW LEVEL SECURITY;

-- Everyone signed in can read the calendar of test dates
DROP POLICY IF EXISTS "sat_dates_authenticated_read" ON public.sat_dates;
CREATE POLICY "sat_dates_authenticated_read"
  ON public.sat_dates FOR SELECT
  USING (auth.role() = 'authenticated');

-- Writes via service role only (admin tooling)
DROP POLICY IF EXISTS "sat_dates_service_write" ON public.sat_dates;
CREATE POLICY "sat_dates_service_write"
  ON public.sat_dates FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────
-- 3. cohorts — one per (tier + SAT date + tutor)
--    tier is constrained to the two cohort-eligible tiers.
--    Private / elite (1:1) never get a cohort row.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cohorts (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT         NOT NULL,
  tier            TEXT         NOT NULL CHECK (tier IN ('group', 'small_group')),
  sat_date        DATE         NOT NULL REFERENCES public.sat_dates(test_date) ON DELETE RESTRICT,
  tutor_user_id   UUID         NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  max_size        SMALLINT     NOT NULL CHECK (max_size > 0),
  current_topic   TEXT,
  status          TEXT         NOT NULL DEFAULT 'forming'
                                CHECK (status IN ('forming', 'active', 'completed')),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  ended_at        TIMESTAMPTZ,

  -- Hard caps for each tier are enforced here, so even a bug in app
  -- code can't exceed them. Seminar = 200, small group = 5.
  CONSTRAINT cohort_size_within_tier_cap CHECK (
    (tier = 'small_group' AND max_size <= 5) OR
    (tier = 'group'       AND max_size <= 200)
  )
);

CREATE INDEX IF NOT EXISTS cohorts_sat_date_idx     ON public.cohorts (sat_date);
CREATE INDEX IF NOT EXISTS cohorts_tutor_idx        ON public.cohorts (tutor_user_id);
CREATE INDEX IF NOT EXISTS cohorts_tier_status_idx  ON public.cohorts (tier, status);

ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
-- NOTE: cohorts RLS policies live in section 4b below, AFTER cohort_members
-- is created, because one of them references public.cohort_members.


-- ─────────────────────────────────────────────────────────────
-- 4. cohort_members — membership table
--    Partial unique index enforces "one active cohort per student"
--    at the DB level (not just in app code).
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cohort_members (
  cohort_id   UUID         NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  user_id     UUID         NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  left_at     TIMESTAMPTZ,
  PRIMARY KEY (cohort_id, user_id)
);

CREATE INDEX IF NOT EXISTS cohort_members_user_idx ON public.cohort_members (user_id);

-- One active cohort per student, enforced in DB.
CREATE UNIQUE INDEX IF NOT EXISTS cohort_members_one_active_per_user
  ON public.cohort_members (user_id)
  WHERE left_at IS NULL;

ALTER TABLE public.cohort_members ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────
-- 4b. cohorts RLS policies — deferred here so the policy that
--     references cohort_members can resolve at creation time.
-- ─────────────────────────────────────────────────────────────

-- A cohort is visible to (a) its tutor, (b) its current members, (c) admins via service role.
DROP POLICY IF EXISTS "cohorts_member_or_tutor_read" ON public.cohorts;
CREATE POLICY "cohorts_member_or_tutor_read"
  ON public.cohorts FOR SELECT
  USING (
    tutor_user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub'
    )
    OR id IN (
      SELECT cohort_id FROM public.cohort_members
       WHERE user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
         AND left_at IS NULL
    )
  );

DROP POLICY IF EXISTS "cohorts_service_write" ON public.cohorts;
CREATE POLICY "cohorts_service_write"
  ON public.cohorts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────
-- 4c. cohort_members RLS policies.
-- ─────────────────────────────────────────────────────────────

-- A member row is visible to (a) the student themselves, (b) anyone
-- else in the SAME cohort (so members can see each other), (c) the
-- cohort's tutor, (d) service role.
DROP POLICY IF EXISTS "cohort_members_peer_read" ON public.cohort_members;
CREATE POLICY "cohort_members_peer_read"
  ON public.cohort_members FOR SELECT
  USING (
    -- self
    user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
    -- same-cohort peer
    OR cohort_id IN (
      SELECT cohort_id FROM public.cohort_members
       WHERE user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
         AND left_at IS NULL
    )
    -- cohort's tutor
    OR cohort_id IN (
      SELECT id FROM public.cohorts
       WHERE tutor_user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
    )
  );

DROP POLICY IF EXISTS "cohort_members_service_write" ON public.cohort_members;
CREATE POLICY "cohort_members_service_write"
  ON public.cohort_members FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────
-- 5. tutor_assignments — 1:1 tutor-student pairings
--    Used for private + elite tiers. Cohort-tier students do NOT
--    get rows here; their tutor is cohorts.tutor_user_id.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tutor_assignments (
  id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_user_id     UUID         NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  student_user_id   UUID         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  started_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  ended_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS tutor_assignments_tutor_idx   ON public.tutor_assignments (tutor_user_id);
CREATE INDEX IF NOT EXISTS tutor_assignments_student_idx ON public.tutor_assignments (student_user_id);

-- One active 1:1 tutor per student.
CREATE UNIQUE INDEX IF NOT EXISTS tutor_assignments_one_active_per_student
  ON public.tutor_assignments (student_user_id)
  WHERE ended_at IS NULL;

ALTER TABLE public.tutor_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tutor_assignments_self_read" ON public.tutor_assignments;
CREATE POLICY "tutor_assignments_self_read"
  ON public.tutor_assignments FOR SELECT
  USING (
    student_user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
    OR tutor_user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
  );

DROP POLICY IF EXISTS "tutor_assignments_service_write" ON public.tutor_assignments;
CREATE POLICY "tutor_assignments_service_write"
  ON public.tutor_assignments FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────
-- 6. cohort_waitlist — upgrade edge case
--    When a seminar student upgrades to small_group but all
--    small_group cohorts for their SAT date are at capacity (5/5),
--    we park them here until a spot opens OR admin creates a new cohort.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cohort_waitlist (
  user_id           UUID         NOT NULL REFERENCES public.users(id)     ON DELETE CASCADE,
  target_sat_date   DATE         NOT NULL REFERENCES public.sat_dates(test_date) ON DELETE RESTRICT,
  target_tier       TEXT         NOT NULL DEFAULT 'small_group'
                                   CHECK (target_tier IN ('small_group')),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  fulfilled_at      TIMESTAMPTZ,
  PRIMARY KEY (user_id, target_sat_date)
);

CREATE INDEX IF NOT EXISTS cohort_waitlist_pending_idx
  ON public.cohort_waitlist (target_sat_date, created_at)
  WHERE fulfilled_at IS NULL;

ALTER TABLE public.cohort_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cohort_waitlist_self_read" ON public.cohort_waitlist;
CREATE POLICY "cohort_waitlist_self_read"
  ON public.cohort_waitlist FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS "cohort_waitlist_service_write" ON public.cohort_waitlist;
CREATE POLICY "cohort_waitlist_service_write"
  ON public.cohort_waitlist FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────
-- 7. tutor_notes — tutor's scratchpad
--    Three shapes of note, picked by which FK is populated:
--      · general         — both student_user_id and cohort_id NULL
--      · per-student     — student_user_id set, cohort_id NULL
--      · per-cohort      — cohort_id set, student_user_id NULL
--    Partial unique indexes keep "one ongoing doc per target".
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tutor_notes (
  id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_user_id     UUID         NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  student_user_id   UUID                  REFERENCES public.users(id)   ON DELETE CASCADE,
  cohort_id         UUID                  REFERENCES public.cohorts(id) ON DELETE CASCADE,
  body              TEXT         NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- At most one of {student, cohort} may be set.
  CONSTRAINT tutor_notes_target_exclusive CHECK (
    NOT (student_user_id IS NOT NULL AND cohort_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS tutor_notes_tutor_idx ON public.tutor_notes (tutor_user_id);

-- One ongoing general notepad per tutor.
CREATE UNIQUE INDEX IF NOT EXISTS tutor_notes_one_general_per_tutor
  ON public.tutor_notes (tutor_user_id)
  WHERE student_user_id IS NULL AND cohort_id IS NULL;

-- One ongoing doc per (tutor, student).
CREATE UNIQUE INDEX IF NOT EXISTS tutor_notes_one_per_student
  ON public.tutor_notes (tutor_user_id, student_user_id)
  WHERE student_user_id IS NOT NULL;

-- One ongoing doc per (tutor, cohort).
CREATE UNIQUE INDEX IF NOT EXISTS tutor_notes_one_per_cohort
  ON public.tutor_notes (tutor_user_id, cohort_id)
  WHERE cohort_id IS NOT NULL;

ALTER TABLE public.tutor_notes ENABLE ROW LEVEL SECURITY;

-- Notes are strictly private to their tutor.
DROP POLICY IF EXISTS "tutor_notes_owner_all" ON public.tutor_notes;
CREATE POLICY "tutor_notes_owner_all"
  ON public.tutor_notes FOR ALL
  USING (tutor_user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub'))
  WITH CHECK (tutor_user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS "tutor_notes_service_all" ON public.tutor_notes;
CREATE POLICY "tutor_notes_service_all"
  ON public.tutor_notes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────
-- 8. updated_at trigger for tutor_notes
--    Keeps updated_at fresh without relying on app code.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tutor_notes_set_updated_at ON public.tutor_notes;
CREATE TRIGGER tutor_notes_set_updated_at
  BEFORE UPDATE ON public.tutor_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();


-- ─────────────────────────────────────────────────────────────
-- 9. Convenience view — active_cohort_for_student
--    One-stop lookup: given a user_id, return their active cohort
--    (if any) joined with tutor and SAT date metadata.
--    RLS on the underlying tables still applies.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.active_cohort_for_student AS
SELECT
  cm.user_id,
  c.id             AS cohort_id,
  c.name           AS cohort_name,
  c.tier,
  c.sat_date,
  c.tutor_user_id,
  c.current_topic,
  c.status,
  c.max_size
FROM public.cohort_members cm
JOIN public.cohorts c ON c.id = cm.cohort_id
WHERE cm.left_at IS NULL;

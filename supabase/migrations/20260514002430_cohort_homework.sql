-- ============================================================
-- Strata Cohort Homework — Migration 007
--
-- Adds the `cohort_homework` table so tutors can post
-- homework assignments to a cohort. Visible to:
--   · the cohort's tutor      (RW)
--   · the cohort's members    (RO)
--   · admin via service role  (RW)
--
-- Run this in the Supabase SQL editor after migration 006.
-- Idempotent — safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cohort_homework (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  cohort_id           UUID        NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  title               TEXT        NOT NULL,
  body                TEXT,
  assigned_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at              TIMESTAMPTZ,
  created_by_user_id  UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cohort_homework_cohort_idx
  ON public.cohort_homework (cohort_id, assigned_at DESC);

ALTER TABLE public.cohort_homework ENABLE ROW LEVEL SECURITY;

-- Tutor of the cohort: full CRUD on homework for their cohorts.
DROP POLICY IF EXISTS "homework_tutor_all" ON public.cohort_homework;
CREATE POLICY "homework_tutor_all"
  ON public.cohort_homework FOR ALL
  USING (
    cohort_id IN (
      SELECT id FROM public.cohorts
       WHERE tutor_user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
    )
  )
  WITH CHECK (
    cohort_id IN (
      SELECT id FROM public.cohorts
       WHERE tutor_user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
    )
  );

-- Active cohort members: read-only access to their cohort's homework.
DROP POLICY IF EXISTS "homework_member_read" ON public.cohort_homework;
CREATE POLICY "homework_member_read"
  ON public.cohort_homework FOR SELECT
  USING (
    cohort_id IN (
      SELECT cohort_id FROM public.cohort_members
       WHERE user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
         AND left_at IS NULL
    )
  );

-- Service role bypass for admin tooling.
DROP POLICY IF EXISTS "homework_service_all" ON public.cohort_homework;
CREATE POLICY "homework_service_all"
  ON public.cohort_homework FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- updated_at trigger — reuses the function created in migration 006.
DROP TRIGGER IF EXISTS cohort_homework_set_updated_at ON public.cohort_homework;
CREATE TRIGGER cohort_homework_set_updated_at
  BEFORE UPDATE ON public.cohort_homework
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

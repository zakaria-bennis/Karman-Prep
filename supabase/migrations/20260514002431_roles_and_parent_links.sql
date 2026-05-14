-- ============================================================
-- Strata Roles + Parent-Student Links — Migration 008
--
-- Two things:
--   1. Admin role. The original schema's CHECK constraint on
--      users.role only allowed 'student' | 'tutor' | 'parent'.
--      App code already references 'admin' (see
--      src/lib/supabase/queries/admin.ts). This migration
--      updates the CHECK so 'admin' is an officially allowed
--      value and a DB write with role='admin' stops failing.
--
--   2. Parent-student linkage. A parent account can be linked
--      to one or more specific students — a parent should
--      never be able to see a student they aren't linked to.
--
-- Run this in the Supabase SQL editor after migration 007.
-- Idempotent — safe to re-run.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Broaden users.role CHECK to include 'admin'.
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.users'::regclass
       AND conname  = 'users_role_check'
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_role_check;
  END IF;
END $$;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('student', 'tutor', 'parent', 'admin'));


-- ─────────────────────────────────────────────────────────────
-- 2. parent_student_links — which parent can see which student.
--    Many-to-many: one parent can track multiple kids, and both
--    parents can share a student.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.parent_student_links (
  parent_user_id   UUID         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_user_id  UUID         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_user_id, student_user_id),
  -- Guard against self-links (parent_user_id = student_user_id).
  CHECK (parent_user_id <> student_user_id)
);

CREATE INDEX IF NOT EXISTS parent_student_links_student_idx
  ON public.parent_student_links (student_user_id);

ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

-- A parent sees rows where they're the parent.
-- A student sees rows where they're the student (so they know who tracks them).
DROP POLICY IF EXISTS "parent_links_self_read" ON public.parent_student_links;
CREATE POLICY "parent_links_self_read"
  ON public.parent_student_links FOR SELECT
  USING (
    parent_user_id  IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
    OR student_user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
  );

-- All writes go through the service role (admin creates/removes links).
DROP POLICY IF EXISTS "parent_links_service_write" ON public.parent_student_links;
CREATE POLICY "parent_links_service_write"
  ON public.parent_student_links FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

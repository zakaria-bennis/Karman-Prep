-- ============================================================
-- Student portal (overnight build, 2026-11-08): which test the
-- student is preparing for. The account menu and onboarding ask
-- "SAT or PSAT" next to the test date (users.sat_test_date).
-- NULL means the student hasn't said yet. Additive and idempotent.
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS test_type text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.users'::regclass
       AND conname  = 'users_test_type_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_test_type_check CHECK (test_type IS NULL OR test_type IN ('sat', 'psat'));
  END IF;
END $$;

COMMENT ON COLUMN public.users.test_type IS
  'The test the student is preparing for: sat or psat. NULL until they say.';

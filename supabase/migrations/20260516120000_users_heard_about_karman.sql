-- Rename users.heard_about_strata -> users.heard_about_karman.
-- Part of the Strata -> Karman brand-name cleanup (no behaviour change).
--
-- Idempotent: only renames if the old column still exists, so this is
-- safe to re-run (e.g. against an environment that already migrated).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'heard_about_strata'
  ) THEN
    ALTER TABLE public.users
      RENAME COLUMN heard_about_strata TO heard_about_karman;
  END IF;
END $$;

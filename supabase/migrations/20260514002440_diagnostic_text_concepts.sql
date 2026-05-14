-- ============================================================
-- 017_diagnostic_text_concepts.sql
--
-- The diagnostic question bank (src/app/diagnostic/page.tsx)
-- tags each question with a string slug like "linear-equations"
-- — those are concept identifiers from the SAT topic taxonomy,
-- not foreign keys to the curated `concepts` graph (which uses
-- generated UUIDs and only seeds 15 nodes).
--
-- Storing those slugs in `diagnostic_results.weak_concepts`
-- (originally typed `uuid[]`) was 500'ing every diagnostic
-- submit with `invalid input syntax for type uuid`. This
-- migration converts the column to `text[]` so the slugs
-- round-trip cleanly. TypeScript already declares the field
-- as `string[]`, so no client changes are needed.
--
-- Idempotent — safe to re-run; no-op if already text[].
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'diagnostic_results'
      AND column_name  = 'weak_concepts'
      AND udt_name     = '_uuid'
  ) THEN
    -- Drop the old default first; uuid[]'s default ('{}'::uuid[])
    -- can't be auto-coerced to text[] when ALTER TYPE recasts it.
    ALTER TABLE public.diagnostic_results
      ALTER COLUMN weak_concepts DROP DEFAULT;

    ALTER TABLE public.diagnostic_results
      ALTER COLUMN weak_concepts TYPE text[]
      USING weak_concepts::text[];
  END IF;
END$$;

ALTER TABLE public.diagnostic_results
  ALTER COLUMN weak_concepts SET DEFAULT '{}'::text[];

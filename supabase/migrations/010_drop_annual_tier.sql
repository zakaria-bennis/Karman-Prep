-- ============================================================
-- Strata — Drop 'annual' from subscriptions.tier — Migration 010
--
-- The original schema's CHECK on subscriptions.tier allowed five
-- values: group, small_group, private, elite, annual. The product
-- only ships four delivery tiers (group/small_group/private/elite);
-- 'annual' was a billing label that never made it into the
-- product. This migration drops it so future writes can't
-- introduce orphan data, and so the bookings flow can rely on the
-- four-tier invariant.
--
-- Safety: aborts loudly if any subscriptions row still has
-- tier='annual'. As of writing migration 010, zero such rows
-- exist.
--
-- Run this in the Supabase SQL editor after migration 009.
-- Idempotent — safe to re-run.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Refuse to run if any row still uses 'annual'.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  annual_count INTEGER;
BEGIN
  SELECT count(*) INTO annual_count FROM public.subscriptions WHERE tier = 'annual';
  IF annual_count > 0 THEN
    RAISE EXCEPTION
      'Refusing to drop ''annual'' from tier CHECK: % row(s) still have tier=annual. Remap those rows first.',
      annual_count;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2. Drop whichever CHECK constraint currently bounds tier
--    (the auto-generated name varies between provisions), then
--    re-add it with the four-tier set.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  con_name TEXT;
BEGIN
  -- Find any CHECK constraint on subscriptions whose definition
  -- mentions tier — this catches both Postgres-auto-named and
  -- explicit names without us having to guess.
  SELECT conname INTO con_name
    FROM pg_constraint
   WHERE conrelid = 'public.subscriptions'::regclass
     AND contype  = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%tier%';

  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.subscriptions DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_tier_check
  CHECK (tier IN ('group', 'small_group', 'private', 'elite'));

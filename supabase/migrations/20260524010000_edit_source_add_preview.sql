-- ============================================================
-- question_history.edit_source: add 'preview' value.
--
-- The preview-validation page (phase-3 inline edit) writes audit
-- rows tagged 'preview' so the history list can distinguish them
-- from inspector edits, bulk operations, and API writes.
--
-- The original CHECK constraint allowed only:
--   'inspector', 'bulk', 'api', 'apply-fix'
-- We add 'preview' to the same anonymous CHECK.
--
-- Postgres CHECK constraints don't have names by default unless we
-- gave them one; we look up the constraint name from the catalog
-- and drop/recreate. This is the standard Supabase pattern (also
-- used in 20260518153300 itself for question_history).
-- ============================================================

DO $$
DECLARE
  cname text;
BEGIN
  -- Find the existing edit_source CHECK constraint name on
  -- question_history. It's the only check on that column.
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.question_history'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%edit_source%';

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.question_history DROP CONSTRAINT %I', cname);
  END IF;

  -- Re-add with 'preview' included.
  ALTER TABLE public.question_history
    ADD CONSTRAINT question_history_edit_source_check
    CHECK (edit_source IN ('inspector', 'bulk', 'api', 'apply-fix', 'preview'));
END $$;

COMMENT ON COLUMN public.question_history.edit_source IS
  'Where the edit came from. inspector = /admin/questions/inspect, '
  'preview = /admin/questions/preview, bulk = batch operation, '
  'api = external API write, apply-fix = automated fix pipeline.';

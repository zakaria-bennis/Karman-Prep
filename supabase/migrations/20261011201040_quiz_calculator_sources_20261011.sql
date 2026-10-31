-- Recorded from production supabase_migrations.schema_migrations (20261011201040).
-- Applied by hand on 20261011; this file makes the repo match production history. Do not edit.
-- Exact, reviewed calculator sources are authored separately from figures and
-- prose. No legacy row is backfilled or interpreted; old rows remain NULL.
-- Abort before mutation if the publication view has drifted: this migration
-- must not repair or loosen an unrelated student visibility boundary.
DO $$
BEGIN
  IF position('publish_status' in pg_get_viewdef('public.quiz_questions_live'::regclass, true)) = 0
     OR position('publish_ready_with_verified_repair' in pg_get_viewdef('public.quiz_questions_live'::regclass, true)) = 0
  THEN
    RAISE EXCEPTION 'Apply the reviewed publication view migration before calculator sources';
  END IF;
END $$;

ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS calculator_sources jsonb;

COMMENT ON COLUMN public.quiz_questions.calculator_sources IS
  'Optional reviewed ExplicitSource[] for exact calculator transfer. No inferred figure coordinates.';

-- Keep the reviewed publication boundary and existing view columns; append
-- only the new calculator source column, even when the base table has drifted.
DO $$
DECLARE existing_columns text;
BEGIN
  SELECT string_agg(format('%I', attname), ', ' ORDER BY attnum)
    INTO existing_columns
    FROM pg_attribute
   WHERE attrelid = 'public.quiz_questions_live'::regclass
     AND attnum > 0 AND NOT attisdropped
     AND attname <> 'calculator_sources';
  IF existing_columns IS NULL THEN RAISE EXCEPTION 'Live question view has no columns'; END IF;
  EXECUTE format(
    'CREATE OR REPLACE VIEW public.quiz_questions_live AS SELECT %s, calculator_sources FROM public.quiz_questions WHERE is_live = true AND publish_status IN (''publish_ready'', ''publish_ready_with_verified_repair'')',
    existing_columns
  );
END $$;

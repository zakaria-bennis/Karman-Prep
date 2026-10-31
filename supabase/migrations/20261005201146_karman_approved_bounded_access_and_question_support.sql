-- Recorded from production supabase_migrations.schema_migrations (20261005201146).
-- Applied by hand on 20261005; this file makes the repo match production history. Do not edit.
-- REVIEW ONLY; scoped recovery verified. Explicit production-change approval required.
-- Target yyocjxvrakuhnvepaevh. No question import, publication, existing-row edit,
-- view/selector replacement, global default changes, user role change or deployment.
-- Re-snapshot ACLs, memberships and callable paths at action time.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DO $guard$
DECLARE observed jsonb;
BEGIN
  SELECT jsonb_build_object('question_count',count(*),'question_content_md5',md5(string_agg((to_jsonb(q)-ARRAY['source_provider','source_identity_required','source_document_id','source_provider_version_id','source_version','source_section','source_module','source_question_number','source_occurrence','source_regions'])::text,',' ORDER BY id)),'legacy_live_count',count(*) FILTER(WHERE is_live),'legacy_live_ids_md5',md5(string_agg(id::text,',' ORDER BY id) FILTER(WHERE is_live)),'choices_count',(SELECT count(*) FROM public.answer_choices),'choices_content_md5',(SELECT md5(string_agg((to_jsonb(a)-'choice_table_data')::text,',' ORDER BY id)) FROM public.answer_choices a),'answer_key_count',(SELECT count(*) FROM public.answer_key_entries),'answer_key_content_md5',(SELECT md5(string_agg((to_jsonb(a)-ARRAY['source_version','source_occurrence'])::text,',' ORDER BY id)) FROM public.answer_key_entries a)) FROM public.quiz_questions q INTO observed;
  IF observed IS DISTINCT FROM '{"choices_count":3012,"question_count":845,"answer_key_count":192,"legacy_live_count":162,"choices_content_md5":"a2868d84fdcb22efeb4a36dbaad850a4","legacy_live_ids_md5":"1188f1de598e49ee9f09707e8cc5a0ee","question_content_md5":"38940fa70b0e281cfa7a92716e4ab813","answer_key_content_md5":"22e2c3519b524d9a06c69990c6e71034"}'::jsonb THEN
    RAISE EXCEPTION 'Question/key/choice fingerprint changed since reviewed snapshot; stop and re-review';
  END IF;
  PERFORM set_config('karman_review.before_integrity',observed::text,true);
END;
$guard$;
REVOKE ALL PRIVILEGES ON TABLE
  public.answer_key_entries,
  public.quiz_questions_live,
  public.quiz_questions_phase3_signals,
  public.quiz_questions_phase5_signals,
  public.quiz_questions_phase6_signals,
  public.quiz_questions_phase7_signals
FROM PUBLIC, anon, authenticated;

-- Additive source identity for new, reviewed batches. Legacy rows remain
-- null and cannot be joined to a corrected answer key by position.
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS source_provider TEXT,
  ADD COLUMN IF NOT EXISTS source_identity_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source_document_id TEXT,
  ADD COLUMN IF NOT EXISTS source_provider_version_id TEXT,
  ADD COLUMN IF NOT EXISTS source_version TEXT,
  ADD COLUMN IF NOT EXISTS source_section TEXT,
  ADD COLUMN IF NOT EXISTS source_module TEXT,
  ADD COLUMN IF NOT EXISTS source_question_number INT,
  ADD COLUMN IF NOT EXISTS source_occurrence INT,
  ADD COLUMN IF NOT EXISTS source_regions JSONB;

ALTER TABLE public.answer_key_entries
  ADD COLUMN IF NOT EXISTS source_version TEXT,
  ADD COLUMN IF NOT EXISTS source_occurrence INT;

-- Repeat/retry of the same identified question is idempotent, while a
-- corrected source version can coexist with the older version. Rows
-- with incomplete identity are excluded; import must keep them draft.
CREATE UNIQUE INDEX IF NOT EXISTS quiz_questions_source_identity_unique
  ON public.quiz_questions (
    source_version, source_section, source_module,
    source_question_number, source_occurrence
  )
  WHERE source_version IS NOT NULL AND source_section IS NOT NULL
    AND source_module IS NOT NULL AND source_question_number IS NOT NULL
    AND source_occurrence IS NOT NULL;

ALTER TABLE public.quiz_questions
  ADD CONSTRAINT quiz_questions_source_identity_complete
  CHECK (
    source_version IS NULL OR (
      source_version ~ '^[a-f0-9]{64}$'
      AND source_section IN ('reading', 'math')
      AND source_module IN ('M1', 'M2')
      AND source_question_number > 0
      AND source_occurrence > 0
    )
  ) NOT VALID;

-- A choice may have a native table in addition to its required text description.
-- NULL keeps every existing choice and import path unchanged.
ALTER TABLE public.answer_choices
  ADD COLUMN choice_table_data jsonb;

ALTER TABLE public.answer_choices
  ADD CONSTRAINT answer_choices_table_data_shape
  CHECK (
    choice_table_data IS NULL
    OR (
      jsonb_typeof(choice_table_data) = 'object'
      AND choice_table_data ? 'rows'
      AND jsonb_typeof(choice_table_data -> 'rows') = 'array'
    )
  );

COMMENT ON COLUMN public.answer_choices.choice_table_data IS
  'Optional native table for this answer choice. choice_text remains the accessible text description; raw_choice_text retains source text.';

DO $guard$
DECLARE observed jsonb;
BEGIN
  SELECT jsonb_build_object('question_count',count(*),'question_content_md5',md5(string_agg((to_jsonb(q)-ARRAY['source_provider','source_identity_required','source_document_id','source_provider_version_id','source_version','source_section','source_module','source_question_number','source_occurrence','source_regions'])::text,',' ORDER BY id)),'legacy_live_count',count(*) FILTER(WHERE is_live),'legacy_live_ids_md5',md5(string_agg(id::text,',' ORDER BY id) FILTER(WHERE is_live)),'choices_count',(SELECT count(*) FROM public.answer_choices),'choices_content_md5',(SELECT md5(string_agg((to_jsonb(a)-'choice_table_data')::text,',' ORDER BY id)) FROM public.answer_choices a),'answer_key_count',(SELECT count(*) FROM public.answer_key_entries),'answer_key_content_md5',(SELECT md5(string_agg((to_jsonb(a)-ARRAY['source_version','source_occurrence'])::text,',' ORDER BY id)) FROM public.answer_key_entries a)) FROM public.quiz_questions q INTO observed;
  IF observed IS DISTINCT FROM current_setting('karman_review.before_integrity')::jsonb THEN
    RAISE EXCEPTION 'Existing question, key, choice or legacy-live membership changed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(ARRAY['public.answer_key_entries','public.quiz_questions_live','public.quiz_questions_phase3_signals','public.quiz_questions_phase5_signals','public.quiz_questions_phase6_signals','public.quiz_questions_phase7_signals']) t
    CROSS JOIN unnest(ARRAY['anon','authenticated']) r
    CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p
    WHERE has_table_privilege(r,t,p)
       OR CASE WHEN p IN ('SELECT','INSERT','UPDATE','REFERENCES') THEN has_any_column_privilege(r,t,p) ELSE false END
  ) THEN RAISE EXCEPTION 'Residual effective anonymous/authenticated access; rollback transaction'; END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(ARRAY['public.answer_key_entries','public.quiz_questions_live','public.quiz_questions_phase3_signals','public.quiz_questions_phase5_signals','public.quiz_questions_phase6_signals','public.quiz_questions_phase7_signals']) t
    CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p
    WHERE NOT has_table_privilege('service_role',t,p)
  ) THEN RAISE EXCEPTION 'Service-role scoped privileges changed; rollback transaction'; END IF;
END;
$guard$;
COMMIT;

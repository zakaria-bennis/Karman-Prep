-- Recorded from production supabase_migrations.schema_migrations (20261005203921).
-- Applied by hand on 20261005; this file makes the repo match production history. Do not edit.
-- REVIEW ONLY: exact public-launch security proposal. NOT approved or applied.
-- Eight internal relation revokes plus users UPDATE restriction; no role/data edits.
-- Recheck exact ACL/column ACL/owner/membership snapshots before approval/application.
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
  public.explanation_qa_records,
  public.failed_emails,
  public.grader_runs,
  public.math_repair_records,
  public.rejected_questions,
  public.source_assets,
  public.active_cohort_for_student,
  public.tutor_earnings_summary
FROM PUBLIC, anon, authenticated;

REVOKE UPDATE ON TABLE public.users FROM PUBLIC, anon, authenticated;

DO $guard$
DECLARE observed jsonb;
BEGIN
  SELECT jsonb_build_object('question_count',count(*),'question_content_md5',md5(string_agg((to_jsonb(q)-ARRAY['source_provider','source_identity_required','source_document_id','source_provider_version_id','source_version','source_section','source_module','source_question_number','source_occurrence','source_regions'])::text,',' ORDER BY id)),'legacy_live_count',count(*) FILTER(WHERE is_live),'legacy_live_ids_md5',md5(string_agg(id::text,',' ORDER BY id) FILTER(WHERE is_live)),'choices_count',(SELECT count(*) FROM public.answer_choices),'choices_content_md5',(SELECT md5(string_agg((to_jsonb(a)-'choice_table_data')::text,',' ORDER BY id)) FROM public.answer_choices a),'answer_key_count',(SELECT count(*) FROM public.answer_key_entries),'answer_key_content_md5',(SELECT md5(string_agg((to_jsonb(a)-ARRAY['source_version','source_occurrence'])::text,',' ORDER BY id)) FROM public.answer_key_entries a)) FROM public.quiz_questions q INTO observed;
  IF observed IS DISTINCT FROM current_setting('karman_review.before_integrity')::jsonb THEN
    RAISE EXCEPTION 'Existing question, key, choice or legacy-live membership changed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(ARRAY['public.explanation_qa_records','public.failed_emails','public.grader_runs','public.math_repair_records','public.rejected_questions','public.source_assets','public.active_cohort_for_student','public.tutor_earnings_summary']) t
    CROSS JOIN unnest(ARRAY['anon','authenticated']) r
    CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p
    WHERE has_table_privilege(r,t,p)
       OR CASE WHEN p IN ('SELECT','INSERT','UPDATE','REFERENCES') THEN has_any_column_privilege(r,t,p) ELSE false END
  ) THEN RAISE EXCEPTION 'Residual effective anonymous/authenticated access; rollback transaction'; END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(ARRAY['public.explanation_qa_records','public.failed_emails','public.grader_runs','public.math_repair_records','public.rejected_questions','public.source_assets','public.active_cohort_for_student','public.tutor_earnings_summary']) t
    CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p
    WHERE NOT has_table_privilege('service_role',t,p)
  ) THEN RAISE EXCEPTION 'Service-role scoped privileges changed; rollback transaction'; END IF;
  IF has_table_privilege('anon','public.users','UPDATE')
     OR has_any_column_privilege('anon','public.users','UPDATE')
     OR has_table_privilege('authenticated','public.users','UPDATE')
     OR has_any_column_privilege('authenticated','public.users','UPDATE') THEN
    RAISE EXCEPTION 'Residual public-role users UPDATE; rollback transaction';
  END IF;
  IF NOT has_table_privilege('service_role','public.users','UPDATE')
     OR NOT has_table_privilege('anon','public.users','SELECT')
     OR NOT has_table_privilege('authenticated','public.users','SELECT') THEN
    RAISE EXCEPTION 'Required existing user access changed; rollback transaction';
  END IF;
END;
$guard$;
COMMIT;

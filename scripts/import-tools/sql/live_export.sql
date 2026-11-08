-- kimport live export: read-only, changes nothing.
--
-- Returns ONE JSON object so the connector result can be saved straight to a
-- file and passed to `kimport-cli.py sweep|backfill|publish --export <file>`:
--   {"exported_at", "row_count", "fingerprint", "rows": [one object per
--   quiz_questions row, live or not]}
-- The fingerprint is computed in the same statement as the rows; publish.sql
-- recomputes it before any change and stops if the bank changed since.
-- Keep the fingerprint expression identical to kimport.export.FINGERPRINT_SQL.
--
-- The table's format column is answer_format (enum multiple_choice /
-- numeric_entry); it is exported under the name question_format.
--
-- Figure columns the comparison key cannot represent (image_url,
-- image_storage_path, figure_svg, figure_graph_data, figure_chart_data,
-- figure_geometry_data, and answer_choices.choice_table_data) are exported as
-- `true` when set and null otherwise: only their presence is needed
-- (kimport.keys.is_unkeyable), and it keeps the file small. The passage
-- columns are exported in full; kimport puts them in front of question_text
-- for the key (kimport.keys.record_text).
--
-- comparison_key is exported only once the column exists (migration
-- 20261021000000), read through to_jsonb(q) so this query runs before and after
-- it. `kimport-cli.py publish` refuses an export without the field. (The key
-- test uses `->` IS NOT NULL rather than the jsonb `?` operator, which some
-- SQL clients treat as a bind placeholder.)
SELECT jsonb_build_object(
  'exported_at', now(),
  'row_count', (SELECT count(*) FROM public.quiz_questions),
  'fingerprint', (SELECT md5(coalesce(string_agg(q.id::text||':'||coalesce(q.content_hash_v2::text,'')||':'||coalesce(q.publish_status::text,'')||':'||coalesce(q.import_status::text,'')||':'||coalesce(to_jsonb(q)->>'comparison_key',''), ',' ORDER BY q.id),'')) FROM public.quiz_questions q),
  'rows', (SELECT coalesce(jsonb_agg(
         CASE WHEN x.has_comparison_key_column THEN to_jsonb(x) - 'has_comparison_key_column'
              ELSE to_jsonb(x) - 'has_comparison_key_column' - 'comparison_key' END
         ORDER BY x.created_at, x.id), '[]'::jsonb)
FROM (
  SELECT
    q.id,
    q.passage_intro,
    q.passage,
    q.passage_a,
    q.passage_b,
    q.question_text,
    q.correct_answer,
    q.answer_format::text AS question_format,
    q.figure_kind,
    q.figure_table_data,
    CASE WHEN q.image_url IS NOT NULL THEN true END AS image_url,
    CASE WHEN q.image_storage_path IS NOT NULL THEN true END AS image_storage_path,
    CASE WHEN q.figure_svg IS NOT NULL THEN true END AS figure_svg,
    CASE WHEN q.figure_graph_data IS NOT NULL THEN true END AS figure_graph_data,
    CASE WHEN q.figure_chart_data IS NOT NULL THEN true END AS figure_chart_data,
    CASE WHEN q.figure_geometry_data IS NOT NULL THEN true END AS figure_geometry_data,
    q.publish_status,
    q.import_status,
    q.import_flag_reason,
    q.is_live,
    q.archived_at,
    q.source_version,
    q.source_section,
    q.source_module,
    q.source_question_number,
    q.content_hash_v2,
    q.created_at,
    to_jsonb(q) -> 'comparison_key' AS comparison_key,
    (to_jsonb(q) -> 'comparison_key') IS NOT NULL AS has_comparison_key_column,
    (SELECT coalesce(jsonb_agg(jsonb_build_object('letter', c.letter, 'choice_text', c.choice_text,
                                                  'choice_table_data', CASE WHEN c.choice_table_data IS NOT NULL THEN true END)
                               ORDER BY c.letter), '[]'::jsonb)
       FROM public.answer_choices c
      WHERE c.question_id = q.id) AS choices,
    (SELECT k.raw_model_response
       FROM public.answer_key_entries k
      WHERE k.question_id = q.id
      ORDER BY k.created_at, k.id
      LIMIT 1) AS raw_model_response,
    (SELECT count(*)
       FROM public.answer_key_entries k
      WHERE k.question_id = q.id) AS answer_key_count
  FROM public.quiz_questions q
) x)
) AS export;

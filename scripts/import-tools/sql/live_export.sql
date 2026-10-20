-- kimport live export: read-only, changes nothing.
--
-- Returns ONE JSON value (an array with one object per quiz_questions row,
-- live or not) so the connector result can be saved straight to a file and
-- passed to `kimport-cli.py sweep --export <file>`.
--
-- The table's format column is answer_format (enum multiple_choice /
-- numeric_entry); it is exported under the name question_format.
--
-- comparison_key is exported only once the column exists (migration
-- 20261021000000), read through to_jsonb(q) so this query runs before and after
-- it. `kimport-cli.py publish` refuses an export without the field.
SELECT coalesce(jsonb_agg(
         CASE WHEN x.has_comparison_key_column THEN to_jsonb(x) - 'has_comparison_key_column'
              ELSE to_jsonb(x) - 'has_comparison_key_column' - 'comparison_key' END
         ORDER BY x.created_at, x.id), '[]'::jsonb) AS export
FROM (
  SELECT
    q.id,
    q.question_text,
    q.correct_answer,
    q.answer_format::text AS question_format,
    q.figure_kind,
    q.figure_table_data,
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
    to_jsonb(q) ? 'comparison_key' AS has_comparison_key_column,
    (SELECT coalesce(jsonb_agg(jsonb_build_object('letter', c.letter, 'choice_text', c.choice_text)
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
) x;

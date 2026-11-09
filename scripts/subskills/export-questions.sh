#!/usr/bin/env bash
# Exports the live, servable questions from the LOCAL database (read only) for the sub-skill
# map: id, catalog skill, question text, passage, the correct choice's text and whether it has a
# figure. Never point this at production. Output: one JSON array on stdout.
#   scripts/subskills/export-questions.sh > /tmp/questions.json
#   npx tsx scripts/subskills/build-map.ts /tmp/questions.json
set -euo pipefail
CONTAINER="${KARMAN_DB_CONTAINER:-supabase_db_karman-local}"
docker exec -i "$CONTAINER" psql -U postgres -At -q -v ON_ERROR_STOP=1 <<'SQL'
set default_transaction_read_only = on;
with tagged as (
  select distinct on (k.question_id) k.question_id,
    coalesce(k.raw_model_response->'approved_tags'->>'catalog_skill_id',
             k.raw_model_response->'evidence'->'approved_tags'->>'catalog_skill_id') as skill
  from answer_key_entries k
  where k.question_id is not null
  order by k.question_id, k.id
)
select coalesce(json_agg(json_build_object(
  'id', q.id,
  'skill', t.skill,
  'text', coalesce(q.question_text, ''),
  'passage', left(coalesce(q.passage, q.passage_intro, ''), 400),
  'correct', coalesce((select c.choice_text from answer_choices c
                       where c.question_id = q.id and c.is_correct limit 1), q.correct_answer, ''),
  'figure', (q.figure_kind is not null or q.image_url is not null or q.figure_table_data is not null
             or q.figure_graph_data is not null or q.figure_chart_data is not null)
) order by q.id), '[]')
from quiz_questions q join tagged t on t.question_id = q.id
where q.is_live and q.publish_status in ('publish_ready', 'publish_ready_with_verified_repair')
  and t.skill is not null;
SQL

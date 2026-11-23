-- Bank stream (2026-11-22). The student pool reader (src/lib/supabase/queries/catalog-question-pool.ts)
-- filters answer_key_entries on two JSON paths of raw_model_response with no index. Since the
-- generated questions joined tonight (about 40,000 rows, 103 MB), the first page of a skill's pool
-- takes up to about 7 seconds and sometimes times out ("Reviewed skill questions could not be
-- loaded"). These two expression indexes match the reader's .or() filter exactly, so Postgres can
-- answer it with a bitmap OR of two small index scans. Additive only; no data changes.
create index if not exists answer_key_entries_catalog_skill_idx
  on public.answer_key_entries ((raw_model_response -> 'approved_tags' ->> 'catalog_skill_id'));

create index if not exists answer_key_entries_generated_catalog_skill_idx
  on public.answer_key_entries
  ((raw_model_response -> 'evidence' -> 'approved_tags' ->> 'catalog_skill_id'));

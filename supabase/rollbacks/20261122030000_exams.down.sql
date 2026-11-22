-- Undo 20261122030000_exams.sql. Drops only what it added. Before running it, put held questions back into
-- practice: update public.quiz_questions set pool = 'practice' where pool in ('test', 'tryout');
drop function if exists public.exam_start_with_pass(text, smallint, text, jsonb);
drop index if exists public.quiz_questions_practice_plan_idx;
alter table public.quiz_questions drop column if exists practice_plan;
drop table if exists public.exam_responses;
drop table if exists public.exam_sittings;
drop table if exists public.exam_form_items;
drop table if exists public.exam_forms;
-- after this, also: delete from supabase_migrations.schema_migrations where version = '20261122030000';

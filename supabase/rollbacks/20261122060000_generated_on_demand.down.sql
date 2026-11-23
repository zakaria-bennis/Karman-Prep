-- Rollback of 20261122060000_generated_on_demand.sql. Reported questions stay hidden.
drop view if exists public.skill72_origin_counts;
drop table if exists public.generated_question_reports;
drop table if exists public.admin_switches;
drop index if exists public.quiz_questions_generated_stable_idx;

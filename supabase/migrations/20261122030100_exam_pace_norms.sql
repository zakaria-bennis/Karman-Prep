-- Expected time per question in the full-length exams' pacing debrief (founder, 2026-11-22 round 2): per
-- skill (the 72) and difficulty band, learned from real students' exam answers. A row is written only once
-- 30 answers back it (src/lib/exams/calibration.ts, after each finished exam); until then the seeds in
-- src/lib/exams/pacing.ts are used. Additive: one small table (at most 72 x 3 rows). Service role only.
-- Rollback: supabase/rollbacks/20261122030100_exam_pace_norms.down.sql

create table if not exists public.exam_pace_norms (
  skill_id text not null,
  band text not null check (band in ('easy', 'medium', 'hard')),
  median_seconds integer not null check (median_seconds between 1 and 3600),
  answers integer not null check (answers >= 0),
  updated_at timestamptz not null default now(),
  primary key (skill_id, band)
);

alter table public.exam_pace_norms enable row level security;
revoke all on public.exam_pace_norms from public, anon, authenticated;
grant select, insert, update, delete on public.exam_pace_norms to service_role;

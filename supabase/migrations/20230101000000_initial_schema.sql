-- ============================================================
-- 20230101000000_initial_schema.sql
--
-- Foundational tables for the Karman Prep app. This migration was
-- previously bootstrapped manually via `supabase/schema.sql` (run
-- once in the Supabase SQL Editor). It is now wrapped as the
-- earliest-timestamp migration so:
--
--   1. `supabase start` (used by CI in .github/workflows/e2e.yml)
--      can reproduce the database from scratch.
--   2. `npm run db:push` against prod is a safe no-op — every
--      statement is idempotent (tables guarded by IF NOT EXISTS,
--      policies dropped-then-recreated, seeds via ON CONFLICT).
--
-- If you want the readable narrative version, see
-- `supabase/schema.sql`. This file is the executable source of
-- truth.
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS
-- Synced from Clerk on first sign-in via /api/auth/sync-user
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id          uuid primary key default uuid_generate_v4(),
  clerk_id    text not null unique,
  role        text not null default 'student' check (role in ('student', 'tutor', 'parent')),
  email       text not null,
  created_at  timestamptz not null default now(),
  sat_test_date date
);

-- ============================================================
-- SUBSCRIPTIONS
-- Managed by Stripe webhooks in /api/stripe/webhook
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 text not null,   -- Clerk user ID
  stripe_customer_id      text not null,
  stripe_subscription_id  text not null unique,
  tier                    text not null check (tier in ('group', 'small_group', 'private', 'elite', 'annual')),
  status                  text not null check (status in ('active', 'trialing', 'canceled', 'past_due', 'incomplete')),
  trial_end               timestamptz,
  created_at              timestamptz not null default now()
);

-- ============================================================
-- CONCEPTS
-- SAT concept nodes for the curriculum graph (D3.js)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.concepts (
  id                 uuid primary key default uuid_generate_v4(),
  title              text not null,
  domain             text not null check (domain in ('algebra', 'advanced_math', 'geometry', 'data_analysis', 'reading_writing')),
  difficulty         int  not null check (difficulty between 1 and 3),
  prerequisite_ids   uuid[] not null default '{}',
  node_position_x    float not null default 0,
  node_position_y    float not null default 0
);

-- ============================================================
-- PROGRESS
-- Tracks each student's status per concept
-- ============================================================
CREATE TABLE IF NOT EXISTS public.progress (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.users(id) on delete cascade,
  concept_id   uuid not null references public.concepts(id) on delete cascade,
  status       text not null default 'locked' check (status in ('locked', 'available', 'in_progress', 'mastered')),
  quiz_score   int  check (quiz_score between 0 and 100),
  last_visited timestamptz,
  unique (user_id, concept_id)
);

-- ============================================================
-- DIAGNOSTIC RESULTS
-- One row per diagnostic attempt
-- ============================================================
CREATE TABLE IF NOT EXISTS public.diagnostic_results (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.users(id) on delete cascade,
  taken_at         timestamptz not null default now(),
  score_range_low  int  not null check (score_range_low between 200 and 800),
  score_range_high int  not null check (score_range_high between 200 and 800),
  domain_scores    jsonb not null default '{}',
  weak_concepts    uuid[] not null default '{}'
);

-- ============================================================
-- QUESTIONS
-- Practice and diagnostic questions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.questions (
  id            uuid primary key default uuid_generate_v4(),
  concept_id    uuid references public.concepts(id) on delete set null,
  question_text text not null,
  options       text[] not null,
  correct_answer text not null,
  difficulty    int  not null check (difficulty between 1 and 3),
  domain        text not null check (domain in ('algebra', 'advanced_math', 'geometry', 'data_analysis', 'reading_writing'))
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Students can only see their own data.
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;

-- Users: can only read/update their own row.
-- DROP POLICY IF EXISTS first because PG 15 doesn't support
-- CREATE POLICY IF NOT EXISTS — this drop-then-create dance is the
-- canonical idempotent pattern (matches existing migrations like
-- 20260423002208_learn_portal.sql).
DROP POLICY IF EXISTS "users_self_read" ON public.users;
CREATE POLICY "users_self_read" ON public.users FOR SELECT
  USING (clerk_id = auth.jwt() ->> 'sub');

DROP POLICY IF EXISTS "users_self_update" ON public.users;
CREATE POLICY "users_self_update" ON public.users FOR UPDATE
  USING (clerk_id = auth.jwt() ->> 'sub');

-- Subscriptions: tied to clerk_id in user_id column
DROP POLICY IF EXISTS "subs_self_read" ON public.subscriptions;
CREATE POLICY "subs_self_read" ON public.subscriptions FOR SELECT
  USING (user_id = auth.jwt() ->> 'sub');

-- Progress: tied to users.id via join
DROP POLICY IF EXISTS "progress_self_read" ON public.progress;
CREATE POLICY "progress_self_read" ON public.progress FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS "progress_self_write" ON public.progress;
CREATE POLICY "progress_self_write" ON public.progress FOR ALL
  USING (user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub'));

-- Diagnostic results
DROP POLICY IF EXISTS "diag_self_read" ON public.diagnostic_results;
CREATE POLICY "diag_self_read" ON public.diagnostic_results FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub'));

-- Concepts: public read (all students can see the curriculum)
DROP POLICY IF EXISTS "concepts_public_read" ON public.concepts;
CREATE POLICY "concepts_public_read" ON public.concepts FOR SELECT
  USING (true);

-- Questions: public read
DROP POLICY IF EXISTS "questions_public_read" ON public.questions;
CREATE POLICY "questions_public_read" ON public.questions FOR SELECT
  USING (true);

-- ============================================================
-- SEED: Core SAT Math Concepts (15 initial concepts)
-- ============================================================
INSERT INTO public.concepts (id, title, domain, difficulty, node_position_x, node_position_y) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Linear Equations',           'algebra',        1, 100, 100),
  ('00000000-0000-0000-0000-000000000002', 'Systems of Equations',       'algebra',        2, 200, 100),
  ('00000000-0000-0000-0000-000000000003', 'Inequalities',               'algebra',        2, 300, 100),
  ('00000000-0000-0000-0000-000000000004', 'Linear Functions & Graphs',  'algebra',        3, 400, 100),
  ('00000000-0000-0000-0000-000000000005', 'Quadratic Equations',        'advanced_math',  1, 100, 250),
  ('00000000-0000-0000-0000-000000000006', 'Polynomial Operations',      'advanced_math',  2, 200, 250),
  ('00000000-0000-0000-0000-000000000007', 'Exponential Functions',      'advanced_math',  2, 300, 250),
  ('00000000-0000-0000-0000-000000000008', 'Rational Expressions',       'advanced_math',  3, 400, 250),
  ('00000000-0000-0000-0000-000000000009', 'Triangle Geometry',          'geometry',       1, 100, 400),
  ('00000000-0000-0000-0000-000000000010', 'Circle Geometry',            'geometry',       2, 200, 400),
  ('00000000-0000-0000-0000-000000000011', 'Coordinate Geometry',        'geometry',       2, 300, 400),
  ('00000000-0000-0000-0000-000000000012', 'Trigonometry',               'geometry',       3, 400, 400),
  ('00000000-0000-0000-0000-000000000013', 'Statistics & Mean/Median',   'data_analysis',  1, 100, 550),
  ('00000000-0000-0000-0000-000000000014', 'Probability',                'data_analysis',  2, 200, 550),
  ('00000000-0000-0000-0000-000000000015', 'Data Interpretation',        'data_analysis',  2, 300, 550)
ON CONFLICT (id) DO NOTHING;

-- Update prerequisite chains (idempotent — re-applying writes the
-- same array).
UPDATE public.concepts SET prerequisite_ids = '{"00000000-0000-0000-0000-000000000001"}' WHERE id = '00000000-0000-0000-0000-000000000002';
UPDATE public.concepts SET prerequisite_ids = '{"00000000-0000-0000-0000-000000000001"}' WHERE id = '00000000-0000-0000-0000-000000000003';
UPDATE public.concepts SET prerequisite_ids = '{"00000000-0000-0000-0000-000000000002","00000000-0000-0000-0000-000000000003"}' WHERE id = '00000000-0000-0000-0000-000000000004';
UPDATE public.concepts SET prerequisite_ids = '{"00000000-0000-0000-0000-000000000005"}' WHERE id = '00000000-0000-0000-0000-000000000006';
UPDATE public.concepts SET prerequisite_ids = '{"00000000-0000-0000-0000-000000000006"}' WHERE id = '00000000-0000-0000-0000-000000000007';
UPDATE public.concepts SET prerequisite_ids = '{"00000000-0000-0000-0000-000000000007"}' WHERE id = '00000000-0000-0000-0000-000000000008';
UPDATE public.concepts SET prerequisite_ids = '{"00000000-0000-0000-0000-000000000009"}' WHERE id = '00000000-0000-0000-0000-000000000010';
UPDATE public.concepts SET prerequisite_ids = '{"00000000-0000-0000-0000-000000000010"}' WHERE id = '00000000-0000-0000-0000-000000000011';
UPDATE public.concepts SET prerequisite_ids = '{"00000000-0000-0000-0000-000000000011"}' WHERE id = '00000000-0000-0000-0000-000000000012';
UPDATE public.concepts SET prerequisite_ids = '{"00000000-0000-0000-0000-000000000013"}' WHERE id = '00000000-0000-0000-0000-000000000014';
UPDATE public.concepts SET prerequisite_ids = '{"00000000-0000-0000-0000-000000000014"}' WHERE id = '00000000-0000-0000-0000-000000000015';

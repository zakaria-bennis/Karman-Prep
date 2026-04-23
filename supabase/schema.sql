-- ============================================================
-- Strata — Supabase Database Schema
-- Run this in your Supabase SQL Editor (Project → SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS
-- Synced from Clerk on first sign-in via /api/auth/sync-user
-- ============================================================
create table if not exists public.users (
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
create table if not exists public.subscriptions (
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
create table if not exists public.concepts (
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
create table if not exists public.progress (
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
create table if not exists public.diagnostic_results (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.users(id) on delete cascade,
  taken_at         timestamptz not null default now(),
  score_range_low  int  not null check (score_range_low between 200 and 800),
  score_range_high int  not null check (score_range_high between 200 and 800),
  domain_scores    jsonb not null default '{}',  -- { algebra: 70, advanced_math: 50, ... }
  weak_concepts    uuid[] not null default '{}'
);

-- ============================================================
-- QUESTIONS
-- Practice and diagnostic questions
-- ============================================================
create table if not exists public.questions (
  id            uuid primary key default uuid_generate_v4(),
  concept_id    uuid references public.concepts(id) on delete set null,
  question_text text not null,
  options       text[] not null,  -- Always 4 options
  correct_answer text not null,
  difficulty    int  not null check (difficulty between 1 and 3),
  domain        text not null check (domain in ('algebra', 'advanced_math', 'geometry', 'data_analysis', 'reading_writing'))
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Students can only see their own data.
-- ============================================================

alter table public.users enable row level security;
alter table public.subscriptions enable row level security;
alter table public.progress enable row level security;
alter table public.diagnostic_results enable row level security;
alter table public.questions enable row level security;
alter table public.concepts enable row level security;

-- Users: can only read/update their own row
create policy "users_self_read"   on public.users for select using (clerk_id = auth.jwt() ->> 'sub');
create policy "users_self_update" on public.users for update using (clerk_id = auth.jwt() ->> 'sub');

-- Subscriptions: tied to clerk_id in user_id column
create policy "subs_self_read" on public.subscriptions for select
  using (user_id = auth.jwt() ->> 'sub');

-- Progress: tied to users.id via join
create policy "progress_self_read" on public.progress for select
  using (user_id in (select id from public.users where clerk_id = auth.jwt() ->> 'sub'));

create policy "progress_self_write" on public.progress for all
  using (user_id in (select id from public.users where clerk_id = auth.jwt() ->> 'sub'));

-- Diagnostic results
create policy "diag_self_read" on public.diagnostic_results for select
  using (user_id in (select id from public.users where clerk_id = auth.jwt() ->> 'sub'));

-- Concepts: public read (all students can see the curriculum)
create policy "concepts_public_read" on public.concepts for select using (true);

-- Questions: public read
create policy "questions_public_read" on public.questions for select using (true);

-- ============================================================
-- SEED: Core SAT Math Concepts (15 initial concepts)
-- ============================================================
insert into public.concepts (id, title, domain, difficulty, node_position_x, node_position_y) values
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
on conflict (id) do nothing;

-- Update prerequisite chains
update public.concepts set prerequisite_ids = '{"00000000-0000-0000-0000-000000000001"}' where id = '00000000-0000-0000-0000-000000000002';
update public.concepts set prerequisite_ids = '{"00000000-0000-0000-0000-000000000001"}' where id = '00000000-0000-0000-0000-000000000003';
update public.concepts set prerequisite_ids = '{"00000000-0000-0000-0000-000000000002","00000000-0000-0000-0000-000000000003"}' where id = '00000000-0000-0000-0000-000000000004';
update public.concepts set prerequisite_ids = '{"00000000-0000-0000-0000-000000000005"}' where id = '00000000-0000-0000-0000-000000000006';
update public.concepts set prerequisite_ids = '{"00000000-0000-0000-0000-000000000006"}' where id = '00000000-0000-0000-0000-000000000007';
update public.concepts set prerequisite_ids = '{"00000000-0000-0000-0000-000000000007"}' where id = '00000000-0000-0000-0000-000000000008';
update public.concepts set prerequisite_ids = '{"00000000-0000-0000-0000-000000000009"}' where id = '00000000-0000-0000-0000-000000000010';
update public.concepts set prerequisite_ids = '{"00000000-0000-0000-0000-000000000010"}' where id = '00000000-0000-0000-0000-000000000011';
update public.concepts set prerequisite_ids = '{"00000000-0000-0000-0000-000000000011"}' where id = '00000000-0000-0000-0000-000000000012';
update public.concepts set prerequisite_ids = '{"00000000-0000-0000-0000-000000000013"}' where id = '00000000-0000-0000-0000-000000000014';
update public.concepts set prerequisite_ids = '{"00000000-0000-0000-0000-000000000014"}' where id = '00000000-0000-0000-0000-000000000015';

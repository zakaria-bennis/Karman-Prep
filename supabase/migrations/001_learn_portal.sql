-- ============================================================
-- Strata Learn Portal — Database Migration
-- Run this SQL in your Supabase SQL editor or via CLI.
-- ============================================================

-- ── Per-student node completion status ──────────────────────
-- Tracks whether each student has locked / unlocked / mastered
-- each node in the Learn constellation map.
-- Node IDs match CurriculumNode.id in src/data/curriculum.ts
-- (e.g. 'rw-00', 'ma-15').

CREATE TABLE IF NOT EXISTS learn_node_status (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT        NOT NULL,          -- Clerk user ID
  node_id      TEXT        NOT NULL,          -- e.g. 'rw-00'
  status       TEXT        NOT NULL DEFAULT 'locked'
               CHECK (status IN ('locked', 'available', 'in_progress', 'mastered')),
  score        SMALLINT    CHECK (score >= 0 AND score <= 100),
  attempts     SMALLINT    DEFAULT 0,
  completed_at TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT learn_node_status_user_node_key UNIQUE (user_id, node_id)
);

CREATE INDEX IF NOT EXISTS idx_learn_node_status_user
  ON learn_node_status (user_id);

CREATE INDEX IF NOT EXISTS idx_learn_node_status_node
  ON learn_node_status (node_id);

-- Row Level Security (application uses service-role key which bypasses RLS;
-- these policies are correct hygiene for future user-level auth)
ALTER TABLE learn_node_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON learn_node_status
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ── Per-student checkpoint attempt records ───────────────────
-- Tracks each attempt at a tier-end checkpoint quiz.

CREATE TABLE IF NOT EXISTS learn_checkpoint_attempts (
  id           UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT      NOT NULL,
  subject      TEXT      NOT NULL CHECK (subject IN ('reading', 'math')),
  tier         SMALLINT  NOT NULL CHECK (tier IN (1, 2, 3)),
  score        SMALLINT  NOT NULL CHECK (score >= 0 AND score <= 100),
  passed       BOOLEAN   NOT NULL DEFAULT false,
  attempted_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkpoint_attempts_user
  ON learn_checkpoint_attempts (user_id);

CREATE INDEX IF NOT EXISTS idx_checkpoint_attempts_subject_tier
  ON learn_checkpoint_attempts (subject, tier);

ALTER TABLE learn_checkpoint_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON learn_checkpoint_attempts
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

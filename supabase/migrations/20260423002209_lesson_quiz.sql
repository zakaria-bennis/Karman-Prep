-- ============================================================
-- Strata Learn Portal — Migration 002 · Lesson + Quiz System
--
-- Run this file in the Supabase SQL editor AFTER migration 001.
-- It is idempotent — safe to re-run.
--
-- NOTES ON IDENTIFIERS:
--   · Clerk provides user IDs as strings (e.g. "user_abc123…"), not UUIDs.
--     We follow the 001_learn_portal.sql convention: student_id / tutor_id /
--     resolved_by use TEXT to hold Clerk user IDs. Foreign-key enforcement to
--     auth.users is intentionally skipped — the Clerk middleware is the
--     source of truth for user existence.
--   · Curriculum nodes live in src/data/curriculum.ts with string IDs
--     (e.g. "rw-00", "ma-15"), not in a database table. node_id columns
--     are TEXT to match those IDs, again matching migration 001.
-- ============================================================

-- ── 1. Extend learn_node_status ──────────────────────────────
-- Add partially_complete as a valid status + watch_percentage column.

ALTER TABLE learn_node_status
  DROP CONSTRAINT IF EXISTS learn_node_status_status_check;

ALTER TABLE learn_node_status
  ADD CONSTRAINT learn_node_status_status_check
  CHECK (status IN ('locked', 'available', 'in_progress', 'partially_complete', 'mastered'));

ALTER TABLE learn_node_status
  ADD COLUMN IF NOT EXISTS watch_percentage SMALLINT DEFAULT 0
  CHECK (watch_percentage >= 0 AND watch_percentage <= 100);

ALTER TABLE learn_node_status
  ADD COLUMN IF NOT EXISTS last_quiz_score  SMALLINT
  CHECK (last_quiz_score >= 0 AND last_quiz_score <= 100);

ALTER TABLE learn_node_status
  ADD COLUMN IF NOT EXISTS best_quiz_score  SMALLINT
  CHECK (best_quiz_score >= 0 AND best_quiz_score <= 100);

ALTER TABLE learn_node_status
  ADD COLUMN IF NOT EXISTS consecutive_passes SMALLINT DEFAULT 0;

ALTER TABLE learn_node_status
  ADD COLUMN IF NOT EXISTS confidence_band TEXT
  CHECK (confidence_band IN ('struggling', 'developing', 'proficient', 'mastered'));

-- ── 2. ENUM types ────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE question_type AS ENUM (
    'multiple_choice', 'evidence_based', 'math_computation', 'math_word_problem'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE question_difficulty AS ENUM (
    'foundational', 'intermediate', 'advanced', 'mastery'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE quiz_subject AS ENUM ('reading', 'math');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE confidence_band AS ENUM (
    'struggling', 'developing', 'proficient', 'mastered'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE answer_letter AS ENUM ('A', 'B', 'C', 'D');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE override_status AS ENUM (
    'locked', 'unlocked', 'in_progress', 'partially_complete', 'mastered'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. quiz_questions ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quiz_questions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id                 TEXT NOT NULL,                     -- curriculum node ID (e.g. 'rw-00')
  question_text           TEXT NOT NULL,
  question_type           question_type NOT NULL,
  difficulty              question_difficulty NOT NULL,
  correct_answer          answer_letter NOT NULL,
  explanation_text        TEXT NOT NULL,
  explanation_per_choice  JSONB,                              -- { A: "…", B: "…", C: "…", D: "…" }
  subject                 quiz_subject NOT NULL,
  topic_cluster           TEXT NOT NULL,
  desmos_strategy         TEXT,
  display_order           INTEGER DEFAULT 0,                  -- admin drag-and-drop ordering
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),
  is_flagged              BOOLEAN DEFAULT false,
  flag_count              INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_node     ON quiz_questions (node_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_subject  ON quiz_questions (subject);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_flagged  ON quiz_questions (is_flagged) WHERE is_flagged = true;

ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON quiz_questions;
CREATE POLICY "Service role full access" ON quiz_questions
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── 4. answer_choices ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS answer_choices (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  letter       answer_letter NOT NULL,
  choice_text  TEXT NOT NULL,
  is_correct   BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT answer_choices_unique_letter UNIQUE (question_id, letter)
);

CREATE INDEX IF NOT EXISTS idx_answer_choices_question ON answer_choices (question_id);

ALTER TABLE answer_choices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON answer_choices;
CREATE POLICY "Service role full access" ON answer_choices
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── 5. quiz_attempts ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          TEXT NOT NULL,          -- Clerk user ID
  node_id             TEXT NOT NULL,          -- curriculum node ID
  attempt_number      INTEGER NOT NULL DEFAULT 1,
  score               INTEGER CHECK (score >= 0 AND score <= 100),
  questions_answered  INTEGER DEFAULT 0,
  questions_correct   INTEGER DEFAULT 0,
  confidence_band     confidence_band,
  started_at          TIMESTAMPTZ DEFAULT now(),
  completed_at        TIMESTAMPTZ,
  adaptive_path       JSONB DEFAULT '[]'::jsonb    -- [{question_id, difficulty, was_correct}, ...]
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON quiz_attempts (student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_node    ON quiz_attempts (node_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_node ON quiz_attempts (student_id, node_id);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON quiz_attempts;
CREATE POLICY "Service role full access" ON quiz_attempts
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── 6. question_responses ────────────────────────────────────

CREATE TABLE IF NOT EXISTS question_responses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id            UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id           UUID NOT NULL REFERENCES quiz_questions(id),
  student_answer        answer_letter NOT NULL,
  is_correct            BOOLEAN NOT NULL,
  difficulty_at_time    question_difficulty NOT NULL,
  response_time_seconds INTEGER DEFAULT 0,
  flagged               BOOLEAN DEFAULT false,
  flag_note             TEXT,
  answered_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_responses_attempt  ON question_responses (attempt_id);
CREATE INDEX IF NOT EXISTS idx_responses_question ON question_responses (question_id);

ALTER TABLE question_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON question_responses;
CREATE POLICY "Service role full access" ON question_responses
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── 7. flagged_questions ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS flagged_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  student_id    TEXT NOT NULL,              -- Clerk ID
  node_id       TEXT NOT NULL,
  flag_note     TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  resolved      BOOLEAN DEFAULT false,
  resolved_by   TEXT,                       -- Clerk ID of tutor/admin who resolved
  resolved_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_flagged_student   ON flagged_questions (student_id);
CREATE INDEX IF NOT EXISTS idx_flagged_unresolved ON flagged_questions (resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_flagged_question  ON flagged_questions (question_id);

ALTER TABLE flagged_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON flagged_questions;
CREATE POLICY "Service role full access" ON flagged_questions
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── 8. tutor_node_overrides ──────────────────────────────────

CREATE TABLE IF NOT EXISTS tutor_node_overrides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id        TEXT NOT NULL,          -- Clerk ID
  student_id      TEXT NOT NULL,
  node_id         TEXT NOT NULL,
  override_status override_status NOT NULL,
  locked_pathway  BOOLEAN DEFAULT false,
  reason          TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_overrides_student ON tutor_node_overrides (student_id);
CREATE INDEX IF NOT EXISTS idx_overrides_tutor   ON tutor_node_overrides (tutor_id);

ALTER TABLE tutor_node_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON tutor_node_overrides;
CREATE POLICY "Service role full access" ON tutor_node_overrides
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── 9. tutor_checkpoint_assignments ──────────────────────────
-- (checkpoints themselves are keyed by subject/tier — the existing
-- learn_checkpoint_attempts table from migration 001 already stores
-- per-attempt records. A synthetic checkpoint_id = subject::tier
-- string is used here as a text identifier.)

CREATE TABLE IF NOT EXISTS tutor_checkpoint_assignments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id       TEXT NOT NULL,
  student_id     TEXT NOT NULL,
  checkpoint_id  TEXT NOT NULL,          -- e.g. 'reading:1' or 'math:2'
  assigned_at    TIMESTAMPTZ DEFAULT now(),
  reason         TEXT,
  cooldown_override BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_checkpoint_assign_student ON tutor_checkpoint_assignments (student_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_assign_tutor   ON tutor_checkpoint_assignments (tutor_id);

ALTER TABLE tutor_checkpoint_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON tutor_checkpoint_assignments;
CREATE POLICY "Service role full access" ON tutor_checkpoint_assignments
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── 10. helper trigger: keep flag_count in sync ──────────────

CREATE OR REPLACE FUNCTION bump_question_flag_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE quiz_questions
       SET flag_count = flag_count + 1,
           is_flagged = true
     WHERE id = NEW.question_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.resolved AND NOT OLD.resolved THEN
    UPDATE quiz_questions q
       SET flag_count = GREATEST(flag_count - 1, 0),
           is_flagged = EXISTS (
             SELECT 1 FROM flagged_questions f
              WHERE f.question_id = q.id AND f.resolved = false
           )
     WHERE id = NEW.question_id;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bump_flag_count ON flagged_questions;
CREATE TRIGGER trg_bump_flag_count
  AFTER INSERT OR UPDATE ON flagged_questions
  FOR EACH ROW EXECUTE FUNCTION bump_question_flag_count();

-- ── Migration complete ───────────────────────────────────────

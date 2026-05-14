-- ============================================================
-- Strata — Migration 005 · Difficulty 1-7 + Numeric-entry questions
-- Run after 004. Idempotent.
-- ============================================================

-- 1. New enum: answer_format
DO $$ BEGIN
  CREATE TYPE question_format AS ENUM ('multiple_choice', 'numeric_entry');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. New columns on quiz_questions
ALTER TABLE quiz_questions
  ADD COLUMN IF NOT EXISTS answer_format question_format NOT NULL DEFAULT 'multiple_choice',
  ADD COLUMN IF NOT EXISTS numeric_tolerance NUMERIC,
  ADD COLUMN IF NOT EXISTS difficulty_level SMALLINT;

-- 3. Widen correct_answer to TEXT so numeric answers fit (MC still stores 'A'..'D')
ALTER TABLE quiz_questions
  ALTER COLUMN correct_answer TYPE TEXT USING correct_answer::TEXT;

-- 4. question_responses.student_answer likewise
ALTER TABLE question_responses
  ALTER COLUMN student_answer TYPE TEXT USING student_answer::TEXT;

-- 5. Backfill difficulty_level from legacy enum
UPDATE quiz_questions
  SET difficulty_level = CASE difficulty
    WHEN 'foundational' THEN 2
    WHEN 'intermediate' THEN 4
    WHEN 'advanced'     THEN 5
    WHEN 'mastery'      THEN 6
  END
  WHERE difficulty_level IS NULL;

-- 6. Range check 1-7 + make NOT NULL with a default
ALTER TABLE quiz_questions
  DROP CONSTRAINT IF EXISTS quiz_questions_difficulty_level_check;
ALTER TABLE quiz_questions
  ADD CONSTRAINT quiz_questions_difficulty_level_check
  CHECK (difficulty_level BETWEEN 1 AND 7);

ALTER TABLE quiz_questions
  ALTER COLUMN difficulty_level SET DEFAULT 1;
ALTER TABLE quiz_questions
  ALTER COLUMN difficulty_level SET NOT NULL;

-- 7. Index on difficulty_level for adaptive selection
CREATE INDEX IF NOT EXISTS idx_quiz_questions_node_level
  ON quiz_questions (node_id, difficulty_level);

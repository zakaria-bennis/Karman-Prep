-- Quiz flows (overnight 2026-11-08): sealed multi-skill runs, skill levels, challenge answers.
-- Additive and idempotent. Service role only, like catalog_practice_*: students reach these
-- tables through server actions that check ownership.

-- One sitting of a Daily 10, a practice set, a Domain quiz, a full-length test or the
-- diagnostic. `snapshots` holds the sealed catalog delivery snapshots (the same shape
-- catalog_practice_sessions stores), frozen when the run starts. `form` lists the sections and
-- the question ids in each; `sequence` is the order questions were actually served.
CREATE TABLE IF NOT EXISTS public.quiz_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('daily-ten', 'practice-set', 'domain-quiz', 'full-test', 'diagnostic')),
  run_key text NOT NULL,
  scope text,
  form jsonb NOT NULL CHECK (jsonb_typeof(form) = 'object'),
  snapshots jsonb NOT NULL CHECK (jsonb_typeof(snapshots) = 'array' AND jsonb_array_length(snapshots) BETWEEN 1 AND 400),
  sequence jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(sequence) = 'array'),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  result jsonb,
  UNIQUE (student_id, run_key)
);
CREATE INDEX IF NOT EXISTS quiz_runs_owner_idx ON public.quiz_runs (student_id, kind, started_at DESC);
CREATE INDEX IF NOT EXISTS quiz_runs_open_idx ON public.quiz_runs (student_id, kind, scope) WHERE completed_at IS NULL;
ALTER TABLE public.quiz_runs ENABLE ROW LEVEL SECURITY;

-- First answers only: one row per question per run, graded on the server against the snapshot.
CREATE TABLE IF NOT EXISTS public.quiz_run_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.quiz_runs (id) ON DELETE CASCADE,
  ordinal integer NOT NULL CHECK (ordinal BETWEEN 0 AND 399),
  section_key text NOT NULL,
  question_id uuid NOT NULL REFERENCES public.quiz_questions (id),
  skill_id text NOT NULL,
  difficulty smallint NOT NULL CHECK (difficulty BETWEEN 1 AND 7),
  student_answer text NOT NULL,
  is_correct boolean NOT NULL,
  used_hint boolean NOT NULL DEFAULT false,
  response_time_seconds integer NOT NULL CHECK (response_time_seconds BETWEEN 0 AND 86400),
  answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, ordinal),
  UNIQUE (run_id, question_id)
);
CREATE INDEX IF NOT EXISTS quiz_run_responses_question_idx ON public.quiz_run_responses (question_id);
ALTER TABLE public.quiz_run_responses ENABLE ROW LEVEL SECURITY;

-- The student-facing skill level (0 not started, 1 New, 2 Learning, 3 Understanding,
-- 4 Conquered), the current run of right answers without a hint, and the last practice
-- time that decay counts from. Rules: src/lib/levels/README.md.
CREATE TABLE IF NOT EXISTS public.student_skill_levels (
  student_id text NOT NULL,
  skill_id text NOT NULL,
  level smallint NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 4),
  run smallint NOT NULL DEFAULT 0 CHECK (run BETWEEN 0 AND 100),
  answered integer NOT NULL DEFAULT 0 CHECK (answered >= 0),
  last_practiced_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, skill_id)
);
ALTER TABLE public.student_skill_levels ENABLE ROW LEVEL SECURITY;

-- The two daily challenge questions: one answer per student per subject per day, so the
-- review can show how everyone did.
CREATE TABLE IF NOT EXISTS public.daily_challenge_answers (
  day date NOT NULL,
  subject text NOT NULL CHECK (subject IN ('math', 'reading')),
  student_id text NOT NULL,
  question_id uuid NOT NULL REFERENCES public.quiz_questions (id),
  student_answer text NOT NULL,
  is_correct boolean NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, subject, student_id)
);
CREATE INDEX IF NOT EXISTS daily_challenge_answers_question_idx ON public.daily_challenge_answers (day, subject, question_id);
ALTER TABLE public.daily_challenge_answers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.quiz_runs, public.quiz_run_responses, public.student_skill_levels,
  public.daily_challenge_answers FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.quiz_runs, public.quiz_run_responses,
  public.student_skill_levels, public.daily_challenge_answers TO service_role;

-- The skill's level just before and after each graded answer, for "skills that moved".
ALTER TABLE public.quiz_run_responses ADD COLUMN IF NOT EXISTS level_before smallint CHECK (level_before BETWEEN 0 AND 4);
ALTER TABLE public.quiz_run_responses ADD COLUMN IF NOT EXISTS level_after smallint CHECK (level_after BETWEEN 0 AND 4);

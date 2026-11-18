-- How each question in a quiz run was answered (founder, 2026-11-17: "collect as much data as
-- humanly possible" for the adaptive tests, for tutors, and to know when an answer may not be the
-- student's own). One row a question a run, beside quiz_run_responses, written from the
-- browser's own record of what happened (src/lib/quiz/record.ts): real working time, time away
-- from the page, every choice picked in order, what was crossed out, the calculator, the
-- explanation, pasting and copying. Evidence, never proof: the answer and its grade stay in
-- quiz_run_responses, decided on the server. Additive and idempotent. Service role only, like
-- quiz_runs: students reach it through a server action that checks the run is theirs.
CREATE TABLE IF NOT EXISTS public.quiz_response_signals (
  run_id uuid NOT NULL REFERENCES public.quiz_runs (id) ON DELETE CASCADE,
  question_id uuid NOT NULL,
  student_id text NOT NULL,
  -- where the question came in the sitting, and the order its choices were shown in
  position smallint NOT NULL CHECK (position BETWEEN 0 AND 399),
  option_order jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(option_order) = 'array'),
  -- time, in milliseconds: worked on (page in front, not idle), away, idle
  active_ms integer NOT NULL CHECK (active_ms BETWEEN 0 AND 86400000),
  away_ms integer NOT NULL CHECK (away_ms BETWEEN 0 AND 86400000),
  idle_ms integer NOT NULL CHECK (idle_ms BETWEEN 0 AND 86400000),
  aways smallint NOT NULL DEFAULT 0 CHECK (aways >= 0),
  first_action_ms integer CHECK (first_action_ms BETWEEN 0 AND 86400000),
  answered_ms integer CHECK (answered_ms BETWEEN 0 AND 86400000),
  -- the answer's path: the first and the last choice picked, how many times it changed, and all
  -- of it ([{choice, at}]); what was crossed out ([{choice, on, at}])
  first_pick text,
  last_pick text,
  changes smallint NOT NULL DEFAULT 0 CHECK (changes >= 0),
  picks jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(picks) = 'array'),
  crossed jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(crossed) = 'array'),
  calculator_opens smallint NOT NULL DEFAULT 0 CHECK (calculator_opens >= 0),
  calculator_ms integer NOT NULL DEFAULT 0 CHECK (calculator_ms BETWEEN 0 AND 86400000),
  explanation_ms integer NOT NULL DEFAULT 0 CHECK (explanation_ms BETWEEN 0 AND 86400000),
  visits smallint NOT NULL DEFAULT 1 CHECK (visits >= 0),
  pastes smallint NOT NULL DEFAULT 0 CHECK (pastes >= 0),
  copies smallint NOT NULL DEFAULT 0 CHECK (copies >= 0),
  -- times the keys that begin a screenshot went down, and the keys that open developer tools
  screenshot_keys smallint NOT NULL DEFAULT 0 CHECK (screenshot_keys >= 0),
  tool_keys smallint NOT NULL DEFAULT 0 CHECK (tool_keys >= 0),
  marked boolean NOT NULL DEFAULT false,
  input text CHECK (input IN ('touch', 'mouse', 'keys')),
  -- the screen it was answered on: {width, height, touch, extended, utcOffset}
  device jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(device) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (run_id, question_id)
);
CREATE INDEX IF NOT EXISTS quiz_response_signals_student_idx
  ON public.quiz_response_signals (student_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS quiz_response_signals_question_idx
  ON public.quiz_response_signals (question_id);
ALTER TABLE public.quiz_response_signals ENABLE ROW LEVEL SECURITY;

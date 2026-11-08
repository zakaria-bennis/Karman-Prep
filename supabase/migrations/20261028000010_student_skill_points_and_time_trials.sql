-- Student dashboard (spec: docs/superpowers/specs/2026-10-27-student-dashboard-design.md).
-- Local only until the founder approves. Idempotent, matching repo style.

-- Assigned modes: full-length exams and Time Trials are planned by the tutor, then unlocked
-- by the tutor. A student starts one only while it is unlocked and not completed.
CREATE TABLE IF NOT EXISTS public.student_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('full_length', 'time_trial')),
  section TEXT CHECK (section IN ('reading', 'math')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  scheduled_for DATE NOT NULL,
  unlocked_at TIMESTAMPTZ,
  unlocked_by TEXT,
  completed_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((kind = 'time_trial') = (section IS NOT NULL)),
  CHECK (completed_at IS NULL OR unlocked_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS student_assignments_student
  ON public.student_assignments (student_id, scheduled_for);

ALTER TABLE public.student_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students read own assignments" ON public.student_assignments;
CREATE POLICY "Students read own assignments" ON public.student_assignments
  FOR SELECT USING (student_id = auth.jwt() ->> 'sub');
DROP POLICY IF EXISTS "Service role full access" ON public.student_assignments;
CREATE POLICY "Service role full access" ON public.student_assignments
  USING (auth.role() = 'service_role');

-- Time Trial runs: one row per finished (or abandoned) trial. The next target is stored
-- with the run so the squeeze is reproducible from history.
CREATE TABLE IF NOT EXISTS public.time_trial_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  assignment_id UUID REFERENCES public.student_assignments (id),
  section TEXT NOT NULL CHECK (section IN ('reading', 'math')),
  accommodation TEXT NOT NULL DEFAULT 'standard'
    CHECK (accommodation IN ('standard', 'time_and_half', 'double')),
  target_seconds INTEGER NOT NULL CHECK (target_seconds > 0),
  goal_seconds INTEGER NOT NULL CHECK (goal_seconds > 0),
  elapsed_seconds INTEGER NOT NULL CHECK (elapsed_seconds >= 0),
  questions SMALLINT NOT NULL CHECK (questions > 0),
  correct SMALLINT NOT NULL CHECK (correct >= 0 AND correct <= questions),
  finished BOOLEAN NOT NULL,
  beat BOOLEAN NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('beat', 'over_time', 'unfinished', 'rushed')),
  next_target_seconds INTEGER NOT NULL CHECK (next_target_seconds >= goal_seconds),
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS time_trial_runs_student_section
  ON public.time_trial_runs (student_id, section, finished_at DESC);

ALTER TABLE public.time_trial_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students read own time trials" ON public.time_trial_runs;
CREATE POLICY "Students read own time trials" ON public.time_trial_runs
  FOR SELECT USING (student_id = auth.jwt() ->> 'sub');
DROP POLICY IF EXISTS "Service role full access" ON public.time_trial_runs;
CREATE POLICY "Service role full access" ON public.time_trial_runs
  USING (auth.role() = 'service_role');

-- Per-skill points, read from the quiz-engine ledger (student_point_awards). Created only
-- once that table has its skill_id column, so the order of the two branches does not matter.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'student_point_awards' AND column_name = 'skill_id'
  ) THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.student_skill_points
      WITH (security_invoker = true) AS
      SELECT student_id,
             skill_id,
             SUM(points)::INTEGER AS points,
             (SUM(points) FILTER (WHERE created_at >= now() - INTERVAL '7 days'))::INTEGER
               AS week_points
      FROM public.student_point_awards
      WHERE skill_id IS NOT NULL
      GROUP BY student_id, skill_id
    $view$;
  END IF;
END $$;

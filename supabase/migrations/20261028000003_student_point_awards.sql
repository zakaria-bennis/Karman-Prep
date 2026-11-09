-- Points for correct answers in instant-grading modes, per skill (quiz engine spec, Data; founder
-- 2026-10-27: points are earned per skill). award_key is unique per graded answer, so a retried
-- or double-tapped submit can never award twice. Only the server writes.

CREATE TABLE IF NOT EXISTS public.student_point_awards (
  award_key  TEXT PRIMARY KEY,               -- lesson:<response id>, catalog:<session>:<question>, daily:<date>:<subject>
  student_id TEXT NOT NULL,                  -- Clerk ID
  skill_id   TEXT,                           -- the question's skill (node id); null when unknown
  points     SMALLINT NOT NULL CHECK (points IN (10, 15)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS student_point_awards_student_idx ON public.student_point_awards (student_id);
CREATE INDEX IF NOT EXISTS student_point_awards_skill_idx ON public.student_point_awards (student_id, skill_id);

ALTER TABLE public.student_point_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "point_awards_own" ON public.student_point_awards;
CREATE POLICY "point_awards_own"
  ON public.student_point_awards FOR SELECT
  USING (student_id = auth.jwt() ->> 'sub');

DROP POLICY IF EXISTS "point_awards_tutor_read" ON public.student_point_awards;
CREATE POLICY "point_awards_tutor_read"
  ON public.student_point_awards FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users student
      JOIN public.users tutor ON tutor.clerk_id = auth.jwt() ->> 'sub'
      WHERE student.clerk_id = student_point_awards.student_id
        AND (
          EXISTS (
            SELECT 1 FROM public.tutor_assignments ta
            WHERE ta.student_user_id = student.id AND ta.tutor_user_id = tutor.id
              AND ta.ended_at IS NULL
          )
          OR EXISTS (
            SELECT 1 FROM public.cohort_members cm
            JOIN public.cohorts c ON c.id = cm.cohort_id
            WHERE cm.user_id = student.id AND c.tutor_user_id = tutor.id
              AND cm.left_at IS NULL AND c.ended_at IS NULL
          )
        )
    )
  );

DROP POLICY IF EXISTS "point_awards_service_write" ON public.student_point_awards;
CREATE POLICY "point_awards_service_write"
  ON public.student_point_awards FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Totals respect the caller's row access.
CREATE OR REPLACE VIEW public.student_point_totals
  WITH (security_invoker = true) AS
  SELECT student_id, SUM(points)::INTEGER AS total
  FROM public.student_point_awards
  GROUP BY student_id;

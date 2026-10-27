-- Saved questions: a student's permanent bookmarks and the questions they flagged for their tutor
-- (quiz engine spec, Data). Writes go through Zod-validated server actions with the service role.

CREATE TABLE IF NOT EXISTS public.student_saved_questions (
  student_id  TEXT NOT NULL,                 -- Clerk ID, like the other quiz tables
  question_id UUID NOT NULL,
  source      TEXT NOT NULL CHECK (source IN ('bookmark', 'tutor_flag')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, question_id)
);

CREATE INDEX IF NOT EXISTS student_saved_questions_question_idx
  ON public.student_saved_questions (question_id);

ALTER TABLE public.student_saved_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_questions_own" ON public.student_saved_questions;
CREATE POLICY "saved_questions_own"
  ON public.student_saved_questions FOR SELECT
  USING (student_id = auth.jwt() ->> 'sub');

-- A tutor reads the saved questions of students linked to them 1:1 or through a cohort they teach.
DROP POLICY IF EXISTS "saved_questions_tutor_read" ON public.student_saved_questions;
CREATE POLICY "saved_questions_tutor_read"
  ON public.student_saved_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users student
      JOIN public.users tutor ON tutor.clerk_id = auth.jwt() ->> 'sub'
      WHERE student.clerk_id = student_saved_questions.student_id
        AND (
          EXISTS (
            SELECT 1 FROM public.tutor_assignments ta
            WHERE ta.student_user_id = student.id AND ta.tutor_user_id = tutor.id
          )
          OR EXISTS (
            SELECT 1 FROM public.cohort_members cm
            JOIN public.cohorts c ON c.id = cm.cohort_id
            WHERE cm.user_id = student.id AND c.tutor_user_id = tutor.id
          )
        )
    )
  );

DROP POLICY IF EXISTS "saved_questions_admin_read" ON public.student_saved_questions;
CREATE POLICY "saved_questions_admin_read"
  ON public.student_saved_questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.clerk_id = auth.jwt() ->> 'sub' AND u.role = 'admin'));

DROP POLICY IF EXISTS "saved_questions_service_write" ON public.student_saved_questions;
CREATE POLICY "saved_questions_service_write"
  ON public.student_saved_questions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

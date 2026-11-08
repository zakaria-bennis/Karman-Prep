-- ============================================================
-- Tutor homework (overnight build, 2026-11-08)
--
-- Work a tutor assigns to one student: a skill practice set, a
-- Domain quiz or a full-length test, with a due date. It shows in
-- the student's Homework. The server checks, on every write, that
-- the tutor may manage that student (an affiliate tutor needs a live
-- link and an active plan; see src/lib/tutor-affiliate/rules.ts).
--
--   kind              target_id
--   skill_practice    catalog skill id   (src/data/curriculum/skill-catalog.ts)
--   domain_quiz       SAT Domain id       (SKILL_DOMAINS in the same file)
--   full_length_test  NULL                (the student's next full-length test)
--
-- Rows are never deleted by the app: cancelling keeps history.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tutor_homework (
  id                   uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id      uuid         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_by_user_id  uuid         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind                 text         NOT NULL
    CHECK (kind IN ('skill_practice', 'domain_quiz', 'full_length_test')),
  target_id            text         CHECK (target_id IS NULL OR length(target_id) BETWEEN 1 AND 120),
  title                text         NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 140),
  note                 text         CHECK (note IS NULL OR length(note) <= 500),
  due_on               date         NOT NULL,
  status               text         NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'completed', 'cancelled')),
  completed_at         timestamptz,
  cancelled_at         timestamptz,
  created_at           timestamptz  NOT NULL DEFAULT now(),
  updated_at           timestamptz  NOT NULL DEFAULT now(),
  CHECK ((kind = 'full_length_test') = (target_id IS NULL)),
  CHECK ((status = 'completed') = (completed_at IS NOT NULL)),
  CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL)),
  CHECK (student_user_id <> assigned_by_user_id)
);

CREATE INDEX IF NOT EXISTS tutor_homework_student_idx
  ON public.tutor_homework (student_user_id, status, due_on);

CREATE INDEX IF NOT EXISTS tutor_homework_assigner_idx
  ON public.tutor_homework (assigned_by_user_id, created_at DESC);

ALTER TABLE public.tutor_homework ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tutor_homework_party_read" ON public.tutor_homework;
CREATE POLICY "tutor_homework_party_read"
  ON public.tutor_homework FOR SELECT
  USING (
    student_user_id     IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
    OR assigned_by_user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
  );

DROP POLICY IF EXISTS "tutor_homework_service_write" ON public.tutor_homework;
CREATE POLICY "tutor_homework_service_write"
  ON public.tutor_homework FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

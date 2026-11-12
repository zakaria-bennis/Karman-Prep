-- Parent portal Messages, alerts and official scores (founder, 2026-11-12). Additive only.
--
-- 1. family_messages: one conversation per parent and student with the Karman Prep team. Parents
--    write messages and requests (miss a class, move a session, book a 1:1); the team answers from
--    /admin/messages. Not the tutor's private line: tutor notes stay in tutor_notes.
-- 2. parent_email_settings gains the parent's alert choices (late homework, missed session).
--    Alerts send nothing unless PARENT_ALERTS=on; parent_alert_log keeps each alert to one send.
-- 3. official_sat_scores: real College Board scores a parent or the team types in, shown next to
--    the predicted score.
--
-- Written by the server (service role); parents may read their own rows.

CREATE TABLE IF NOT EXISTS public.family_messages (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id    uuid        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  student_user_id   uuid        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  author_user_id    uuid        REFERENCES public.users (id) ON DELETE SET NULL,
  author_role       text        NOT NULL CHECK (author_role IN ('parent', 'staff')),
  kind              text        NOT NULL DEFAULT 'message'
                                CHECK (kind IN ('message', 'miss_class', 'move_session', 'book_session')),
  -- The booking or cohort session a request is about, with its start for the team's list.
  session_ref       uuid,
  session_starts_at timestamptz,
  body              text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  -- Parent rows start open; the team marks them handled. Staff rows are always handled.
  status            text        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'handled')),
  handled_at        timestamptz,
  -- When the parent first saw a staff reply.
  read_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS family_messages_family_idx
  ON public.family_messages (parent_user_id, student_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS family_messages_open_idx
  ON public.family_messages (created_at DESC) WHERE status = 'open';
ALTER TABLE public.family_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "family_messages_own_read" ON public.family_messages;
CREATE POLICY "family_messages_own_read"
  ON public.family_messages FOR SELECT
  USING (parent_user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS "family_messages_service_write" ON public.family_messages;
CREATE POLICY "family_messages_service_write"
  ON public.family_messages FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.parent_email_settings
  ADD COLUMN IF NOT EXISTS alert_late_homework  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS alert_missed_session boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.parent_alert_log (
  parent_user_id  uuid        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  student_user_id uuid        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  -- 'homework:<title>:<due date>' or 'session:<id>'.
  alert_key       text        NOT NULL CHECK (char_length(alert_key) BETWEEN 1 AND 300),
  status          text        NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'sent', 'failed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_user_id, student_user_id, alert_key)
);
ALTER TABLE public.parent_alert_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parent_alert_log_own_read" ON public.parent_alert_log;
CREATE POLICY "parent_alert_log_own_read"
  ON public.parent_alert_log FOR SELECT
  USING (parent_user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS "parent_alert_log_service_write" ON public.parent_alert_log;
CREATE POLICY "parent_alert_log_service_write"
  ON public.parent_alert_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.official_sat_scores (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id    uuid        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  entered_by_user_id uuid        REFERENCES public.users (id) ON DELETE SET NULL,
  test_date          date        NOT NULL,
  reading_writing    integer     NOT NULL CHECK (reading_writing BETWEEN 200 AND 800 AND reading_writing % 10 = 0),
  math               integer     NOT NULL CHECK (math BETWEEN 200 AND 800 AND math % 10 = 0),
  total              integer     GENERATED ALWAYS AS (reading_writing + math) STORED,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_user_id, test_date)
);
ALTER TABLE public.official_sat_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "official_sat_scores_parent_read" ON public.official_sat_scores;
CREATE POLICY "official_sat_scores_parent_read"
  ON public.official_sat_scores FOR SELECT
  USING (
    student_user_id IN (
      SELECT student_user_id FROM public.parent_student_links
       WHERE parent_user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
    )
    OR student_user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
  );

DROP POLICY IF EXISTS "official_sat_scores_service_write" ON public.official_sat_scores;
CREATE POLICY "official_sat_scores_service_write"
  ON public.official_sat_scores FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 4. parent_session_notes: a short note for the family after a session, one row per note, so the
--    parent's Messages can line notes up and compare each week's practice with the one before.
--    (tutor_notes is the tutor's own running notepad, one per student, and stays private.)
CREATE TABLE IF NOT EXISTS public.parent_session_notes (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id  uuid        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  tutor_user_id    uuid        REFERENCES public.users (id) ON DELETE SET NULL,
  body             text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS parent_session_notes_student_idx
  ON public.parent_session_notes (student_user_id, created_at DESC);
ALTER TABLE public.parent_session_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parent_session_notes_family_read" ON public.parent_session_notes;
CREATE POLICY "parent_session_notes_family_read"
  ON public.parent_session_notes FOR SELECT
  USING (
    student_user_id IN (
      SELECT student_user_id FROM public.parent_student_links
       WHERE parent_user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
    )
  );

DROP POLICY IF EXISTS "parent_session_notes_service_write" ON public.parent_session_notes;
CREATE POLICY "parent_session_notes_service_write"
  ON public.parent_session_notes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

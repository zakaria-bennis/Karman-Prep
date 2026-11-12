-- Parent daily email (founder, 2026-11-12): each parent picks when the daily brief arrives (a local
-- time on the half hour, 5 PM to 10 PM, default 7:30 PM) or turns it off; a send log keeps it to one
-- email per parent, student and day. Additive only. Written by the server (service role); parents
-- may read their own rows.

CREATE TABLE IF NOT EXISTS public.parent_email_settings (
  parent_user_id   uuid        PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  -- 'HH:MM' local time, or NULL for off.
  daily_email_time text        CHECK (daily_email_time IS NULL OR daily_email_time ~ '^(1[7-9]|2[0-2]):(00|30)$'),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.parent_email_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parent_email_settings_own_read" ON public.parent_email_settings;
CREATE POLICY "parent_email_settings_own_read"
  ON public.parent_email_settings FOR SELECT
  USING (parent_user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS "parent_email_settings_service_write" ON public.parent_email_settings;
CREATE POLICY "parent_email_settings_service_write"
  ON public.parent_email_settings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- One row per daily email actually sent (or being sent). The primary key is the dedupe.
CREATE TABLE IF NOT EXISTS public.parent_daily_email_log (
  parent_user_id  uuid        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  student_user_id uuid        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  report_day      date        NOT NULL,
  status          text        NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'sent', 'failed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_user_id, student_user_id, report_day)
);
ALTER TABLE public.parent_daily_email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parent_daily_email_log_own_read" ON public.parent_daily_email_log;
CREATE POLICY "parent_daily_email_log_own_read"
  ON public.parent_daily_email_log FOR SELECT
  USING (parent_user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS "parent_daily_email_log_service_write" ON public.parent_daily_email_log;
CREATE POLICY "parent_daily_email_log_service_write"
  ON public.parent_daily_email_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

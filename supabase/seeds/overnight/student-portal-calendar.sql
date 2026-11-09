-- ============================================================
-- Local test data for the student Calendar (overnight build, 2026-11-08).
-- LOCAL DATABASE ONLY. Dates are relative to today (Central time), so
-- re-running the file moves them forward and they never go stale.
--
--   - Four live events: two workshops (one past, with a recording) and
--     two office hours, hosted by David (dev_seed_tutor_david).
--   - Liam (dev_seed_student_pro): two upcoming 1:1 sessions with David
--     (the second already moved once), and a seat in David's
--     "Fall Cohort 1200 to 1400", so his Calendar shows cohort classes.
--   - Recording links on that cohort's two latest finished classes.
-- ============================================================

-- Midnight today in Central time, as a timestamptz.
CREATE OR REPLACE FUNCTION pg_temp.ct_day(days integer, hhmm text)
RETURNS timestamptz LANGUAGE sql AS $$
  SELECT ((date_trunc('day', now() AT TIME ZONE 'America/Chicago')
           + make_interval(days => days) + hhmm::time) AT TIME ZONE 'America/Chicago')
$$;

INSERT INTO public.live_events (id, kind, title, host_user_id, starts_at, ends_at, recording_url)
SELECT v.id::uuid, v.kind, v.title,
       (SELECT id FROM public.users WHERE clerk_id = 'dev_seed_tutor_david'),
       pg_temp.ct_day(v.d, v.t), pg_temp.ct_day(v.d, v.t) + make_interval(mins => v.mins),
       v.rec
FROM (VALUES
  ('5c0a1e00-0000-4000-8000-000000000001', 'workshop',     'Live workshop: Command of Evidence', 3,  '19:00', 60, NULL),
  ('5c0a1e00-0000-4000-8000-000000000002', 'office_hours', 'Office hours with David',           5,  '18:00', 60, NULL),
  ('5c0a1e00-0000-4000-8000-000000000003', 'workshop',     'Live workshop: Transitions',        -10, '19:00', 45,
   'https://zoom.us/rec/share/karman-local-transitions'),
  ('5c0a1e00-0000-4000-8000-000000000004', 'office_hours', 'Office hours with David',           12, '18:00', 60, NULL)
) AS v(id, kind, title, d, t, mins, rec)
ON CONFLICT (id) DO UPDATE
  SET starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at,
      title = EXCLUDED.title, recording_url = EXCLUDED.recording_url, updated_at = now();

-- Liam's two upcoming 1:1 sessions with David.
INSERT INTO public.bookings (id, student_id, tutor_id, plan_tier, scheduled_start, scheduled_end,
                             status, reschedule_count)
SELECT v.id::uuid,
       (SELECT id FROM public.users WHERE clerk_id = 'dev_seed_student_pro'),
       (SELECT id FROM public.users WHERE clerk_id = 'dev_seed_tutor_david'),
       'private', pg_temp.ct_day(v.d, '16:00'), pg_temp.ct_day(v.d, '17:00'), 'scheduled', v.moved
FROM (VALUES
  ('5c0a1e00-0000-4000-8000-0000000000b1', 4, 0),
  ('5c0a1e00-0000-4000-8000-0000000000b2', 11, 1)
) AS v(id, d, moved)
ON CONFLICT (id) DO UPDATE
  SET scheduled_start = EXCLUDED.scheduled_start, scheduled_end = EXCLUDED.scheduled_end,
      status = 'scheduled', cancelled_at = NULL, cancelled_within_window = NULL,
      reschedule_count = EXCLUDED.reschedule_count, updated_at = now();

-- A seat in David's fall cohort.
INSERT INTO public.cohort_members (cohort_id, user_id)
SELECT c.id, u.id
FROM public.cohorts c, public.users u
WHERE c.name = 'Fall Cohort 1200 to 1400' AND u.clerk_id = 'dev_seed_student_pro'
  AND NOT EXISTS (
    SELECT 1 FROM public.cohort_members m WHERE m.cohort_id = c.id AND m.user_id = u.id
  );

-- Recordings on the cohort's two latest finished classes.
UPDATE public.sessions s
SET zoom_recording_url = 'https://zoom.us/rec/share/karman-local-' || left(s.id::text, 8)
WHERE s.id IN (
  SELECT x.id FROM public.sessions x
  JOIN public.cohorts c ON c.id = x.cohort_id
  WHERE c.name = 'Fall Cohort 1200 to 1400' AND x.status = 'completed'
  ORDER BY x.scheduled_start DESC
  LIMIT 2
) AND s.zoom_recording_url IS NULL;

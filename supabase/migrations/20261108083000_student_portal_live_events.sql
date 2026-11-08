-- ============================================================
-- Workshops and office hours (student portal Calendar, overnight build 2026-11-08)
--
-- Live events any paying student can join: skill workshops and
-- drop-in office hours, run on Zoom by a tutor. A student saves a
-- spot (an RSVP) from the Calendar tab; past events can carry a
-- recording link. 1:1 sessions stay in `bookings` and cohort
-- classes in `sessions`; this table holds only the shared events.
--
-- The app reads and writes with the service role, after checking
-- the student's plan on the server. Students may read events and
-- their own RSVPs directly.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.live_events (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  kind           text         NOT NULL CHECK (kind IN ('workshop', 'office_hours')),
  title          text         NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 140),
  host_user_id   uuid         REFERENCES public.users(id) ON DELETE SET NULL,
  starts_at      timestamptz  NOT NULL,
  ends_at        timestamptz  NOT NULL,
  join_url       text         CHECK (join_url IS NULL OR join_url ~ '^https://'),
  recording_url  text         CHECK (recording_url IS NULL OR recording_url ~ '^https://'),
  -- Null means no limit. When set, saving a spot stops at this many.
  capacity       integer      CHECK (capacity IS NULL OR capacity > 0),
  cancelled_at   timestamptz,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS live_events_starts_idx ON public.live_events (starts_at);

CREATE TABLE IF NOT EXISTS public.live_event_rsvps (
  event_id    uuid         NOT NULL REFERENCES public.live_events(id) ON DELETE CASCADE,
  user_id     uuid         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS live_event_rsvps_user_idx ON public.live_event_rsvps (user_id);

ALTER TABLE public.live_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_event_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "live_events_signed_in_read" ON public.live_events;
CREATE POLICY "live_events_signed_in_read"
  ON public.live_events FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

DROP POLICY IF EXISTS "live_events_service_write" ON public.live_events;
CREATE POLICY "live_events_service_write"
  ON public.live_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "live_event_rsvps_own_read" ON public.live_event_rsvps;
CREATE POLICY "live_event_rsvps_own_read"
  ON public.live_event_rsvps FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS "live_event_rsvps_service_write" ON public.live_event_rsvps;
CREATE POLICY "live_event_rsvps_service_write"
  ON public.live_event_rsvps FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

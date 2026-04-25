-- ============================================================
-- Strata Scheduling — Migration 009
--
-- Adds the scheduling backend that ties Cal.com + Zoom + Supabase
-- together:
--
--   · bookings        — one row per scheduled tutoring session.
--                       Backed by Cal.com (cal_booking_uid) and Zoom
--                       (zoom_meeting_id). State machine: scheduled
--                       → completed | cancelled | no_show.
--
--   · attendance_logs — one row per (booking, student) pair.
--                       Updated by the Zoom webhook with
--                       participant_joined / participant_left
--                       events. is_present is a generated column
--                       that flips true at 45 minutes (2700s).
--
-- FK convention:
--   References users.id (UUID), matching cohort tables (006/007/008).
--   API routes resolve Clerk's text userId → users.id via a single
--   lookup before insert. RLS policies do the same lookup inline.
--
-- Plan tier on bookings:
--   The 'group' value is the $40/mo "seminar" tier in marketing
--   copy — DB stays canonical. 'annual' (a billing variant) is
--   excluded; annual subs map to one of the four delivery tiers
--   at booking time.
--
-- Run this in the Supabase SQL editor after migration 008.
-- Idempotent — safe to re-run.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. bookings
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bookings (
  id                          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Participants
  student_id                  UUID         NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  tutor_id                    UUID         NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,

  -- Plan tier this booking is billed against. Only the four delivery
  -- tiers can create a booking — 'annual' is a billing label, not a
  -- session shape, and 'seminar' is marketing-speak for 'group'.
  plan_tier                   TEXT         NOT NULL
                                            CHECK (plan_tier IN ('group','small_group','private','elite')),

  -- Cal.com identifiers
  cal_booking_uid             TEXT         UNIQUE,
  cal_event_type_id           TEXT,

  -- Zoom identifiers (filled in once Cal.com creates the meeting)
  zoom_meeting_id             TEXT,
  zoom_join_url               TEXT,
  zoom_start_url              TEXT,

  -- Schedule
  scheduled_start             TIMESTAMPTZ  NOT NULL,
  scheduled_end               TIMESTAMPTZ  NOT NULL,
  duration_minutes            INTEGER      GENERATED ALWAYS AS (
                                              (EXTRACT(EPOCH FROM (scheduled_end - scheduled_start)) / 60)::integer
                                            ) STORED,

  -- State machine
  status                      TEXT         NOT NULL DEFAULT 'scheduled'
                                            CHECK (status IN ('scheduled','completed','cancelled','no_show')),

  -- Cancellation tracking
  cancelled_at                TIMESTAMPTZ,
  cancelled_within_window     BOOLEAN,
  credit_forfeited            BOOLEAN      NOT NULL DEFAULT false,

  -- Reschedule tracking — one free reschedule per booking.
  reschedule_count            INTEGER      NOT NULL DEFAULT 0,
  rescheduled_from            TIMESTAMPTZ,

  -- Email gates so webhook handlers stay idempotent.
  confirmation_email_sent     BOOLEAN      NOT NULL DEFAULT false,
  cancellation_email_sent     BOOLEAN      NOT NULL DEFAULT false,

  created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT bookings_end_after_start  CHECK (scheduled_end > scheduled_start),
  CONSTRAINT bookings_no_self_tutor    CHECK (student_id <> tutor_id),
  CONSTRAINT bookings_reschedule_cap   CHECK (reschedule_count >= 0 AND reschedule_count <= 1)
);

CREATE INDEX IF NOT EXISTS bookings_student_idx       ON public.bookings (student_id, scheduled_start DESC);
CREATE INDEX IF NOT EXISTS bookings_tutor_idx         ON public.bookings (tutor_id,   scheduled_start DESC);
CREATE INDEX IF NOT EXISTS bookings_status_idx        ON public.bookings (status, scheduled_start);
CREATE INDEX IF NOT EXISTS bookings_zoom_meeting_idx  ON public.bookings (zoom_meeting_id) WHERE zoom_meeting_id IS NOT NULL;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_student_read" ON public.bookings;
CREATE POLICY "bookings_student_read"
  ON public.bookings FOR SELECT
  USING (
    student_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
  );

DROP POLICY IF EXISTS "bookings_tutor_read" ON public.bookings;
CREATE POLICY "bookings_tutor_read"
  ON public.bookings FOR SELECT
  USING (
    tutor_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
  );

-- All writes go through service role from API routes / webhook handlers.
DROP POLICY IF EXISTS "bookings_service_all" ON public.bookings;
CREATE POLICY "bookings_service_all"
  ON public.bookings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS bookings_set_updated_at ON public.bookings;
CREATE TRIGGER bookings_set_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();


-- ─────────────────────────────────────────────────────────────
-- 2. attendance_logs
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id                          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),

  booking_id                  UUID         NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  student_id                  UUID         NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  zoom_meeting_id             TEXT         NOT NULL,

  -- Running totals, accumulated by the Zoom webhook handler.
  total_duration_seconds      INTEGER      NOT NULL DEFAULT 0,
  join_events                 JSONB        NOT NULL DEFAULT '[]'::jsonb,
  leave_events                JSONB        NOT NULL DEFAULT '[]'::jsonb,

  -- 2700s = 45 minutes. Generated; updates automatically.
  is_present                  BOOLEAN      GENERATED ALWAYS AS (total_duration_seconds >= 2700) STORED,

  -- Tutor manual override — for "Zoom didn't fire leave event but
  -- the student was actually present" cases. The frontend should
  -- prefer overridden_present when manually_overridden is true.
  overridden_present          BOOLEAN,
  manually_overridden         BOOLEAN      NOT NULL DEFAULT false,
  override_by                 UUID         REFERENCES public.users(id) ON DELETE SET NULL,
  override_at                 TIMESTAMPTZ,
  override_reason             TEXT,

  created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- One row per (booking, student) pair.
  UNIQUE (booking_id, student_id)
);

CREATE INDEX IF NOT EXISTS attendance_logs_booking_idx ON public.attendance_logs (booking_id);
CREATE INDEX IF NOT EXISTS attendance_logs_student_idx ON public.attendance_logs (student_id);
CREATE INDEX IF NOT EXISTS attendance_logs_zoom_idx    ON public.attendance_logs (zoom_meeting_id);

ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Student sees their own attendance.
DROP POLICY IF EXISTS "attendance_logs_student_read" ON public.attendance_logs;
CREATE POLICY "attendance_logs_student_read"
  ON public.attendance_logs FOR SELECT
  USING (
    student_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
  );

-- Tutor sees attendance for any booking they're tutoring.
DROP POLICY IF EXISTS "attendance_logs_tutor_read" ON public.attendance_logs;
CREATE POLICY "attendance_logs_tutor_read"
  ON public.attendance_logs FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM public.bookings
       WHERE tutor_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
    )
  );

DROP POLICY IF EXISTS "attendance_logs_service_all" ON public.attendance_logs;
CREATE POLICY "attendance_logs_service_all"
  ON public.attendance_logs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS attendance_logs_set_updated_at ON public.attendance_logs;
CREATE TRIGGER attendance_logs_set_updated_at
  BEFORE UPDATE ON public.attendance_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

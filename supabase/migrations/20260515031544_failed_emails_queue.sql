-- ============================================================
-- Resilient email queue for booking-related Resend sends.
--
-- Before this: the Cal webhook called sendBookingConfirmation /
-- sendBookingCancellation / sendBookingReschedule synchronously. If
-- Resend threw, the webhook returned 500 and Cal retried — but Cal's
-- retry budget is finite (a few attempts over a few hours). After
-- that the email was permanently lost; the student saw "Booking
-- confirmed" in the app but never got an email with the Zoom link.
--
-- This table owns the retry budget instead. On Resend error the
-- webhook inserts a row here + returns 200; a cron drains the queue
-- with exponential backoff and gives up after N attempts (the row
-- then becomes a visible "needs attention" entry for admins).
--
-- The Cal webhook already keeps its own idempotency flags
-- (confirmation_email_sent / cancellation_email_sent on bookings),
-- so a successful queue drain marks the booking flag too — Cal
-- retries that arrive after queue-success are no-ops as before.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.failed_emails (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Dispatch discriminator. The cron switches on `kind` to call the
  -- right send-function with the JSONB payload below.
  kind            TEXT         NOT NULL
                  CHECK (kind IN (
                    'booking_confirmation',
                    'booking_cancellation',
                    'booking_reschedule'
                  )),
  -- The args passed to the send function. Different kinds have
  -- different shapes; validated at dispatch time, not on insert.
  payload         JSONB        NOT NULL,
  -- Sender's outbox idempotency key. For Cal webhook emails this is
  -- the cal_booking_uid + kind so we can de-dupe re-queues on
  -- redelivery.
  dedupe_key      TEXT         NOT NULL,
  -- Number of attempts (including the original try that landed here).
  attempts        INTEGER      NOT NULL DEFAULT 1,
  -- When the cron should next try. now() means ready immediately.
  next_attempt_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  -- Last error string from Resend (or our wrapper), for admin debug.
  last_error      TEXT,
  -- Last attempt timestamp — success or failure.
  last_attempt_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  -- Set on first successful send; the cron ignores succeeded rows.
  succeeded_at    TIMESTAMPTZ,
  -- Set when attempts >= max; the row stays visible for admin
  -- triage and is ignored by the cron after this.
  given_up_at     TIMESTAMPTZ,
  -- Optional link back to the originating booking. NOT a FK because
  -- we want this row to survive a booking delete (audit trail).
  booking_id      UUID,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Same booking + same email kind = at most one active queue entry.
-- (A subsequent success or a give-up clears the active state so a
-- later genuine failure can re-queue.)
CREATE UNIQUE INDEX IF NOT EXISTS idx_failed_emails_dedupe_active
  ON public.failed_emails (dedupe_key)
  WHERE succeeded_at IS NULL AND given_up_at IS NULL;

-- Cron hot path: "give me ready-to-retry rows, oldest next_attempt_at first."
CREATE INDEX IF NOT EXISTS idx_failed_emails_pending
  ON public.failed_emails (next_attempt_at)
  WHERE succeeded_at IS NULL AND given_up_at IS NULL;

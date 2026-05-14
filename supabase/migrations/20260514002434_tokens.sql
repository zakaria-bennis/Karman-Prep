-- ============================================================
-- Strata Token System — Migration 011
--
-- Tokens are per-student session credits. They drive scheduling
-- for the two self-bookable tiers:
--
--   · Elite — 8 monthly tokens, granted lazily at first balance
--     check each month, expiring at month-end (use-it-or-lose-it).
--   · Private — 1 token per per-session purchase via Stripe.
--
-- Group + small_group never have tokens — those bookings come
-- from the admin push flow, not student self-booking.
--
-- States:
--   · available   — consumed_at IS NULL AND assigned_booking_id IS NULL
--   · reserved    — consumed_at IS NULL AND assigned_booking_id IS NOT NULL
--   · consumed    — consumed_at IS NOT NULL  (with consumed_reason set)
--
-- Lifecycle (matches the locked policy in project_tiers.md, with
-- the explicit clarification that reschedule never costs a token):
--
--   book session              : available → reserved
--   cancel outside 24h        : reserved → available  (refunded to bank)
--   cancel within 24h         : reserved → consumed   ('forfeited_within_window')
--   reschedule (any time)     : no change             (token stays on the booking)
--   session completed         : reserved → consumed   ('completed')
--   no-show                   : reserved → consumed   ('no_show')
--
-- Run this in the Supabase SQL editor after migration 010.
-- Idempotent — safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tokens (
  id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id              UUID         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Provenance: which subscription/charge / admin action minted this token.
  source               TEXT         NOT NULL
                                      CHECK (source IN ('elite_monthly','private_purchase','admin_grant')),

  granted_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- 'YYYY-MM' for Elite monthly tokens — used for idempotent lazy-grant.
  -- NULL for private_purchase / admin_grant (no monthly key).
  granted_for_month    TEXT,

  -- Elite tokens expire at month-end. Private + admin_grant typically don't.
  expires_at           TIMESTAMPTZ,

  -- Reservation: when the token is locked to a booking.
  assigned_booking_id  UUID         REFERENCES public.bookings(id) ON DELETE SET NULL,

  -- Consumption: when the token is permanently spent.
  consumed_at          TIMESTAMPTZ,
  consumed_reason      TEXT
                       CHECK (consumed_reason IS NULL OR consumed_reason IN (
                         'completed',
                         'no_show',
                         'forfeited_within_window',
                         'expired'
                       )),

  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- Consumption invariant: either both null or both set.
  CONSTRAINT tokens_consumed_paired CHECK (
    (consumed_at IS NULL AND consumed_reason IS NULL) OR
    (consumed_at IS NOT NULL AND consumed_reason IS NOT NULL)
  )
);

-- Each booking has at most ONE active (un-consumed) token.
CREATE UNIQUE INDEX IF NOT EXISTS tokens_one_active_per_booking
  ON public.tokens (assigned_booking_id)
  WHERE assigned_booking_id IS NOT NULL AND consumed_at IS NULL;

-- Fast lookup of available tokens for a user.
CREATE INDEX IF NOT EXISTS tokens_user_available_idx
  ON public.tokens (user_id)
  WHERE consumed_at IS NULL AND assigned_booking_id IS NULL;

-- Fast lookup of "did this user receive their YYYY-MM elite batch yet?"
CREATE INDEX IF NOT EXISTS tokens_user_month_idx
  ON public.tokens (user_id, granted_for_month)
  WHERE granted_for_month IS NOT NULL;

ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;

-- Students see their own tokens (for balance display).
DROP POLICY IF EXISTS "tokens_self_read" ON public.tokens;
CREATE POLICY "tokens_self_read"
  ON public.tokens FOR SELECT
  USING (
    user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
  );

-- All writes go through service-role from API routes / webhooks / cron.
DROP POLICY IF EXISTS "tokens_service_all" ON public.tokens;
CREATE POLICY "tokens_service_all"
  ON public.tokens FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS tokens_set_updated_at ON public.tokens;
CREATE TRIGGER tokens_set_updated_at
  BEFORE UPDATE ON public.tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

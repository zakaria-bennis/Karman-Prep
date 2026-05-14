-- ============================================================
-- Strata Anti-Abuse Hooks — Migration 012
--
-- Two small columns on users to support the abuse mitigations
-- shipped alongside this migration:
--
--   1. booking_lock_until TIMESTAMPTZ
--      A short-lived "booking in progress" mutex set by
--      /api/bookings/create. Prevents the double-tap / multi-tab
--      race where two simultaneous booking attempts both pass the
--      tokens-available check and end up each reserving a token.
--      The route compare-and-sets this column on entry; if the
--      lock is held, the second request 429s.
--      Auto-expires after a few seconds — a crashed route never
--      permanently blocks the user.
--
--   2. signup_ip TEXT
--      Best-effort capture of the IP address /api/auth/sync-user
--      saw on first sync for this user. Used by future admin
--      tooling to spot multi-account trial abuse (one person
--      registering N Clerk identities for N×8 Elite trial tokens).
--      Not actively gated yet — informational column for the
--      admin moderation tab when that's built.
--
-- Run after migration 011. Idempotent.
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS booking_lock_until  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signup_ip           TEXT;

CREATE INDEX IF NOT EXISTS users_booking_lock_idx
  ON public.users (booking_lock_until)
  WHERE booking_lock_until IS NOT NULL;

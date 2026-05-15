-- ============================================================
-- Per-tutor Cal.com OAuth credentials + event-type binding.
--
-- Tutors authorize Karman to read their Cal account once (standard
-- OAuth 2.0 authorize → callback flow). We persist their access
-- token + refresh token here, plus the event-type id we'll point
-- students at. Refresh runs lazily on token expiry.
--
-- Adapter (`src/lib/integrations/cal/adapter.ts`) still uses the
-- global `CAL_API_KEY` for createBooking / cancel / reschedule —
-- those work because the event-type id alone routes the booking
-- to the right tutor's calendar. The per-tutor OAuth token is
-- used only for tutor-specific reads (listing event-types).
--
-- Columns:
--   cal_oauth_access_token   — current bearer token, refreshed lazily
--   cal_oauth_refresh_token  — used to refresh access_token on expiry
--   cal_oauth_expires_at     — when access_token expires (UTC)
--   cal_event_type_id        — Cal's numeric event-type id students book against
--   cal_event_type_title     — human-readable title we matched/picked, for UI
--   cal_connected_at         — first successful OAuth callback (NULL = not yet connected)
--   cal_setup_alerted_at     — last time we emailed admin that this tutor needs setup
--                              (dedup so we don't email on every student page load)
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS cal_oauth_access_token  TEXT,
  ADD COLUMN IF NOT EXISTS cal_oauth_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS cal_oauth_expires_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cal_event_type_id       BIGINT,
  ADD COLUMN IF NOT EXISTS cal_event_type_title    TEXT,
  ADD COLUMN IF NOT EXISTS cal_connected_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cal_setup_alerted_at    TIMESTAMPTZ;

-- Quick lookup: "find tutors who connected but never picked an event-type"
-- (drives the dropdown-required state on /tutor/settings/booking).
CREATE INDEX IF NOT EXISTS idx_users_cal_needs_event_type
  ON public.users (id)
  WHERE cal_connected_at IS NOT NULL AND cal_event_type_id IS NULL;

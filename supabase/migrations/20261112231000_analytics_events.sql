-- ============================================================
-- First-party product analytics (founder, 2026-11-12: "collect a ton of data on my users ...
-- understanding what they want, what they don't want, what they're spending their time on").
--
-- analytics_events   one row per page view, time-on-page chunk, click on a tracked button,
--                    question viewed, calculator opened, and the funnel steps (signup,
--                    onboarding done, test started, checkout started, paid).
--
-- What is NOT here, on purpose:
--   * per-question answers: quiz_run_responses / catalog_practice_responses /
--     question_responses already hold is_correct, response_time_seconds, used_hint and
--     answered_at. The scoring algorithms read those tables.
--   * IP addresses, emails, names, free text a person typed, full referrer URLs or query
--     strings. The server (src/app/api/track/route.ts) only accepts a fixed list of event
--     names with short, pattern-checked properties.
--
-- Who writes: the server only (service role), after its own consent check: public-site events
-- only with the visitor's analytics consent (src/lib/analytics/consent.ts); portal events only
-- for a signed-in user. Who reads: admin pages, through the service role after requireAdmin().
-- No policies on purpose, like public.plan_grants.
--
-- Retention: raw rows are kept 13 months (ANALYTICS_RETENTION_MONTHS in
-- src/lib/analytics/events.ts); older rows are deleted by the server.
--
-- Additive only. Rollback:
--   drop view if exists public.analytics_daily_people;
--   drop table if exists public.analytics_events;
-- ============================================================

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id             BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  received_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  -- Clerk user id (same as quiz_runs.student_id, plan_grants.user_id); null when signed out.
  user_id        TEXT         CHECK (user_id IS NULL OR char_length(user_id) BETWEEN 1 AND 64),
  -- Random ids made in the browser: one per device (kept in local storage), one per visit.
  anonymous_id   UUID,
  session_id     UUID,
  surface        TEXT         NOT NULL CHECK (surface IN ('site', 'portal', 'server')),
  -- Path only, ids replaced by ":id", no query string.
  path           TEXT         CHECK (path IS NULL OR (char_length(path) <= 200 AND path ~ '^/')),
  name           TEXT         NOT NULL CHECK (name ~ '^[a-z][a-z0-9_]{1,47}$'),
  props          JSONB        NOT NULL DEFAULT '{}'::jsonb
                              CHECK (jsonb_typeof(props) = 'object' AND pg_column_size(props) <= 2048),
  -- Only on a public-site visit's first page: where the visitor came from.
  referrer_host  TEXT         CHECK (referrer_host IS NULL OR char_length(referrer_host) <= 100),
  utm_source     TEXT         CHECK (utm_source IS NULL OR char_length(utm_source) <= 100),
  utm_medium     TEXT         CHECK (utm_medium IS NULL OR char_length(utm_medium) <= 100),
  utm_campaign   TEXT         CHECK (utm_campaign IS NULL OR char_length(utm_campaign) <= 100),
  device         TEXT         CHECK (device IS NULL OR device IN ('phone', 'tablet', 'desktop'))
);

COMMENT ON TABLE public.analytics_events IS
  'First-party usage events (page views, time on page, tracked clicks, funnel steps). No IPs, emails or typed text. Server writes, admins read. Rules in src/lib/analytics/.';

CREATE INDEX IF NOT EXISTS analytics_events_occurred_idx
  ON public.analytics_events (occurred_at);
CREATE INDEX IF NOT EXISTS analytics_events_name_idx
  ON public.analytics_events (name, occurred_at);
CREATE INDEX IF NOT EXISTS analytics_events_user_idx
  ON public.analytics_events (user_id, occurred_at) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS analytics_events_anon_idx
  ON public.analytics_events (anonymous_id) WHERE anonymous_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS analytics_events_session_idx
  ON public.analytics_events (session_id) WHERE session_id IS NOT NULL;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: only the service role (which bypasses RLS) reads or writes.
REVOKE ALL ON TABLE public.analytics_events FROM public, anon, authenticated;
REVOKE ALL ON SEQUENCE public.analytics_events_id_seq FROM public, anon, authenticated;

-- One row per person, day and surface: the cheap source for daily-active and minutes charts.
-- A day is a US Central calendar day. security_invoker so the view never lends the owner's
-- rights to a caller.
CREATE OR REPLACE VIEW public.analytics_daily_people
  WITH (security_invoker = true) AS
SELECT
  (occurred_at AT TIME ZONE 'America/Chicago')::date               AS day,
  surface,
  user_id,
  CASE WHEN user_id IS NULL THEN anonymous_id END                  AS anonymous_id,
  count(*)::bigint                                                 AS events,
  count(*) FILTER (WHERE name = 'page_view')::bigint               AS page_views,
  coalesce(sum(CASE WHEN name = 'page_time' AND jsonb_typeof(props -> 'seconds') = 'number'
                    THEN (props ->> 'seconds')::numeric END), 0)::bigint AS active_seconds,
  count(DISTINCT session_id)::bigint                               AS sessions
FROM public.analytics_events
WHERE surface <> 'server'
GROUP BY 1, 2, 3, 4;

COMMENT ON VIEW public.analytics_daily_people IS
  'Per person, day (US Central) and surface: events, page views, active seconds, visits. Admin reads only.';

REVOKE ALL ON TABLE public.analytics_daily_people FROM public, anon, authenticated;

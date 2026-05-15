// ============================================================
// Cal.com OAuth 2.0 — per-tutor authorize / token exchange / refresh /
// event-type listing.
//
// Flow:
//   1. Tutor clicks "Connect Cal account" → GET /api/cal/oauth/start
//      → we redirect to getAuthorizeUrl(state) on app.cal.com.
//   2. Tutor authorizes → Cal redirects to GET /api/cal/oauth/callback
//      with ?code=...&state=... → we verify state and call
//      exchangeCodeForTokens(code) to get access + refresh tokens.
//   3. We listEventTypes(accessToken), try pickEventTypeByKeyword()
//      to auto-match, fall back to the tutor picking from a dropdown
//      on /tutor/settings/booking.
//   4. The student-booking flow (createBooking / cancel / reschedule)
//      keeps using the global CAL_API_KEY because event-type-id alone
//      routes the booking to the right tutor's calendar. We only
//      need the per-tutor token for reading tutor-specific data
//      (their event-types).
//
// Token refresh runs lazily when an access token is within 60 seconds
// of expiry. See getValidCalAccessToken() in queries/cal-oauth.ts.
// ============================================================

import { calApiUrl } from "./adapter";
import { CalAdapterError } from "./types";

/** Standard authorize endpoint. Cal Cloud only — self-hosted users
 *  point CAL_OAUTH_AUTHORIZE_URL at their own deployment. */
const DEFAULT_AUTHORIZE_URL = "https://app.cal.com/auth/oauth2/authorize";

/** Default token-exchange endpoint. Per Cal docs:
 *  https://cal.com/docs/api-reference/v2/oauth2/exchange-authorization-code-or-refresh-token-for-tokens
 *  The path is `/v2/auth/oauth2/token` — note the `auth/` segment that
 *  isn't on the authorize URL (which is `/auth/oauth2/authorize` on
 *  the app.cal.com domain). Sending the shorter `/v2/oauth2/token`
 *  returns 404 (confirmed during PR #33 live testing). */
const DEFAULT_TOKEN_URL = "https://api.cal.com/v2/auth/oauth2/token";

/** Scopes Karman needs from a tutor:
 *   · EVENT_TYPE_READ — list the tutor's event-types so we can pick
 *     which one is the Karman session.
 *   · BOOKING_READ + BOOKING_WRITE — future use (today we still use
 *     the global CAL_API_KEY for booking writes, but requesting these
 *     up front avoids a re-consent prompt later).
 *   · SCHEDULE_READ — future use for displaying availability.
 *   · PROFILE_READ — fetch tutor name/email for the connection status
 *     UI on /tutor/settings/booking. */
const SCOPES = [
  "EVENT_TYPE_READ",
  "BOOKING_READ",
  "BOOKING_WRITE",
  "SCHEDULE_READ",
  "PROFILE_READ",
];

interface OAuthEnv {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizeUrl: string;
  tokenUrl: string;
}

function loadOAuthEnv(): OAuthEnv {
  const clientId = process.env.CAL_OAUTH_CLIENT_ID;
  const clientSecret = process.env.CAL_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.CAL_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new CalAdapterError(
      "oauth-init",
      0,
      null,
      "Cal OAuth env vars not set (CAL_OAUTH_CLIENT_ID, CAL_OAUTH_CLIENT_SECRET, CAL_OAUTH_REDIRECT_URI)"
    );
  }
  return {
    clientId,
    clientSecret,
    redirectUri,
    authorizeUrl: process.env.CAL_OAUTH_AUTHORIZE_URL ?? DEFAULT_AUTHORIZE_URL,
    tokenUrl: process.env.CAL_OAUTH_TOKEN_URL ?? DEFAULT_TOKEN_URL,
  };
}

/** Build the URL we redirect the tutor to. State is signed by us
 *  (set as a cookie before redirect) and verified on the callback
 *  to prevent CSRF. */
export function getAuthorizeUrl(state: string): string {
  const { clientId, redirectUri, authorizeUrl } = loadOAuthEnv();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
    state,
  });
  return `${authorizeUrl}?${params.toString()}`;
}

export interface CalOAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/** Internal helper — Cal's token endpoint returns { access_token,
 *  refresh_token, expires_in, token_type, scope } on success. */
async function postToTokenEndpoint(body: Record<string, string>): Promise<CalOAuthTokens> {
  const { tokenUrl } = loadOAuthEnv();
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(body).toString(),
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!res.ok) {
    throw new CalAdapterError("oauth-token", res.status, parsed);
  }
  const p = parsed as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  } | null;
  if (!p?.access_token || !p?.refresh_token || typeof p.expires_in !== "number") {
    throw new CalAdapterError(
      "oauth-token",
      res.status,
      parsed,
      "token response missing access_token / refresh_token / expires_in"
    );
  }
  return {
    accessToken: p.access_token,
    refreshToken: p.refresh_token,
    expiresAt: new Date(Date.now() + p.expires_in * 1000),
  };
}

/** First-leg exchange: ?code=... from the callback for the initial
 *  access + refresh token pair. */
export async function exchangeCodeForTokens(code: string): Promise<CalOAuthTokens> {
  const { clientId, clientSecret, redirectUri } = loadOAuthEnv();
  return postToTokenEndpoint({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });
}

/** Lazy refresh — called when the stored access_token is within
 *  60 seconds of expiry. */
export async function refreshAccessToken(refreshToken: string): Promise<CalOAuthTokens> {
  const { clientId, clientSecret } = loadOAuthEnv();
  return postToTokenEndpoint({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
}

export interface CalEventType {
  id: number;
  title: string;
  /** Cal's user-facing slug, e.g. "karman-sat-session". */
  slug: string;
  /** Length of the event in minutes. */
  lengthInMinutes: number;
}

interface ListEventTypesResponse {
  eventTypeGroups?: Array<{
    eventTypes?: Array<{
      id?: number;
      title?: string;
      slug?: string;
      lengthInMinutes?: number;
      length?: number;
    }>;
  }>;
  // Older shape: flat list at the root.
  eventTypes?: Array<{
    id?: number;
    title?: string;
    slug?: string;
    lengthInMinutes?: number;
    length?: number;
  }>;
}

/** List the tutor's event-types using their OAuth access token.
 *  Used by /tutor/settings/booking and by the OAuth callback to
 *  auto-match a Karman event-type.
 *
 *  Note the cal-api-version header: the event-types endpoint pins
 *  to "2024-06-14" per Cal's docs (booking endpoints use 2024-08-13
 *  but event-types lives on the older pin). Sending the booking
 *  version returns 404 from Cal's router (confirmed during PR #33
 *  live testing). */
export async function listEventTypes(accessToken: string): Promise<CalEventType[]> {
  const url = `${calApiUrl()}/event-types`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "cal-api-version": "2024-06-14",
    },
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!res.ok) {
    throw new CalAdapterError("listEventTypes", res.status, parsed);
  }
  // Cal v2 returns { status, data: { eventTypeGroups: [...] } } most
  // of the time. The adapter has special-case unwrap for { data }, so
  // here we get the inner object directly when called via fetch.
  const root = (parsed as { data?: ListEventTypesResponse } | null)?.data ?? parsed;
  const flat: CalEventType[] = [];
  const groups = (root as ListEventTypesResponse | null)?.eventTypeGroups ?? [];
  for (const g of groups) {
    for (const ev of g.eventTypes ?? []) {
      if (typeof ev.id !== "number" || !ev.title || !ev.slug) continue;
      flat.push({
        id: ev.id,
        title: ev.title,
        slug: ev.slug,
        lengthInMinutes: ev.lengthInMinutes ?? ev.length ?? 60,
      });
    }
  }
  // Fallback if older shape.
  if (flat.length === 0) {
    for (const ev of (root as ListEventTypesResponse | null)?.eventTypes ?? []) {
      if (typeof ev.id !== "number" || !ev.title || !ev.slug) continue;
      flat.push({
        id: ev.id,
        title: ev.title,
        slug: ev.slug,
        lengthInMinutes: ev.lengthInMinutes ?? ev.length ?? 60,
      });
    }
  }
  return flat;
}

/** Try to auto-pick the Karman event-type from a tutor's list by
 *  keyword match in the title or slug. Returns the single match if
 *  there's exactly one; returns null if zero or multiple match (the
 *  UI then falls back to a dropdown). */
export function pickEventTypeByKeyword(eventTypes: CalEventType[]): CalEventType | null {
  const KEYWORDS = ["karman", "sat"];
  const matches = eventTypes.filter((ev) => {
    const haystack = `${ev.title} ${ev.slug}`.toLowerCase();
    return KEYWORDS.some((kw) => haystack.includes(kw));
  });
  if (matches.length === 1) return matches[0];
  return null;
}

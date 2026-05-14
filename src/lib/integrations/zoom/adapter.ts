// ============================================================
// Zoom Server-to-Server OAuth adapter — THE ONLY FILE in the
// codebase allowed to call Zoom's REST API directly. Add new
// functions here rather than fetching api.zoom.us elsewhere.
//
// Used to layer per-attendee unique join URLs on top of meetings
// Cal.com creates for our bookings. Flow on each booking:
//   1. Cal creates the Zoom meeting on Zakaria's account.
//   2. We PATCH that meeting to require registration.
//   3. We register the booking's student → Zoom returns a join
//      URL that's unique to that registrant + single-use.
//   4. We save the unique URL as bookings.zoom_join_url.
//
// Required Zoom S2S OAuth scopes:
//   · meeting:read:meeting:admin
//   · meeting:write:meeting:admin       (for PATCH meeting)
//   · meeting:write:registrant:admin    (for adding registrants)
// ============================================================

const ZOOM_OAUTH_URL = "https://zoom.us/oauth/token";
const ZOOM_API_BASE = "https://api.zoom.us/v2";

interface CachedToken {
  accessToken: string;
  expiresAt: number; // ms epoch
}
let cachedToken: CachedToken | null = null;

export class ZoomAdapterError extends Error {
  constructor(
    public readonly operation: string,
    public readonly statusCode: number,
    public readonly body: unknown,
    message?: string
  ) {
    super(message ?? `zoom-adapter:${operation} failed (status ${statusCode})`);
    this.name = "ZoomAdapterError";
  }
}

interface AdapterEnv {
  accountId: string;
  clientId: string;
  clientSecret: string;
}

function loadEnv(): AdapterEnv {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  if (!accountId || !clientId || !clientSecret) {
    throw new ZoomAdapterError(
      "init",
      0,
      null,
      "ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET must all be set"
    );
  }
  return { accountId, clientId, clientSecret };
}

/** Fetch a fresh access token, or return the cached one if still valid.
 *  S2S OAuth tokens are valid for 1 hour; we refresh 5 minutes early. */
async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60_000) {
    return cachedToken.accessToken;
  }

  const { accountId, clientId, clientSecret } = loadEnv();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(
    `${ZOOM_OAUTH_URL}?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`,
    {
      method: "POST",
      headers: { Authorization: `Basic ${basic}` },
    }
  );
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  if (!res.ok) {
    throw new ZoomAdapterError("oauth", res.status, parsed);
  }
  const body = parsed as { access_token?: string; expires_in?: number };
  if (!body.access_token) {
    throw new ZoomAdapterError("oauth", res.status, parsed, "Zoom returned no access_token");
  }
  cachedToken = {
    accessToken: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
  return cachedToken.accessToken;
}

interface ZoomRequestOptions {
  operation: string;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
}

async function callZoom<T>(opts: ZoomRequestOptions): Promise<T> {
  const token = await getAccessToken();
  const url = `${ZOOM_API_BASE}${opts.path}`;
  const startedAt = Date.now();
  console.log(
    `[zoom-adapter] ${new Date().toISOString()} ${opts.operation} → ${opts.method} ${opts.path}`
  );

  const res = await fetch(url, {
    method: opts.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  console.log(
    `[zoom-adapter] ${opts.operation} done in ${Date.now() - startedAt}ms (HTTP ${res.status})`
  );

  if (!res.ok) {
    throw new ZoomAdapterError(opts.operation, res.status, parsed);
  }
  return parsed as T;
}

// ─────────────────────────────────────────────────────────────
// Public surface
// ─────────────────────────────────────────────────────────────

/** Flip a meeting to require registration. Cal creates meetings with
 *  approval_type=2 (no registration). After this PATCH, attendees must
 *  register via /meetings/{id}/registrants to get a join URL.
 *
 *  Idempotent — calling this on a meeting that's already in
 *  registration mode is a no-op (Zoom returns 204 either way). */
export async function enableMeetingRegistration(meetingId: string): Promise<void> {
  await callZoom<void>({
    operation: "enableMeetingRegistration",
    method: "PATCH",
    path: `/meetings/${encodeURIComponent(meetingId)}`,
    body: {
      settings: {
        // 0 = automatically approve everyone who registers; we still
        // gate registration ourselves (only registered students can join).
        approval_type: 0,
        // 1 = attendees register once and can attend any (or the only) occurrence.
        registration_type: 1,
      },
    },
  });
}

export interface ZoomRegistrant {
  /** Single-use join URL unique to this registrant. */
  join_url: string;
  /** Zoom's registrant id, in case we need to delete/lookup later. */
  registrant_id: string;
  /** Echo of the meeting id this registrant was added to. */
  id?: number;
  topic?: string;
  start_time?: string;
}

/** Add a single attendee to a registration-enabled meeting. Returns
 *  the unique join URL Zoom mints for them. The URL embeds a tk= token
 *  so reusing it from a different account / second tab is rejected. */
export async function registerAttendee(args: {
  meetingId: string;
  email: string;
  /** First name is required by Zoom; last is optional. */
  firstName: string;
  lastName?: string;
}): Promise<ZoomRegistrant> {
  return callZoom<ZoomRegistrant>({
    operation: "registerAttendee",
    method: "POST",
    path: `/meetings/${encodeURIComponent(args.meetingId)}/registrants`,
    body: {
      first_name: args.firstName,
      last_name: args.lastName ?? "",
      email: args.email,
    },
  });
}

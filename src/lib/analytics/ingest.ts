// ============================================================
// The work behind POST /api/track, with its outside pieces passed in so it is unit-tested
// without Next or a database (ingest.test.ts): size limit, Zod validation, the consent gate
// per event, the per-visit rate limit, and the rows written. No IP address is ever read.
// ============================================================

import type { Region } from "@/lib/consent/regions";
import { mayRecord } from "./consent";
import { batchSchema, cleanEvents } from "./events";
import { MAX_BODY_BYTES, SESSION_EVENTS_PER_MINUTE, surfaceOf } from "./shared";
import { SessionRateLimiter } from "./rate-limit";

export interface AnalyticsRow {
  occurred_at: string;
  user_id: string | null;
  anonymous_id: string | null;
  session_id: string | null;
  surface: "site" | "portal" | "server";
  path: string | null;
  name: string;
  props: Record<string, unknown>;
  referrer_host?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  device?: string | null;
}

export interface IngestRequest {
  /** The raw body text. */
  body: string;
  /** Signed-in Clerk user id, or null. */
  userId: string | null;
  consentCookie: string | null;
  region: Region;
  dnt: string | null;
  gpc: string | null;
}

export interface IngestResult {
  status: 200 | 400 | 413;
  recorded: number;
  dropped: number;
  rows: AnalyticsRow[];
}

const sharedLimiter = new SessionRateLimiter(SESSION_EVENTS_PER_MINUTE);

export function ingest(
  req: IngestRequest,
  opts: { now?: number; limiter?: SessionRateLimiter } = {}
): IngestResult {
  const now = opts.now ?? Date.now();
  const limiter = opts.limiter ?? sharedLimiter;
  if (new TextEncoder().encode(req.body).length > MAX_BODY_BYTES) {
    return { status: 413, recorded: 0, dropped: 0, rows: [] };
  }
  let json: unknown;
  try {
    json = JSON.parse(req.body);
  } catch {
    return { status: 400, recorded: 0, dropped: 0, rows: [] };
  }
  const parsed = batchSchema.safeParse(json);
  if (!parsed.success) return { status: 400, recorded: 0, dropped: 0, rows: [] };
  const batch = parsed.data;

  const events = cleanEvents(batch, now);
  const gate = {
    cookie: req.consentCookie,
    region: req.region,
    dnt: req.dnt,
    gpc: req.gpc,
    signedIn: !!req.userId,
  };
  const allowed = events.filter((e) => mayRecord(surfaceOf(e.path), gate));
  const granted = allowed.length ? limiter.take(batch.sessionId, allowed.length, now) : 0;
  const kept = allowed.slice(0, granted);

  let entryUsed = false;
  const rows: AnalyticsRow[] = kept.map((e) => {
    const surface = surfaceOf(e.path);
    const row: AnalyticsRow = {
      occurred_at: e.occurredAt,
      user_id: req.userId,
      anonymous_id: batch.anonymousId,
      session_id: batch.sessionId,
      surface,
      path: e.path,
      name: e.name,
      props: e.props,
      device: batch.device ?? null,
    };
    // Where the visit came from goes on its first public-site page view only.
    if (batch.entry && !entryUsed && surface === "site" && e.name === "page_view") {
      entryUsed = true;
      row.referrer_host = batch.entry.referrerHost?.toLowerCase() ?? null;
      row.utm_source = batch.entry.utmSource ?? null;
      row.utm_medium = batch.entry.utmMedium ?? null;
      row.utm_campaign = batch.entry.utmCampaign ?? null;
    }
    return row;
  });

  return {
    status: 200,
    recorded: rows.length,
    dropped: batch.events.length - rows.length,
    rows,
  };
}

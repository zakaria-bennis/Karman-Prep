// ============================================================
// Browser side of Karman's own analytics. `track(name, props)` queues an event; the queue is
// sent to POST /api/track in small batches (every few seconds, or with sendBeacon when the
// page is hidden or closed). Nothing is sent to anyone else.
//
// The browser checks consent first so nothing is even stored without it, and the server checks
// again (src/lib/analytics/consent.ts), so a tampered browser can't record a declined visitor.
//   * Public site: only after "Allow all", or where no banner is asked (siteDefault), and never
//     with Do Not Track or Global Privacy Control on.
//   * Signed-in portals: always (product use, read by tutors). The server drops it when signed out.
// ============================================================

import type { ClientEventName } from "./events";
import { MAX_BATCH, surfaceOf } from "./shared";

const CONSENT_COOKIE = "karman_replay_consent";
const DEVICE_KEY = "karman-aid";
const VISIT_KEY = "karman-visit";
const VISIT_IDLE_MS = 30 * 60_000;
const FLUSH_MS = 5_000;

interface Queued {
  name: ClientEventName;
  path: string;
  at: number;
  props?: Record<string, unknown>;
}

let siteDefault = false;
let queue: Queued[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

/** Called once by AnalyticsTracker: may the public site record before any banner answer? */
export function configureAnalytics(opts: { siteDefault: boolean }) {
  siteDefault = opts.siteDefault;
}

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function privacySignal(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.doNotTrack === "1" || nav.globalPrivacyControl === true;
}

/** May this page record anything at all? */
export function recordingAllowed(path: string): boolean {
  if (typeof window === "undefined") return false;
  if (surfaceOf(path) === "portal") return true;
  if (privacySignal()) return false;
  const choice = readCookie(CONSENT_COOKIE);
  if (choice === "no") return false;
  if (choice === "yes") return true;
  return siteDefault;
}

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function newId(): string {
  return crypto.randomUUID();
}

function deviceId(): string {
  const s = store();
  let id = s?.getItem(DEVICE_KEY) ?? null;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    id = newId();
    s?.setItem(DEVICE_KEY, id);
  }
  return id;
}

/** The visit: a new one after 30 minutes without activity, shared by the device's tabs. */
function visit(): { id: string; fresh: boolean } {
  const s = store();
  const now = Date.now();
  let saved: { id: string; last: number; entry?: boolean } | null = null;
  try {
    saved = JSON.parse(s?.getItem(VISIT_KEY) ?? "null");
  } catch {
    saved = null;
  }
  const fresh = !saved || typeof saved.id !== "string" || now - saved.last > VISIT_IDLE_MS;
  const next = fresh ? { id: newId(), last: now, entry: false } : { ...saved!, last: now };
  s?.setItem(VISIT_KEY, JSON.stringify(next));
  return { id: next.id, fresh: !next.entry };
}

function markEntrySent() {
  const s = store();
  try {
    const saved = JSON.parse(s?.getItem(VISIT_KEY) ?? "null");
    if (saved) s?.setItem(VISIT_KEY, JSON.stringify({ ...saved, entry: true }));
  } catch {
    // nothing to mark
  }
}

function device(): "phone" | "tablet" | "desktop" {
  const w = window.innerWidth;
  return w < 640 ? "phone" : w < 1024 ? "tablet" : "desktop";
}

/** Where a visit came from: the other site's host and the campaign tags, nothing more. */
function entry() {
  const out: Record<string, string> = {};
  try {
    if (document.referrer) {
      const host = new URL(document.referrer).hostname;
      if (host && host !== location.hostname) out.referrerHost = host.slice(0, 100);
    }
  } catch {
    // unreadable referrer
  }
  const q = new URLSearchParams(location.search);
  const tag = (k: string) => {
    const v = q.get(k);
    return v && /^[\w .+-]{1,100}$/.test(v) && !v.includes("@") ? v : undefined;
  };
  const source = tag("utm_source");
  const medium = tag("utm_medium");
  const campaign = tag("utm_campaign");
  if (source) out.utmSource = source;
  if (medium) out.utmMedium = medium;
  if (campaign) out.utmCampaign = campaign;
  return out;
}

/** Queue one event for the current page (or `path`). Never throws, never blocks. */
export function track(name: ClientEventName, props?: Record<string, unknown>, path?: string) {
  try {
    if (typeof window === "undefined") return;
    const where = path ?? location.pathname;
    if (!recordingAllowed(where)) return;
    queue.push({ name, path: where, at: Date.now(), props });
    if (queue.length >= MAX_BATCH) flush();
    else if (!timer) timer = setTimeout(() => flush(), FLUSH_MS);
  } catch {
    // analytics must never break a page
  }
}

/** Send what is queued. `leaving` uses sendBeacon so it survives the page closing. */
export function flush(leaving = false) {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!queue.length || typeof window === "undefined") return;
  const events = queue.slice(0, MAX_BATCH);
  queue = queue.slice(MAX_BATCH);
  try {
    const v = visit();
    const first = events[0];
    const withEntry = v.fresh && surfaceOf(first.path) === "site";
    const body = JSON.stringify({
      anonymousId: deviceId(),
      sessionId: v.id,
      device: device(),
      ...(withEntry ? { entry: entry() } : {}),
      events,
    });
    if (v.fresh) markEntrySent();
    const sent =
      leaving && navigator.sendBeacon
        ? navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }))
        : false;
    if (!sent) {
      void fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
        credentials: "same-origin",
      }).catch(() => {});
    }
  } catch {
    // dropped: analytics is best effort
  }
  if (queue.length) flush(leaving);
}

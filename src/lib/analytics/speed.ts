// ============================================================
// Speed recording (founder, 2026-11-23: "I wait about 4 seconds between things; make it under a
// second"). A wait starts with speedStart and ends with speedEnd, which sends one `speed` event:
// the kind of wait and its length in milliseconds. Nothing else: no question, no answer, no text.
// Browser only; never throws.
// ============================================================

import { track } from "./client";

export type SpeedAction =
  | "page_open"
  | "tab_switch"
  | "quiz_fetch"
  | "quiz_start"
  | "next_question"
  | "checkout";

const started = new Map<SpeedAction, number>();
const MAX_MS = 120_000;

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** A wait of this kind begins now (a later start replaces an unfinished one). */
export function speedStart(action: SpeedAction) {
  started.set(action, now());
}

/** The wait of this kind is over: records how long it took. Does nothing if none was started. */
export function speedEnd(action: SpeedAction): number | null {
  const at = started.get(action);
  if (at === undefined) return null;
  started.delete(action);
  return speedRecord(action, now() - at);
}

/** Records a wait measured elsewhere (the browser's own page-load timing). */
export function speedRecord(action: SpeedAction, ms: number, ttfb?: number): number | null {
  if (!Number.isFinite(ms) || ms < 0 || ms > MAX_MS) return null;
  const props: Record<string, number | string> = { action, ms: Math.round(ms) };
  if (ttfb !== undefined && Number.isFinite(ttfb) && ttfb >= 0 && ttfb <= MAX_MS)
    props.ttfb = Math.round(ttfb);
  track("speed", props);
  return props.ms as number;
}

/** Ends the wait after the browser has painted the change (two frames). */
export function speedEndAfterPaint(action: SpeedAction) {
  if (!started.has(action) || typeof requestAnimationFrame === "undefined") return;
  requestAnimationFrame(() => requestAnimationFrame(() => speedEnd(action)));
}

/** The first page load of a visit tab: until the page could be used, and the server's share. */
export function recordPageOpen() {
  try {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (!nav) return;
    const send = () =>
      speedRecord("page_open", nav.domContentLoadedEventEnd || nav.duration, nav.responseStart);
    if (nav.domContentLoadedEventEnd > 0) send();
    else addEventListener("DOMContentLoaded", () => setTimeout(send, 0), { once: true });
  } catch {
    // older browsers have no navigation timing
  }
}

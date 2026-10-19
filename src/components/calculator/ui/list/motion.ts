// Motion lifecycles read their timing from CSS: a row
// exit, a closing panel or popover and Collapse list wait as long as the element's own computed
// transition-duration, so reduced motion (every duration 0ms, AN-13) finishes at once. Component
// tests provide a fixed duration through MotionContext instead.

import { createContext } from "react";

/** One transition-duration entry ("0.2s", "100ms") in ms, or null when it does not parse. */
function entryMs(entry: string): number | null {
  const match = /^([+]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(ms|s)$/i.exec(entry.trim());
  if (match === null) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;
  return match[2].toLowerCase() === "s" ? amount * 1000 : amount;
}

/** The longest computed transition-duration entry of `el` in ms; 0 if none parses. */
export function readDurationMs(el: Element): number {
  const view = el.ownerDocument.defaultView;
  const style = view ? view.getComputedStyle(el) : getComputedStyle(el);
  let longest = 0;
  for (const entry of (style.transitionDuration ?? "").split(",")) {
    const ms = entryMs(entry);
    if (ms !== null && ms > longest) longest = ms;
  }
  return longest;
}

export const MotionContext = createContext<(el: Element) => number>(readDurationMs);

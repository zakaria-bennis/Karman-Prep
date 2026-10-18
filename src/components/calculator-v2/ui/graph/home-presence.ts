// The Home button's presence (AN-8): it fades in when the view leaves the default and fades out
// when it returns. "entering" holds opacity 0 for two animation frames (the first lets that
// opacity resolve) so the CSS transition runs; "leaving" keeps the button mounted for the fade
// time. A fade time of 0 (reduced motion, AN-13) shows and removes it at once.

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type HomePhase = "absent" | "entering" | "present" | "leaving";

type Timers = { frames: number[]; timeout: ReturnType<typeof setTimeout> | null };

function cancelTimers(timers: Timers): void {
  for (const id of timers.frames.splice(0)) cancelAnimationFrame(id);
  if (timers.timeout !== null) clearTimeout(timers.timeout);
  timers.timeout = null;
}

/** The Home button's phase for `show`; `fadeMs` is read at each change. No fade on mount. */
export function useHomePresence(show: boolean, fadeMs: () => number): HomePhase {
  const [phase, setPhase] = useState<HomePhase>(show ? "present" : "absent");
  const current = useRef(phase);
  const fade = useRef(fadeMs);
  const timers = useRef<Timers>({ frames: [], timeout: null });

  useLayoutEffect(() => {
    fade.current = fadeMs;
  });

  useLayoutEffect(() => {
    const t = timers.current;
    const go = (next: HomePhase): void => {
      current.current = next;
      setPhase(next);
    };
    const from = current.current;
    if (show) {
      if (from === "present" || from === "entering") return;
      cancelTimers(t);
      // While leaving, the button is still mounted, so the opacity transition just reverses.
      if (from === "leaving" || fade.current() <= 0) {
        go("present");
        return;
      }
      go("entering");
      t.frames.push(
        requestAnimationFrame(() => {
          t.frames.push(
            requestAnimationFrame(() => {
              t.frames.length = 0;
              go("present");
            })
          );
        })
      );
    } else {
      if (from === "absent" || from === "leaving") return;
      cancelTimers(t);
      const ms = fade.current();
      if (!(ms > 0)) {
        go("absent");
        return;
      }
      go("leaving");
      t.timeout = setTimeout(() => {
        t.timeout = null;
        go("absent");
      }, ms);
    }
  }, [show]);

  useEffect(() => {
    const t = timers.current;
    return () => cancelTimers(t);
  }, []);

  return phase;
}

/** One CSS time ("0.1s", "250ms") in ms; NaN when it cannot be parsed. */
function parseTime(value: string | undefined): number {
  const match = /^\s*(-?[\d.]+(?:e[+-]?\d+)?)(ms|s)\s*$/i.exec(value ?? "");
  if (match === null) return Number.NaN;
  const n = Number(match[1]);
  return match[2].toLowerCase() === "s" ? n * 1000 : n;
}

/**
 * The Home fade time in ms: the computed duration of `element`'s opacity (or `all`) transition,
 * or 0 under reduced motion, with no element, or when it cannot be read.
 */
export function homeFadeMs(reducedMotion: boolean, element: Element | null): number {
  if (reducedMotion || element === null) return 0;
  const style = getComputedStyle(element);
  const properties = (style.transitionProperty ?? "").split(",").map((p) => p.trim());
  const durations = (style.transitionDuration ?? "").split(",");
  const index = properties.findIndex((p) => p === "opacity" || p === "all");
  if (index < 0 || durations.length === 0) return 0;
  // CSS repeats the duration list to match the property list.
  const ms = parseTime(durations[index % durations.length]);
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
}

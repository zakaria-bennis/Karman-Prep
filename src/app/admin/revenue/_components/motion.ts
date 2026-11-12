"use client";

// Motion helpers for the Revenue page. Everything holds still when the device asks for reduced
// motion or the portal's own "Reduce motion" is on (STILL_ATTR on the root element).

import { useEffect, useRef, useState } from "react";
import { STILL_ATTR } from "@/lib/painting/motion";

export function isStill(): boolean {
  if (typeof window === "undefined") return true;
  return (
    (typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) ||
    document.documentElement.hasAttribute(STILL_ATTR)
  );
}

const ease = (p: number) => 1 - Math.pow(1 - p, 4);

/**
 * A number that counts to `target`: up from zero when the page opens, then from the last
 * value whenever the target changes (the period switch). Jumps straight there when still.
 */
export function useCountUp(target: number, duration = 950): number {
  const [shown, setShown] = useState(target);
  const last = useRef<number | null>(null);
  useEffect(() => {
    const from = last.current ?? 0;
    if (isStill() || from === target) {
      last.current = target;
      setShown(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const v = from + (target - from) * ease(p);
      last.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return shown;
}

/** The width of an element, kept up to date, so charts draw in real pixels (text never stretches). */
export function useWidth<T extends HTMLElement>(initial = 640) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) =>
      setWidth(Math.max(260, Math.round(entry.contentRect.width)))
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

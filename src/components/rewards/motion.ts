/*
 * The reward layer's motion gate. Everything that moves asks `stillNow()` first: the device's
 * reduced motion, or the portal's own Settings > Reduce motion (src/lib/painting/motion.ts, which
 * also sets data-kp-still on the root). Still means every moment lands at once, finished.
 */
import { STILL_ATTR, prefersStill } from "@/lib/painting/motion";

/** The reward layer's one easing: expo-out, from the approved end screen. */
export const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export function stillNow(): boolean {
  if (typeof document !== "undefined" && document.documentElement.hasAttribute(STILL_ATTR))
    return true;
  return prefersStill();
}

/** Whether this device is driven by touch (a coarse pointer). */
export function touchNow(): boolean {
  return typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
}

/** Waits, or does not wait at all when still. */
export const wait = (ms: number) =>
  new Promise<void>((r) => window.setTimeout(r, stillNow() ? 0 : ms));

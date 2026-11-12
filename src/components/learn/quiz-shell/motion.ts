"use client";
import { useReducedMotion, type Transition } from "framer-motion";
import { useSyncExternalStore } from "react";
import { MOTION_EVENT, stillChosen } from "@/lib/painting/motion";
import { useQuizAnimations } from "../quiz/QuizTools";

/** The one spring family every shell motion uses (spec: Motion). */
export const SPRING = { type: "spring", stiffness: 520, damping: 32, mass: 1 } as const;
/** A looser spring for drops and pops that should overshoot a little. */
export const BOUNCE = { type: "spring", stiffness: 420, damping: 18, mass: 1 } as const;
export const DUR = { fast: 0.15, base: 0.3, max: 0.5, reward: 0.9, levelUp: 1.6 } as const;
export const FADE: Transition = { duration: DUR.fast, ease: "easeOut" };

function subscribeStill(callback: () => void) {
  window.addEventListener(MOTION_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(MOTION_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Settings > Sound and motion > Reduce motion, chosen in the portal (stored on this device). */
function usePortalStill(): boolean {
  return useSyncExternalStore(subscribeStill, stillChosen, () => false);
}

/** Still when the device asks, when Question animations is off, or when the portal's own Reduce
 * motion is on: every motion in the quiz then shows finished. */
export function useShellMotion(): { reduced: boolean } {
  const system = useReducedMotion();
  const animations = useQuizAnimations();
  const still = usePortalStill();
  return { reduced: !!system || !animations || still };
}

/** The transition for a state change: a spring, or a short fade under reduced motion. */
export function useStateTransition(bounce = false): Transition {
  const { reduced } = useShellMotion();
  return reduced ? FADE : bounce ? BOUNCE : SPRING;
}

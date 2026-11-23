"use client";
import { type Transition } from "framer-motion";
import { useStill } from "@/lib/painting/useStill";
import { useQuizAnimations } from "../quiz/QuizTools";

/** The one spring family every shell motion uses (spec: Motion). */
export const SPRING = { type: "spring", stiffness: 520, damping: 32, mass: 1 } as const;
/** A looser spring for drops and pops that should overshoot a little. */
export const BOUNCE = { type: "spring", stiffness: 420, damping: 18, mass: 1 } as const;
export const DUR = { fast: 0.15, base: 0.3, max: 0.5, reward: 0.9, levelUp: 1.6 } as const;
export const FADE: Transition = { duration: DUR.fast, ease: "easeOut" };

/** Still when the device asks, when Question animations is off, or when the portal's own Reduce
 * motion is on: every motion in the quiz then shows finished. */
export function useShellMotion(): { reduced: boolean } {
  const animations = useQuizAnimations();
  const still = useStill();
  return { reduced: !animations || still };
}

/** The transition for a state change: a spring, or a short fade under reduced motion. */
export function useStateTransition(bounce = false): Transition {
  const { reduced } = useShellMotion();
  return reduced ? FADE : bounce ? BOUNCE : SPRING;
}

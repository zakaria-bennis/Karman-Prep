"use client";

import { useReducedMotion } from "framer-motion";
import { useSyncExternalStore } from "react";
import { MOTION_EVENT, stillChosen } from "@/lib/painting/motion";

// the choice changes here (MOTION_EVENT) or in another tab (storage)
const listen = (changed: () => void) => {
  window.addEventListener(MOTION_EVENT, changed);
  window.addEventListener("storage", changed);
  return () => {
    window.removeEventListener(MOTION_EVENT, changed);
    window.removeEventListener("storage", changed);
  };
};

/** Still when the device asks for less motion or the student chose Reduce motion in Settings. */
export function useStill(): boolean {
  const device = useReducedMotion() ?? false;
  const chosen = useSyncExternalStore(listen, stillChosen, () => false);
  return device || chosen;
}

"use client";
import { useSyncExternalStore } from "react";

export type QuizLayout = "compact" | "medium" | "wide";

/** Breakpoints by available width, not device name (spec: Device layouts). A tablet held sideways
 *  is wide, so it gets the two panes side by side like a computer (founder, 2026-11-26). */
export function layoutForWidth(width: number, height = 0): QuizLayout {
  if (width < 700) return "compact";
  if (width >= 1100 || (width >= 960 && width > height)) return "wide";
  return "medium";
}

function subscribe(callback: () => void) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

export function useQuizLayout(): QuizLayout {
  return useSyncExternalStore(
    subscribe,
    () => layoutForWidth(window.innerWidth, window.innerHeight),
    () => "wide"
  );
}

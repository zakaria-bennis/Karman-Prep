"use client";
import { useSyncExternalStore } from "react";

export type QuizLayout = "compact" | "medium" | "wide";

/** Breakpoints by available width, not device name (spec: Device layouts). */
export function layoutForWidth(width: number): QuizLayout {
  if (width < 700) return "compact";
  if (width < 1100) return "medium";
  return "wide";
}

function subscribe(callback: () => void) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

export function useQuizLayout(): QuizLayout {
  return useSyncExternalStore(
    subscribe,
    () => layoutForWidth(window.innerWidth),
    () => "wide"
  );
}

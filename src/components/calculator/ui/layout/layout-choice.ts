// The student's layout choice (founder decision, 2026-11-01): by default the graph sits on top
// with the rows under it at every size, as on a phone, which keeps more of the graph in view.
// Graph Settings can switch to the rows beside the graph (side by side) instead, which applies
// from LAYOUT_DESKTOP_MIN_WIDTH up. The choice is remembered on the device in localStorage, every
// access in try/catch, like Key Sounds.

import { createContext } from "react";

export type LayoutChoice = "graph-top" | "side-by-side";

/**
 * Whether this calculator follows the layout choice and offers it in Graph Settings: true in the
 * quiz; false on the public /calculator page, which stays side by side as desmos.com/calculator
 * does (founder, 2026-11-01).
 */
export const LayoutSettingContext = createContext(false);

export const LAYOUT_CHOICE_STORAGE_KEY = "karman.calculator.layout";
export const DEFAULT_LAYOUT_CHOICE: LayoutChoice = "graph-top";

type Listener = () => void;
const listeners = new Set<Listener>();
let choice: LayoutChoice | null = null; // read from storage on first use

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The layout this device chose, graph on top unless the student picked side by side. */
export function layoutChoice(): LayoutChoice {
  if (choice === null) {
    try {
      choice =
        storage()?.getItem(LAYOUT_CHOICE_STORAGE_KEY) === "side-by-side"
          ? "side-by-side"
          : DEFAULT_LAYOUT_CHOICE;
    } catch {
      choice = DEFAULT_LAYOUT_CHOICE;
    }
  }
  return choice;
}

/** Sets the layout, remembers it and tells every subscriber. */
export function setLayoutChoice(next: LayoutChoice): void {
  if (next === layoutChoice()) return;
  choice = next;
  try {
    storage()?.setItem(LAYOUT_CHOICE_STORAGE_KEY, next);
  } catch {
    // Full or blocked storage: the choice lasts for this page only.
  }
  for (const listener of listeners) listener();
}

/** useSyncExternalStore's subscribe. */
export function subscribeLayoutChoice(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Tests: forget the cached choice so the next read comes from storage. */
export function resetLayoutChoiceForTest(): void {
  choice = null;
  listeners.clear();
}

/*
 * The order of the Library's two opening moments (founder, 2026-11-08): the Challenge question
 * first, if it shows, then the Math or Reading and Writing choice. The Challenge reports here
 * when it is out of the way (closed, started, or not showing today); the choice waits for it.
 */

let challengeSettled = false;
const listeners = new Set<() => void>();

export const challengeMoment = {
  settle() {
    if (challengeSettled) return;
    challengeSettled = true;
    listeners.forEach((l) => l());
  },
  /** A new Library visit starts unsettled again. */
  reset() {
    challengeSettled = false;
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  settled: () => challengeSettled,
};

/** Today's key for the Challenge close: the Challenge itself changes at midnight UTC. */
export const CHALLENGE_CLOSED_KEY = "karman-challenge-closed";

/** The course picked this visit, with the day it was picked: `2026-11-08:math`. */
export const COURSE_PICK_KEY = "karman-library-course";

export function readStore(store: "local" | "session", key: string): string | null {
  try {
    return (store === "local" ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

export function writeStore(store: "local" | "session", key: string, value: string) {
  try {
    (store === "local" ? localStorage : sessionStorage).setItem(key, value);
  } catch {
    /* storage blocked: remembered until the page reloads */
  }
}

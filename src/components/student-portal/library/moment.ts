/*
 * The order of the Library's two opening moments (founder, 2026-11-08): the Challenge question
 * first, if it shows, then the two paintings that choose Math or Reading and Writing. The Challenge reports here
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

/** The course open in the Library this browser session (`math` or `reading-writing`). Closing
 *  the box clears it, so the two paintings show again next time. */
export const COURSE_PICK_KEY = "karman-library-course";

const OPENING_ATTR = "data-paint-opening";

/** Resolves once the day's painting has finished its opening (or at once if it isn't playing). */
export function afterPaintingOpening(): Promise<void> {
  const root = document.documentElement;
  if (!root.hasAttribute(OPENING_ATTR)) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      observer.disconnect();
      clearTimeout(timer);
      resolve();
    };
    const observer = new MutationObserver(() => !root.hasAttribute(OPENING_ATTR) && done());
    observer.observe(root, { attributes: true, attributeFilter: [OPENING_ATTR] });
    const timer = setTimeout(done, 6000);
  });
}

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

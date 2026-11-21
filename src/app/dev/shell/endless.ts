// Which endless run is open, shared by the pages that start one and the portal that shows it
// (founder, 2026-11-21: it draws from wherever it is started: a skill's page runs that skill, a
// domain's page that domain, and a section's page that whole section). Kept in memory only.
import { useEffect, useRef, useSyncExternalStore } from "react";
import type { Trail } from "./MistakeLog";

export type EndlessRun = { kind: "skill" | "domain" | "section"; name: string };

let now: EndlessRun | null = null;
const heard = new Set<() => void>();
const tell = () => heard.forEach((t) => t());

export const openEndless = (run: EndlessRun) => {
  now = run;
  tell();
  window.scrollTo({ top: 0 });
};
export const closeEndless = () => {
  now = null;
  tell();
};
export const useEndless = () =>
  useSyncExternalStore(
    (t) => {
      heard.add(t);
      return () => heard.delete(t);
    },
    () => now,
    () => null
  );

/** The portal's heading follows the run: "Endless mode", with the way back to where it began. */
export function useEndlessTrail(onTrail: (trail: Trail | null) => void) {
  const run = useEndless();
  const was = useRef(false);
  useEffect(() => {
    if (run) onTrail({ name: "Endless mode", back: run.name, go: closeEndless });
    else if (was.current) onTrail(null);
    was.current = run !== null;
  }, [run, onTrail]);
  return run;
}

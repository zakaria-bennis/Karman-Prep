// Which endless run (or time trial) is open, shared by the pages that start one and the portal that shows it
// (founder, 2026-11-21: it draws from wherever it is started: a skill's page runs that skill, a
// domain's page that domain, and a section's page that whole section). Kept in memory only.
import { useEffect, useRef, useSyncExternalStore } from "react";
import type { Trail } from "./MistakeLog";

export type EndlessRun = {
  kind: "skill" | "domain" | "section";
  name: string;
  /** A time trial's start page uses the same place (TrialStart.tsx). */
  mode?: "endless" | "trial";
};

let now: EndlessRun | null = null;
const heard = new Set<() => void>();
const tell = () => heard.forEach((t) => t());

export const openEndless = (run: EndlessRun) => {
  now = run;
  tell();
  window.scrollTo({ top: 0 });
};
/** A time trial's start page, on a skill, a domain or a section. */
export const openTrial = (run: Omit<EndlessRun, "mode">) => openEndless({ ...run, mode: "trial" });
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
    if (run)
      onTrail({
        name: run.mode === "trial" ? "Time trial" : "Endless mode",
        back: run.name,
        go: closeEndless,
      });
    else if (was.current) onTrail(null);
    was.current = run !== null;
  }, [run, onTrail]);
  return run;
}

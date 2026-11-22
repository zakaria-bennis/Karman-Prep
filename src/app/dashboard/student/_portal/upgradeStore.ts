// The Upgrade sheet's one switch (Upgrade.tsx), so any part of the portal can open it: a locked
// thing calls `askUpgrade(why)` when it is tapped (founder, 2026-11-14: "a locked feature says
// Upgrade when tapped"). `startOr` is the Start buttons' way in: it opens the quiz, or the sheet when
// the student's plan has nothing left for it.
import { useSyncExternalStore } from "react";
import { isLocked, type Access, type Locked } from "@/lib/portal/locks";
import type { PlanId } from "@/lib/plans/catalog";

let asked: Locked | null = null;
const heard = new Set<() => void>();
const tell = () => heard.forEach((l) => l());

export function askUpgrade(why: Locked) {
  asked = why;
  tell();
}

export function closeUpgrade() {
  asked = null;
  tell();
}

const subscribe = (l: () => void) => {
  heard.add(l);
  return () => heard.delete(l);
};
const read = () => asked;
export const useUpgrade = () => useSyncExternalStore(subscribe, read, () => null);

/** What the portal needs to know to lock things: the signed-in student's plan and access. */
export type Gate = { planId: PlanId; access: Access } | null;

/** Opens `path`, unless the student's plan has run out of `need` (then the Upgrade sheet opens).
 *  With no student (the design page) it does nothing, as the stand-ins always have. */
export function startOr(gate: Gate, need: Locked, path: string) {
  if (!gate) return;
  if (isLocked(need, gate.planId, gate.access)) return askUpgrade(need);
  window.location.assign(path);
}

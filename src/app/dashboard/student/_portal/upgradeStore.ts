// The Upgrade sheet's one switch (Upgrade.tsx), so any part of the portal can open it: a locked
// thing calls `askUpgrade(why)` when it is tapped (founder, 2026-11-14: "a locked feature says
// Upgrade when tapped"). A Start button checks `isLocked` first (useDailyTen.tsx).
import { useSyncExternalStore } from "react";
import { type Access, type Locked } from "@/lib/portal/locks";
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

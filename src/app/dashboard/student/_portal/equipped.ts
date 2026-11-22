// What the student's character has on, shared by every page that shows it (Rewards sets it; Homework
// shows it). Kept in memory for now: nothing is saved yet.
import { useSyncExternalStore } from "react";
import type { Outfit } from "./accessories";
import type { FaceKind } from "./characters";

export type Equipped = { face: FaceKind; outfit: Outfit };
let now: Equipped = { face: "fox", outfit: {} };
const heard = new Set<() => void>();

export const getEquipped = () => now;
export const setEquipped = (next: Partial<Equipped>) => {
  now = { ...now, ...next };
  heard.forEach((tell) => tell());
};
export const useEquipped = () =>
  useSyncExternalStore(
    (tell) => {
      heard.add(tell);
      return () => heard.delete(tell);
    },
    getEquipped,
    getEquipped
  );

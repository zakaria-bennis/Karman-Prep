import { useSyncExternalStore } from "react";
import type { Practice, SchoolClass, SeatKey, Staff } from "./mock";

/**
 * Prototype state that survives moving between screens: classes added, keys
 * issued or revoked, teachers invited, students moved into a class, practice
 * assigned, seats added. Nothing is persisted; a reload starts over, which is
 * what a gallery wants.
 */
interface State {
  classes: SchoolClass[];
  keys: SeatKey[];
  revoked: Record<string, string>;
  teachers: Staff[];
  /** studentId to classId, for the students the admin put in a class. */
  placed: Record<string, string>;
  practice: Practice[];
  seatsAdded: number;
  renewed: boolean;
}
let state: State = {
  classes: [],
  keys: [],
  revoked: {},
  teachers: [],
  placed: {},
  practice: [],
  seatsAdded: 0,
  renewed: false,
};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useStore(): State {
  return useSyncExternalStore(subscribe, () => state);
}

export function addClass(c: SchoolClass) {
  state = { ...state, classes: [...state.classes, c] };
  emit();
}
export function issueKey(k: SeatKey) {
  state = { ...state, keys: [k, ...state.keys] };
  emit();
}
export function revokeKey(id: string, date: string) {
  state = { ...state, revoked: { ...state.revoked, [id]: date } };
  emit();
}
export function inviteTeacher(t: Staff) {
  state = { ...state, teachers: [...state.teachers, t] };
  emit();
}
export function placeStudents(ids: string[], classId: string) {
  const placed = { ...state.placed };
  ids.forEach((id) => (placed[id] = classId));
  state = { ...state, placed };
  emit();
}
export function assignPractice(p: Practice) {
  state = { ...state, practice: [p, ...state.practice] };
  emit();
}
export function addSeats(n: number) {
  state = { ...state, seatsAdded: state.seatsAdded + n };
  emit();
}
export function markRenewed() {
  state = { ...state, renewed: true };
  emit();
}

/** A readable seat-key code: school, scope, four characters without look-alikes. */
export function makeCode(scope: string, seed: number): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = seed;
  let out = "";
  for (let i = 0; i < 4; i++) {
    s = (s * 48271) % 2147483647;
    out += chars[s % chars.length];
  }
  return `RHS-${scope}-${out}`;
}

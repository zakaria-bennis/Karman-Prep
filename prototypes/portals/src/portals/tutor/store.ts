import { useSyncExternalStore } from "react";

/**
 * Prototype state that survives moving between screens: which briefing items
 * are covered, which parent updates were sent, which score reports were
 * entered, homework assigned from the sheet. Nothing is persisted; a reload
 * starts over, which is what a gallery wants.
 */
interface State {
  covered: Record<string, string[]>;
  sent: Record<string, { date: string; to: string }[]>;
  entered: Record<string, { type: string; date: string; rw: number; math: number }>;
  assigned: { id: string; title: string; to: string[]; due: string; questions: number }[];
  notes: Record<string, { id: string; date: string; text: string }[]>;
}
let state: State = { covered: {}, sent: {}, entered: {}, assigned: [], notes: {} };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useStore(): State {
  return useSyncExternalStore(subscribe, () => state);
}

export function toggleCovered(studentId: string, itemId: string) {
  const list = state.covered[studentId] ?? [];
  const next = list.includes(itemId) ? list.filter((i) => i !== itemId) : [...list, itemId];
  state = { ...state, covered: { ...state.covered, [studentId]: next } };
  emit();
}
export function markSent(studentId: string, to: string, date: string) {
  const list = state.sent[studentId] ?? [];
  state = { ...state, sent: { ...state.sent, [studentId]: [{ date, to }, ...list] } };
  emit();
}
export function markEntered(reportId: string, entry: State["entered"][string]) {
  state = { ...state, entered: { ...state.entered, [reportId]: entry } };
  emit();
}
export function addAssignment(a: State["assigned"][number]) {
  state = { ...state, assigned: [a, ...state.assigned] };
  emit();
}
export function addNote(studentId: string, text: string, date: string) {
  const list = state.notes[studentId] ?? [];
  state = {
    ...state,
    notes: { ...state.notes, [studentId]: [{ id: `${date}-${list.length}`, date, text }, ...list] },
  };
  emit();
}

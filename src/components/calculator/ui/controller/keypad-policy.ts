// K-2 keypad visibility policy. On a coarse pointer, a row focused by touch opens the keypad unless
// the student closed it; a student close (Hide keypad, the L-2 toggle, Ctrl or Alt/Option+K, or
// Escape) disarms touch opening until a student open re-arms it. A system change
// (the per-question defaults) keeps the student's choice.

export interface KeypadPolicyState {
  open: boolean;
  studentClosed: boolean;
}
export type KeypadEvent =
  | { type: "touch-focus-row" }
  | { type: "set"; open: boolean; by: "student" | "system" };

export const INITIAL_KEYPAD_POLICY: KeypadPolicyState = Object.freeze({
  open: false,
  studentClosed: false,
});

/** Returns `state` itself when the event changes nothing. */
export function reduceKeypad(state: KeypadPolicyState, event: KeypadEvent): KeypadPolicyState {
  const next: KeypadPolicyState =
    event.type === "touch-focus-row"
      ? { open: state.open || !state.studentClosed, studentClosed: state.studentClosed }
      : {
          open: event.open,
          studentClosed: event.by === "student" ? !event.open : state.studentClosed,
        };
  return next.open === state.open && next.studentClosed === state.studentClosed ? state : next;
}

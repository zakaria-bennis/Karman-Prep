// K-2 keypad visibility policy. A row focused by touch opens the keypad, as the reference's touch
// calculator does (VIS-RESPONSIVE-15): touch has no Show keypad tab, so a student close (Hide
// keypad, Ctrl or Alt/Option+K, or Escape) lasts until the next row is focused by touch, and the
// phone keyboard serves the row in the meantime. Every other change sets the state it names.

export interface KeypadPolicyState {
  open: boolean;
}
export type KeypadEvent =
  | { type: "touch-focus-row" }
  | { type: "set"; open: boolean; by: "student" | "system" };

export const INITIAL_KEYPAD_POLICY: KeypadPolicyState = Object.freeze({ open: false });

/** Returns `state` itself when the event changes nothing. */
export function reduceKeypad(state: KeypadPolicyState, event: KeypadEvent): KeypadPolicyState {
  const open = event.type === "touch-focus-row" ? true : event.open;
  return open === state.open ? state : { open };
}

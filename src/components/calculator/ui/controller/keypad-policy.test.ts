import { expect, it } from "vitest";
import { INITIAL_KEYPAD_POLICY, reduceKeypad } from "./keypad-policy";

it("K-2 a row touch opens the keypad, also after a student close; a set changes it either way", () => {
  const touch = { type: "touch-focus-row" } as const;
  let s = reduceKeypad(INITIAL_KEYPAD_POLICY, touch);
  expect(s).toEqual({ open: true });
  expect(reduceKeypad(s, touch)).toBe(s);
  s = reduceKeypad(s, { type: "set", open: false, by: "student" });
  expect(s).toEqual({ open: false });
  expect(reduceKeypad(s, touch)).toEqual({ open: true });
  expect(reduceKeypad(s, { type: "set", open: true, by: "system" })).toEqual({ open: true });
});

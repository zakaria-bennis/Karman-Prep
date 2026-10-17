import { expect, it } from "vitest";
import { INITIAL_KEYPAD_POLICY, reduceKeypad } from "./keypad-policy";

it("K-2 a row touch opens the keypad unless the student closed it; a student open re-arms it", () => {
  const touch = { type: "touch-focus-row" } as const;
  let s = reduceKeypad(INITIAL_KEYPAD_POLICY, touch);
  expect(s).toEqual({ open: true, studentClosed: false });
  s = reduceKeypad(s, { type: "set", open: false, by: "student" });
  expect(reduceKeypad(s, touch)).toEqual({ open: false, studentClosed: true });
  s = reduceKeypad(reduceKeypad(s, { type: "set", open: true, by: "student" }), {
    type: "set",
    open: false,
    by: "system",
  });
  expect(reduceKeypad(s, touch)).toEqual({ open: true, studentClosed: false });
});

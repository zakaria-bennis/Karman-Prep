import { expect, it } from "vitest";
import { overlapPx } from "./phone-keypad";

const rect = (top: number, bottom: number, width = 390) =>
  ({ top, bottom, height: bottom - top, width }) as DOMRect;

it("measures how much of the graph the keypad covers", () => {
  expect(overlapPx(rect(0, 354), rect(675, 844))).toBe(0); // stacked: the keypad is below
  expect(overlapPx(rect(0, 390), rect(221, 390))).toBe(169); // side by side: over the bottom
  expect(overlapPx(rect(0, 100), rect(-50, 400))).toBe(100);
  expect(overlapPx(rect(0, 390), rect(221, 390, 0))).toBe(0); // a hidden keypad covers nothing
});

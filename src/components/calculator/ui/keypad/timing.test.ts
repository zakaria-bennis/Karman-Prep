import { expect, it } from "vitest";
import { createDoubleTapTracker } from "./double-tap";

it("K-7 a second = within 300 ms on the same row with no other input is a double tap", () => {
  let t = 0;
  const taps = createDoubleTapTracker(() => t);
  taps.record("1", "y=");
  t = 300;
  expect(taps.matches("1", "y=")).toBe(true);
  t = 301;
  expect(taps.matches("1", "y=")).toBe(false);
  t = 0;
  taps.record("1", "y=");
  expect(taps.matches("2", "y=")).toBe(false);
  expect(taps.matches("1", "y=x")).toBe(false);
  taps.clear();
  expect(taps.matches("1", "y=")).toBe(false);
});

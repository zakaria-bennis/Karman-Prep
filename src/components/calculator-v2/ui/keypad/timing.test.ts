import { afterEach, expect, it, vi } from "vitest";
import { createDoubleTapTracker } from "./double-tap";
import { createKeyRepeat } from "./key-repeat";
import { keypadLayout } from "./keys";

afterEach(() => vi.useRealTimers());

it("K-11 a held key fires at once, again after 400 ms, then every 80 ms until stopped; only arrows and Backspace repeat", () => {
  vi.useFakeTimers();
  const fire = vi.fn();
  const repeat = createKeyRepeat();
  repeat.start(fire);
  expect(fire).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(399);
  expect(fire).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(1);
  expect(fire).toHaveBeenCalledTimes(2);
  vi.advanceTimersByTime(160);
  expect(fire).toHaveBeenCalledTimes(4);
  repeat.stop();
  vi.advanceTimersByTime(1000);
  expect(fire).toHaveBeenCalledTimes(4);
  const all = (["main", "letters"] as const).flatMap((p) =>
    keypadLayout(p, 900, "coarse", false).groups.flatMap((g) => g.rows.flat())
  );
  expect([...new Set(all.filter((k) => k.repeat).map((k) => k.id))].sort()).toEqual([
    "backspace",
    "left",
    "right",
  ]);
});

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

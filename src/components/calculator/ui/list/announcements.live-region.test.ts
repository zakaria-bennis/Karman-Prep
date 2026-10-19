// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { createTestEngine } from "@/lib/calculator/core/api/__fixtures__/test-engine";
import { createAnnouncer } from "../a11y/announcer";
import { createRowAnnouncements } from "./announcements";

afterEach(() => vi.useRealTimers());

it("A11Y-2 through the real announcer the focused row's value reaches the status region 750 ms after the last edit, and a newer edit drops a pending value", () => {
  vi.useFakeTimers(); // before the engine and announcer exist, so every timer they set is fake
  const t = createTestEngine(undefined, { backend: "fake" });
  t.engine.setExpressions([
    { id: "1", latex: "" },
    { id: "2", latex: "" },
  ]);
  t.flushFrames(); // this API change event fires before the announcements exist
  const region = document.createElement("div");
  const announcer = createAnnouncer(region);
  const rows = createRowAnnouncements(t.engine, announcer); // defaults: 750 ms, global timers
  const typeWithValue = (latex: string, value: number) => {
    t.engine.editRow("2", latex, "typing");
    t.flushFrames(); // the change event starts the idle timer
    t.emit({
      v: 1,
      type: "value",
      generation: t.latestGeneration(),
      rowId: "2",
      jobId: null,
      value: { type: "number", value },
    });
    t.flushFrames(); // the value is in the snapshot before the idle point
  };
  t.engine.setFocusedRow("2");
  typeWithValue("4+5", 9); // t = 0
  vi.advanceTimersByTime(749);
  expect(region.textContent).toBe("");
  vi.advanceTimersByTime(1); // t = 750, not 800
  expect(region.textContent).toBe("Expression 2 equals 9");
  typeWithValue("4+6", 10); // t = 750: idle point at 1450, write due at 1500
  vi.advanceTimersByTime(720); // t = 1470: the announcer emptied the region at 1450
  expect(region.textContent).toBe("");
  typeWithValue("4+7", 11); // t = 1470: cancels the write due at 1500
  vi.advanceTimersByTime(30); // t = 1500
  expect(region.textContent).toBe(""); // "Expression 2 equals 10" is never written
  vi.advanceTimersByTime(719); // t = 2219
  expect(region.textContent).toBe("");
  vi.advanceTimersByTime(1); // t = 2220 = 1470 + 750
  expect(region.textContent).toBe("Expression 2 equals 11");
  rows.destroy();
  announcer.destroy();
  t.engine.destroy();
});

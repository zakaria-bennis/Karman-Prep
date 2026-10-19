// A11Y-2 row announcements (09 Task 5) on 07's test engine and hand-driven timers. The announcer
// here follows 05's public contract on the same timers (a write max(delayMs, 50) ms after the call,
// dropped by a same-key call or cancel), so these tests assert when the text is written, not when
// announce is called. announcements.live-region.test.ts pins the same timing against 05's real
// announcer.

import { expect, it, onTestFinished } from "vitest";
import { createTestEngine } from "@/lib/calculator-v2/core/api/__fixtures__/test-engine";
import type { CalculatorEngine } from "@/lib/calculator-v2/core/api/engine";
import type { Announcer } from "../a11y/announcer";
import { createManualTimers, type ManualTimers } from "./__fixtures__/manual-timers";
import { createRowAnnouncements } from "./announcements";

function contractAnnouncer(timers: ManualTimers, texts: string[]): Announcer {
  const pending = new Map<string, unknown>();
  const cancel = (key: string) => {
    if (pending.has(key)) timers.clearTimeout(pending.get(key));
    pending.delete(key);
  };
  return {
    announce(text, options) {
      const key = options?.key;
      if (key !== undefined) cancel(key);
      const handle = timers.setTimeout(
        () => {
          if (key !== undefined) pending.delete(key);
          texts.push(text);
        },
        Math.max(options?.delayMs ?? 0, 50)
      );
      if (key !== undefined) pending.set(key, handle);
    },
    cancel,
    destroy() {},
  };
}
function setup(rows: string[], backend: "fake" | "main-thread") {
  const t = createTestEngine(undefined, { backend });
  t.engine.setExpressions(rows.map((latex, i) => ({ id: String(i + 1), latex })));
  t.flushFrames(); // this API change event fires before the announcements exist
  const texts: string[] = [];
  const timers = createManualTimers();
  const announcer = contractAnnouncer(timers, texts);
  createRowAnnouncements(t.engine, announcer, { timers });
  onTestFinished(() => t.engine.destroy());
  return { t, engine: t.engine, texts, timers };
}
const valueOf = (engine: CalculatorEngine, i: number) => engine.getSnapshot().rows[i].valueText;

it("A11Y-2 the focused row's value is announced once, 750 ms after the last edit", async () => {
  const { t, engine, texts, timers } = setup(["", ""], "main-thread");
  engine.setFocusedRow("2");
  engine.editRow("2", "4+5", "typing");
  t.flushFrames(); // the change event starts the idle timer
  await t.settled(); // the main-thread backend reports 9
  expect(valueOf(engine, 1)).toBe("9");
  timers.advance(749); // the idle point at 700 calls announce; the write is due at 750
  expect(texts).toEqual([]);
  timers.advance(1);
  expect(texts).toEqual(["Expression 2 equals 9"]);
  engine.editRow("2", "4+6", "typing");
  t.flushFrames(); // the timer restarts: written 750 ms from here
  timers.advance(500);
  engine.editRow("2", "4+7", "typing");
  t.flushFrames(); // it restarts again; without the restart it would be written 250 ms from here
  await t.settled();
  expect(valueOf(engine, 1)).toBe("11");
  timers.advance(749);
  expect(texts).toHaveLength(1);
  timers.advance(1);
  expect(texts.at(-1)).toBe("Expression 2 equals 11");
});

it("A11Y-2 a value that arrives after the idle point is announced when it arrives, for the active row when no row has DOM focus", () => {
  const { t, engine, texts, timers } = setup([""], "fake");
  engine.activateExpression("1"); // touch activation: no focused row (Decisions, announced row)
  engine.editRow("1", "1+2", "typing");
  t.flushFrames(); // the change event starts the idle timer; the fake backend sends no value
  timers.advance(750); // the idle point at 700 finds no value yet
  expect(texts).toEqual([]);
  t.emit({
    v: 1,
    type: "value",
    generation: t.latestGeneration(),
    rowId: "1",
    jobId: null,
    value: { type: "number", value: 3 },
  });
  t.flushFrames(); // the value reaches subscribers in the next frame and is announced at once
  expect(texts).toEqual([]);
  timers.advance(50); // the announcer's 50 ms write delay
  expect(texts).toEqual(["Expression 1 equals 3"]);
});

it("A11Y-2 a row's error is announced once when it appears or changes, and API changes stay silent", () => {
  const { t, engine, texts, timers } = setup(["", ""], "fake");
  const typeAndIdle = (latex: string) => {
    engine.editRow("1", latex, "typing");
    t.flushFrames(); // the change event starts the idle timer
    timers.advance(700); // the idle point calls announce
    timers.advance(50); // 750: the write lands
  };
  engine.setFocusedRow("1");
  typeAndIdle("y=2+");
  expect(texts).toEqual([
    "Expression 1: This can't be read. Check for a missing bracket or operator.",
  ]);
  typeAndIdle("y=2+(");
  expect(texts).toHaveLength(1);
  typeAndIdle("y=2");
  typeAndIdle("y=2+");
  expect(texts).toHaveLength(2);
  engine.setExpressions([
    { id: "1", latex: "y=2" },
    { id: "2", latex: "y=3+" },
  ]);
  t.flushFrames(); // a non-user change event: recorded silently (A11Y-11)
  timers.advance(5000);
  expect(texts).toHaveLength(2);
});

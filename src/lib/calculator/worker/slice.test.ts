import { expect, it, vi } from "vitest";
import { DeadlineExceeded, ROW_VALUE_DEADLINE_MS } from "../core/deadline";
import { fake } from "./__fixtures__/messages";
import { createWorkDeadline, SliceClock } from "./slice";

it("AR-47 SliceClock asks to yield once 8 ms of continuous work have elapsed", () => {
  const c = fake(0),
    s = new SliceClock({ now: c.now, sliceMs: 8, heartbeatMs: 200 }, vi.fn());
  s.startSlice();
  c.set(7.9);
  expect(s.shouldYield()).toBe(false);
  c.set(8);
  expect(s.shouldYield()).toBe(true);
  s.startSlice();
  expect(s.shouldYield()).toBe(false);
});
it("AR-47 a long unit's deadline checks post a heartbeat at least every 200 ms", () => {
  const c = fake(5),
    at: number[] = [];
  const s = new SliceClock({ now: c.now, sliceMs: 8, heartbeatMs: 200 }, () => at.push(c.t));
  s.notePost();
  const d = createWorkDeadline({ clock: s, now: c.now, limitMs: null, rowId: "r" });
  for (let i = 0; i < 400; i++) d.check();
  expect(at.length).toBeGreaterThanOrEqual(9);
  expect(Math.max(...at.map((t, i) => t - (i ? at[i - 1] : 0)))).toBeLessThanOrEqual(200);
});
it("AR-48 a row value deadline throws DeadlineExceeded naming the row at 250 ms; plot deadlines never expire", () => {
  const c = fake(0),
    onExpire = vi.fn();
  const s = new SliceClock({ now: c.now, sliceMs: 8, heartbeatMs: 200 }, vi.fn());
  const d = createWorkDeadline({
    clock: s,
    now: c.now,
    limitMs: ROW_VALUE_DEADLINE_MS,
    rowId: "slow",
    onExpire,
  });
  c.set(249.9);
  expect(() => d.check()).not.toThrow();
  c.set(250);
  expect(() => d.check()).toThrow(DeadlineExceeded);
  expect(() => d.check()).toThrow(expect.objectContaining({ rowId: "slow" }));
  expect(onExpire.mock.calls).toEqual([["slow"]]);
  const p = createWorkDeadline({ clock: s, now: c.now, limitMs: null, rowId: "r" });
  c.set(1e9);
  expect(() => p.check()).not.toThrow();
});

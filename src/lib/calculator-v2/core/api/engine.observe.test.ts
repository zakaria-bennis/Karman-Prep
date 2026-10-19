import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createTestEngine, type TestEngine } from "./__fixtures__/test-engine";
import type { ChangeEvent, ObservableName } from "./types";

let t: TestEngine;
let e: TestEngine["engine"];
let modeCalls: number;
beforeEach(() => {
  t = createTestEngine();
  e = t.engine;
  modeCalls = 0;
  e.observe("mode", () => modeCalls++);
});
afterEach(() => {
  t.flushFrames();
  expect(modeCalls).toBe(0); // mode never fires in Phase 1
});

it("API-8 observers run after the commit, at most once per animation frame per name", () => {
  const seen: string[] = [];
  e.observe("settings", () => seen.push(e.settings.angleMode + e.settings.showGrid));
  e.updateSettings({ angleMode: "degrees" });
  e.updateSettings({ showGrid: false });
  expect(seen).toEqual([]);
  t.flushFrames();
  expect(seen).toEqual(["degreesfalse"]);
  t.flushFrames();
  expect(seen).toEqual(["degreesfalse"]);
});
it("API-8 observe returns an unsubscribe and unobserve without a callback removes every callback", () => {
  const a = vi.fn(),
    b = vi.fn();
  const off = e.observe("settings", a);
  e.observe("settings", b);
  off();
  e.updateSettings({ showGrid: false });
  t.flushFrames();
  expect([a.mock.calls.length, b.mock.calls.length]).toEqual([0, 1]);
  e.unobserve("settings");
  e.updateSettings({ showGrid: true });
  t.flushFrames();
  expect(b).toHaveBeenCalledTimes(1);
  expect(() => e.observe("zoom" as ObservableName, a)).toThrow(
    expect.objectContaining({ code: "invalid-argument" })
  );
  expect(() => e.observe("settings", 3 as unknown as () => void)).toThrow(
    expect.objectContaining({ code: "invalid-argument" })
  );
});
it("API-8 change events carry the revision and isUserInitiated", () => {
  const events: ChangeEvent[] = [];
  e.observeEvent("change", (ev) => events.push(ev));
  e.editRow("1", "2", "typing");
  e.editRow("1", "23", "typing");
  t.flushFrames();
  expect(events).toEqual([{ revision: e.getSnapshot().revision, isUserInitiated: true }]);
  e.setExpression({ id: "a", latex: "1" });
  t.flushFrames();
  expect(events).toHaveLength(2);
  expect(events[1]).toEqual({ revision: e.getSnapshot().revision, isUserInitiated: false });
});
it("API-8 unobserveEvent removes one change callback, and without a callback removes every one", () => {
  const a = vi.fn(),
    b = vi.fn(),
    c = vi.fn();
  e.observeEvent("change", a);
  e.observeEvent("change", b);
  e.observeEvent("change", c);
  e.unobserveEvent("change", a);
  e.editRow("1", "2", "typing");
  t.flushFrames();
  expect([a, b, c].map((f) => f.mock.calls.length)).toEqual([0, 1, 1]);
  e.unobserveEvent("change");
  e.editRow("1", "23", "typing");
  t.flushFrames();
  expect([a, b, c].map((f) => f.mock.calls.length)).toEqual([0, 1, 1]);
});
it("API-8 graphpaperBounds follows setMathBounds and setView and ignores 0×0 sizes", () => {
  expect(e.graphpaperBounds).toEqual({
    mathCoordinates: { left: -10, right: 10, bottom: -7.5, top: 7.5 },
    pixelCoordinates: { width: 800, height: 600 },
  });
  const calls = vi.fn();
  e.observe("graphpaperBounds", calls);
  e.setView({
    viewport: { left: -10, right: 10, bottom: -5, top: 5 },
    size: { width: 1000, height: 500 },
    dpr: 2,
  });
  t.flushFrames();
  expect(calls).toHaveBeenCalledTimes(1);
  expect(e.graphpaperBounds).toEqual({
    mathCoordinates: { left: -10, right: 10, bottom: -5, top: 5 },
    pixelCoordinates: { width: 1000, height: 500 },
  });
  const n = t.posted.length;
  e.setView({
    viewport: { left: -1, right: 1, bottom: -1, top: 1 },
    size: { width: 0, height: 0 },
    dpr: 2,
  });
  t.flushFrames();
  expect(calls).toHaveBeenCalledTimes(1);
  expect(t.posted).toHaveLength(n);
  expect(e.graphpaperBounds.pixelCoordinates).toEqual({ width: 1000, height: 500 });
  e.setMathBounds({ left: 0, right: 4, bottom: 0, top: 2 });
  t.flushFrames();
  expect(calls).toHaveBeenCalledTimes(2);
  expect(e.graphpaperBounds.mathCoordinates).toEqual({ left: 0, right: 4, bottom: 0, top: 2 });
});
it("API-8 expressionAnalysis fires once per frame after worker results; mode never fires in Phase 1", async () => {
  const m = createTestEngine(undefined, { backend: "main-thread" });
  const calls = vi.fn(),
    mode = vi.fn();
  m.engine.observe("mode", mode);
  m.engine.setExpressions([
    { id: "a", latex: "2+3" },
    { id: "b", latex: "y=x" },
    { id: "c", latex: "4" },
  ]);
  m.flushFrames(); // consumes the commit's own frame
  m.engine.observe("expressionAnalysis", calls);
  await m.settled(); // results arrive over several macrotasks; settled() flushes one frame
  expect(calls).toHaveBeenCalledTimes(1);
  expect(mode).not.toHaveBeenCalled();
});

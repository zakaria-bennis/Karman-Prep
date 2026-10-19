import { beforeEach, expect, it, vi } from "vitest";
import type { MainToWorker } from "../../worker/protocol";
import { createTestEngine, type TestEngine } from "./__fixtures__/test-engine";
import { defaultBackend } from "./default-deps";
import { createEngine } from "./engine";

vi.mock("./default-deps", async (importOriginal) => {
  const real = await importOriginal<typeof import("./default-deps")>();
  return { ...real, defaultBackend: vi.fn(real.defaultBackend) };
});

let m: TestEngine;
let t: TestEngine;
let e: TestEngine["engine"];
beforeEach(() => {
  m = createTestEngine(undefined, { backend: "main-thread" });
  t = createTestEngine();
  e = t.engine;
});

it("API-10 HelperExpression is evaluated in the worker, adds no row and starts as NaN", async () => {
  const h = m.engine.HelperExpression({ latex: "2+3" });
  expect(h.numericValue).toBeNaN();
  expect(m.posted.at(-1)).toMatchObject({ v: 1, type: "evaluate", latex: "2+3" });
  await m.settled();
  expect(h.numericValue).toBe(5);
  expect(h.listValue).toBeUndefined();
  expect(m.engine.getExpressions()).toHaveLength(1);
});
it("API-10 helpers use row definitions, re-evaluate after edits and fire observers for every result including NaN", async () => {
  m.engine.setExpression({ id: "a", latex: "a=4" });
  const h = m.engine.HelperExpression({ latex: "a^{2}" });
  const calls = vi.fn();
  h.observe("numericValue", calls);
  await m.settled();
  expect(h.numericValue).toBe(16);
  m.engine.editRow("a", "a=5", "api");
  await m.settled();
  expect(h.numericValue).toBe(25);
  expect(calls).toHaveBeenCalledTimes(2);
  const r = m.engine.HelperExpression({ latex: "\\sqrt{-1}" });
  const rootCalls = vi.fn();
  r.observe("numericValue", rootCalls);
  await m.settled();
  expect(r.numericValue).toBeNaN();
  expect(rootCalls).toHaveBeenCalledTimes(1);
  m.engine.updateSettings({ complex: true });
  await m.settled();
  expect(r.numericValue).toBeNaN(); // i is not real, so numericValue stays NaN
});
it("API-10 unobserve and the returned unsubscribe stop a helper's observers, listValue included", async () => {
  m.engine.setExpression({ id: "a", latex: "a=4" });
  const h = m.engine.HelperExpression({ latex: "a^{2}" });
  const [n1, n2, l1, l2] = [vi.fn(), vi.fn(), vi.fn(), vi.fn()];
  const offN1 = h.observe("numericValue", n1);
  h.observe("numericValue", n2);
  h.observe("listValue", l1);
  const offL2 = h.observe("listValue", l2);
  await m.settled();
  expect(h.numericValue).toBe(16);
  expect([n1, n2, l1, l2].map((f) => f.mock.calls.length)).toEqual([1, 1, 1, 1]);
  offN1(); // the returned unsubscribe
  h.unobserve("numericValue", n2); // one callback
  offL2();
  h.unobserve("listValue"); // every remaining listValue callback
  m.engine.editRow("a", "a=5", "api");
  await m.settled();
  expect(h.numericValue).toBe(25);
  expect([n1, n2, l1, l2].map((f) => f.mock.calls.length)).toEqual([1, 1, 1, 1]);
});
it("API-10 destroy stops a helper and invalid specs throw invalid-argument", async () => {
  m.engine.setExpression({ id: "a", latex: "a=4" });
  const h = m.engine.HelperExpression({ latex: "a" });
  await m.settled();
  expect(h.numericValue).toBe(4);
  h.destroy();
  m.engine.editRow("a", "a=9", "api");
  await m.settled();
  expect(h.numericValue).toBe(4);
  for (const spec of [{}, { latex: 3 }, { latex: "1".repeat(2049) }])
    expect(() => m.engine.HelperExpression(spec as { latex: string })).toThrow(
      expect.objectContaining({ code: "invalid-argument" })
    );
});
it("API-6 setBlank cancels pending jobs", () => {
  const h = e.HelperExpression({ latex: "2+3" });
  const calls = vi.fn();
  h.observe("numericValue", calls);
  const old = t.posted.at(-1) as Extract<MainToWorker, { type: "evaluate" }>;
  e.setBlank();
  t.emit({
    v: 1,
    type: "value",
    generation: old.generation,
    rowId: null,
    jobId: old.jobId,
    value: { type: "number", value: 5 },
  });
  t.flushFrames();
  expect(h.numericValue).toBeNaN();
  expect(calls).not.toHaveBeenCalled();
  const after = t.posted.slice(t.posted.map((msg) => msg.type).lastIndexOf("hello"));
  const state = after.findIndex((msg) => msg.type === "state");
  const job = after.findIndex((msg) => msg.type === "evaluate");
  expect(state).toBeGreaterThan(0);
  expect(job).toBeGreaterThan(state);
  const reissued = after[job] as Extract<MainToWorker, { type: "evaluate" }>;
  expect(reissued.jobId).not.toBe(old.jobId);
  expect(reissued.generation).toBe(t.latestGeneration());
  expect(reissued.generation).toBeGreaterThan(old.generation);
});
it("API-8 focusExpression, focusFirstExpression and activateExpression set the active row and fire focusedExpression (OI-10)", () => {
  e.setExpressions([{ id: "a" }, { id: "b" }]);
  const seen: (string | null)[] = [];
  e.observe("focusedExpression", () => seen.push(e.focusedExpression));
  e.activateExpression("b");
  t.flushFrames();
  expect(seen).toEqual(["b"]);
  e.focusFirstExpression();
  t.flushFrames();
  expect(seen).toEqual(["b", "1"]);
  e.focusExpression("a");
  e.focusExpression("a");
  t.flushFrames();
  expect(seen).toEqual(["b", "1", "a"]);
  expect(e.getSnapshot().activeRowId).toBe("a");
  expect(e.getSnapshot().focusedRowId).toBeNull();
  expect(() => e.focusExpression("zz")).toThrow(
    expect.objectContaining({ code: "invalid-argument" })
  );
});
it("API-8 setFocusedRow tracks DOM focus, makes the row active and ends the typing group", () => {
  const ids = () => [e.getSnapshot().focusedRowId, e.getSnapshot().activeRowId];
  e.setFocusedRow("1");
  expect(ids()).toEqual(["1", "1"]);
  e.setFocusedRow(null);
  expect(ids()).toEqual([null, "1"]);
  e.editRow("1", "1", "typing");
  e.setFocusedRow("1");
  e.editRow("1", "12", "typing");
  e.undo();
  expect(e.getExpressions()[0].latex).toBe("1"); // two undo steps, not one
});
it("API-13 after destroy every public method throws destroyed and destroy stays idempotent", () => {
  const state0 = e.getState();
  e.destroy();
  e.destroy();
  const calls: (() => unknown)[] = [
    () => e.setExpression({ id: "a" }),
    () => e.setExpressions([]),
    () => e.removeExpression({ id: "1" }),
    () => e.removeExpressions([]),
    () => e.getExpressions(),
    () => e.getState(),
    () => e.setState(state0),
    () => e.setBlank(),
    () => e.setMathBounds({ left: 0, right: 1, bottom: 0, top: 1 }),
    () => e.updateSettings({}),
    () => e.observe("settings", () => {}),
    () => e.unobserve("settings"),
    () => e.observeEvent("change", () => {}),
    () => e.unobserveEvent("change"),
    () => e.HelperExpression({ latex: "1" }),
    () => e.undo(),
    () => e.redo(),
    () => e.clearHistory(),
    () => e.canUndo(),
    () => e.canRedo(),
    () => e.focusExpression("1"),
    () => e.focusFirstExpression(),
    () => e.activateExpression("1"),
    () => e.expressionAnalysis,
    () => e.graphpaperBounds,
    () => e.settings,
    () => e.focusedExpression,
    () => e.mode,
  ];
  for (const c of calls) expect(c).toThrow(expect.objectContaining({ code: "destroyed" }));
  expect(e.getSnapshot().rows).toHaveLength(1);
  expect(e.editRow("1", "2", "typing")).toBeNull();
});
it("API-13 late worker results after destroy change nothing", () => {
  e.setExpression({ id: "a", latex: "2+3" });
  const g = t.latestGeneration();
  const listener = vi.fn(),
    observer = vi.fn();
  e.subscribe(listener);
  e.observe("expressionAnalysis", observer);
  t.flushFrames();
  observer.mockClear();
  e.destroy();
  expect(t.backend!.disposed).toBe(true);
  t.emit({
    v: 1,
    type: "value",
    generation: g,
    rowId: "a",
    jobId: null,
    value: { type: "number", value: 5 },
  });
  t.emit({
    v: 1,
    type: "plot",
    generation: g,
    rowId: "a",
    geometry: { kind: "points", rowId: "a", evaluations: 0, coords: new Float64Array([1, 2]) },
  });
  t.flushFrames();
  expect(listener).not.toHaveBeenCalled();
  expect(observer).not.toHaveBeenCalled();
});
it("API-1 createEngine validates options before creating a backend and uses the main-thread backend in node", () => {
  const made = createEngine();
  expect(made.getSnapshot().backendKind).toBe("main-thread");
  made.destroy();
  vi.mocked(defaultBackend).mockClear();
  expect(() => createEngine({ displaySize: "large" })).toThrow(
    expect.objectContaining({ code: "unsupported" })
  );
  expect(defaultBackend).not.toHaveBeenCalled();
});

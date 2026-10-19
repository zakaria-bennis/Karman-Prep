import { beforeEach, expect, it, vi } from "vitest";
import type { CurveGeometry, PointGeometry, RegionGeometry } from "../../plot/geometry";
import { rowErrorMessage } from "../analysis";
import type { Value } from "../eval/values";
import { createWorkerBackend } from "../../worker/backend";
import { macrotask } from "../../worker/__fixtures__/messages";
import { WORKER_MARKER, type WorkerToMain } from "../../worker/protocol";
import { createTestEngine, TEST_VIEW, type TestEngine } from "./__fixtures__/test-engine";
import { CalculatorEngine } from "./engine";
import { KarmanCalculatorError } from "./errors";
import { toApiEvaluation } from "./results";
import type { ExpressionState } from "./types";

let m: TestEngine;
let t: TestEngine;
let e: TestEngine["engine"];
beforeEach(() => {
  m = createTestEngine(undefined, { backend: "main-thread" });
  t = createTestEngine();
  e = t.engine;
});

const row = (id: string) => e.getSnapshot().rows.find((r) => r.id === id)!;
const points = (rowId: string): PointGeometry => ({
  kind: "points",
  rowId,
  evaluations: 0,
  coords: new Float64Array([1, 2]),
});
const curve = (rowId: string): CurveGeometry => ({
  kind: "curve",
  rowId,
  evaluations: 0,
  polylines: new Float64Array(0),
  bands: new Float64Array(0),
  dashed: false,
});
const region = (rowId: string): RegionGeometry => ({
  kind: "region",
  rowId,
  evaluations: 0,
  spans: new Float32Array(0),
  boundaries: [],
});

it("API-9 expressionAnalysis reports graphable, error and displayed number, point and undefined evaluations", async () => {
  m.engine.setExpressions([
    { id: "a", latex: "2+3" },
    { id: "b", latex: "y=x" },
    { id: "c", latex: "\\frac{" },
    { id: "d", latex: "1/0" },
    { id: "e", latex: "P=(1,2)" },
  ]);
  await m.settled();
  expect(m.engine.expressionAnalysis).toMatchObject({
    a: {
      isGraphable: false,
      isError: false,
      evaluationDisplayed: true,
      evaluation: { type: "number", value: 5 },
    },
    b: { isGraphable: true, isError: false, evaluationDisplayed: false },
    c: {
      isGraphable: false,
      isError: true,
      errorMessage: "This can't be read. Check for a missing bracket or operator.",
      evaluationDisplayed: false,
    },
    d: { evaluationDisplayed: true, evaluation: { type: "undefined" } },
    e: {
      isGraphable: false,
      evaluationDisplayed: true,
      evaluation: { type: "point", value: [1, 2] },
    },
  });
  expect(m.engine.expressionAnalysis.b).not.toHaveProperty("evaluation");
  expect(m.engine.getSnapshot().rows.find((r) => r.id === "a")!.valueText).toBe("5");
});
it("API-9 complex mode reports complex evaluations", async () => {
  m.engine.updateSettings({ complex: true });
  m.engine.setExpression({ id: "a", latex: "\\sqrt{-4}" });
  await m.settled();
  const ev = m.engine.expressionAnalysis.a.evaluation;
  if (ev?.type !== "complex") throw new Error(`expected complex, got ${ev?.type}`);
  expect(ev.value.re).toBeCloseTo(0, 12);
  expect(ev.value.im).toBeCloseTo(2, 12);
});
it("API-9 evaluations fill asynchronously from the worker", async () => {
  m.engine.setExpression({ id: "a", latex: "2+3" });
  expect(m.engine.expressionAnalysis.a).toMatchObject({ evaluationDisplayed: false });
  expect(m.engine.expressionAnalysis.a).not.toHaveProperty("evaluation");
  await m.settled();
  expect(m.engine.expressionAnalysis.a).toMatchObject({
    evaluationDisplayed: true,
    evaluation: { type: "number", value: 5 },
  });
});
it("API-9 later-phase values report type other with the row's R-5 text as display (OI-24)", () => {
  expect(toApiEvaluation({ type: "tone" } as unknown as Value, "tone(440, 1)")).toEqual({
    type: "other",
    display: "tone(440, 1)",
  });
  expect(
    toApiEvaluation(
      {
        type: "list",
        value: [
          { type: "number", value: 1 },
          { type: "number", value: 2 },
        ],
      },
      "[1, 2]"
    )
  ).toEqual({ type: "list", value: [1, 2] });
  expect(toApiEvaluation({ type: "number", value: Number.POSITIVE_INFINITY }, null)).toEqual({
    type: "undefined",
  });
});
it("AR-46 plots and done must match the latest generation; values must not predate the latest state", () => {
  e.setView(TEST_VIEW); // view, generation 2
  e.setExpression({ id: "a", latex: "2+3" }); // state, generation 3
  const g = t.latestGeneration();
  t.emit({
    v: 1,
    type: "value",
    generation: g - 1,
    rowId: "a",
    jobId: null,
    value: { type: "number", value: 4 },
  });
  t.flushFrames();
  expect(row("a").value).toBeNull(); // older than the latest state
  e.setView({ ...TEST_VIEW, viewport: { left: -5, right: 5, bottom: -3.75, top: 3.75 } }); // view, generation 4
  t.emit({
    v: 1,
    type: "value",
    generation: g,
    rowId: "a",
    jobId: null,
    value: { type: "number", value: 5 },
  });
  t.flushFrames();
  expect(row("a").value).toEqual({ type: "number", value: 5 }); // a later view does not stale a value
  e.setExpression({ id: "p", latex: "(1,2)" });
  const gp = t.latestGeneration();
  t.emit({ v: 1, type: "plot", generation: gp - 1, rowId: "p", geometry: points("p") });
  t.flushFrames();
  expect(e.getSnapshot().geometry.has("p")).toBe(false);
  t.emit({ v: 1, type: "plot", generation: gp, rowId: "p", geometry: points("p") });
  t.emit({ v: 1, type: "done", generation: gp - 1 }); // an old done prunes nothing
  t.flushFrames();
  expect(e.getSnapshot().geometry.has("p")).toBe(true);
});
it("AR-46 geometry is kept until replaced, dropped for edited rows and for regions on a view send, and pruned at done", () => {
  const keys = () => [...e.getSnapshot().geometry.keys()].sort();
  e.setExpressions([
    { id: "p", latex: "(1,2)" },
    { id: "q", latex: "y\\le x" },
    { id: "c", latex: "y=x" },
  ]);
  e.setView(TEST_VIEW);
  const g = t.latestGeneration();
  t.emit({ v: 1, type: "plot", generation: g, rowId: "p", geometry: points("p") });
  t.emit({ v: 1, type: "plot", generation: g, rowId: "q", geometry: region("q") });
  t.emit({ v: 1, type: "plot", generation: g, rowId: "c", geometry: curve("c") });
  t.emit({ v: 1, type: "done", generation: g });
  t.flushFrames();
  expect(keys()).toEqual(["c", "p", "q"]);
  e.setView({ ...TEST_VIEW, viewport: { left: -9, right: 11, bottom: -7.5, top: 7.5 } }); // pan
  expect(keys()).toEqual(["c", "p"]); // region spans were in the old pixel frame
  const g2 = t.latestGeneration();
  t.emit({ v: 1, type: "plot", generation: g2, rowId: "c", geometry: curve("c") });
  t.emit({ v: 1, type: "done", generation: g2 });
  t.flushFrames();
  expect(keys()).toEqual(["c"]); // only rows plotted in generation g2 survive its done
  e.editRow("c", "y=2x", "typing");
  expect(keys()).toEqual([]);
});
it("AR-48 an overrun row shows the timeout message until it is edited or a later value arrives", () => {
  const timeout = {
    code: "timeout",
    message: "This is taking too long. Try a smaller range or fewer terms.",
    names: [],
    span: null,
  };
  e.setExpression({ id: "a", latex: "2+3" });
  t.emit({ v: 1, type: "overrun", generation: t.latestGeneration(), rowId: "a" });
  t.flushFrames();
  expect(row("a")).toMatchObject({ overrun: true, value: null, error: timeout });
  expect(e.expressionAnalysis.a).toMatchObject({ isError: true, errorMessage: timeout.message });
  e.updateSettings({ angleMode: "degrees" });
  expect(row("a").overrun).toBe(true);
  t.emit({
    v: 1,
    type: "value",
    generation: t.latestGeneration(),
    rowId: "a",
    jobId: null,
    value: { type: "number", value: 5 },
  });
  t.flushFrames();
  expect(row("a")).toMatchObject({ overrun: false, error: null, valueText: "5" });
  t.emit({ v: 1, type: "overrun", generation: t.latestGeneration(), rowId: "a" });
  t.flushFrames();
  expect(row("a").overrun).toBe(true);
  e.editRow("a", "2+4", "typing");
  expect(row("a")).toMatchObject({ overrun: false, error: null });
});
it("AR-49 a watchdog-quarantined row keeps the timeout message after delete and undo and after hide and show", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  try {
    const timeout = {
      code: "timeout",
      message: "This is taking too long. Try a smaller range or fewer terms.",
    };
    const workers: { onmessage: ((e: { data: unknown }) => void) | null }[] = [];
    const backend = createWorkerBackend({
      createWorker: () => {
        const w = { onmessage: null, onerror: null, postMessage() {}, terminate() {} };
        workers.push(w);
        return w as unknown as Worker;
      },
    });
    const send = (data: WorkerToMain) => workers.at(-1)!.onmessage?.({ data });
    const frames: (() => void)[] = [];
    const w = new CalculatorEngine(undefined, {
      backend,
      scheduleFrame: (callback) => {
        frames.push(callback);
      },
      now: () => 0,
      randomSeed: () => 1,
    });
    const view = async (id: string) => {
      await macrotask();
      for (const callback of frames.splice(0)) callback();
      return w.getSnapshot().rows.find((r) => r.id === id)!;
    };
    send({ v: 1, type: "ready", worker: WORKER_MARKER });
    w.setExpressions([
      { id: "a", latex: "y=x^{2}" },
      { id: "b", latex: "2+3" },
    ]);
    send({ v: 1, type: "begin", generation: 1, rowId: "a" });
    vi.advanceTimersByTime(1500);
    expect(workers).toHaveLength(2);
    expect(await view("a")).toMatchObject({ overrun: true, error: timeout });
    w.deleteRow("a");
    w.undo();
    expect(await view("a")).toMatchObject({ overrun: true, value: null, error: timeout });
    w.setRowHidden("a", true);
    w.setRowHidden("a", false);
    expect(await view("a")).toMatchObject({ overrun: true, value: null, error: timeout });
    w.destroy();
  } finally {
    vi.useRealTimers();
  }
});
it("AR-45 an analysis kind that differs from the main thread's logs console.error in development", () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  e.setExpression({ id: "a", latex: "2+3" });
  const g = t.latestGeneration();
  t.emit({
    v: 1,
    type: "analysis",
    generation: g,
    rowId: "a",
    analysis: { kind: "value", error: null, isGraphable: false },
  });
  expect(spy).not.toHaveBeenCalled();
  t.emit({
    v: 1,
    type: "analysis",
    generation: g,
    rowId: "a",
    analysis: { kind: "implicit", error: null, isGraphable: true },
  });
  expect(spy.mock.calls).toEqual([
    ["Karman calculator: worker analysis kind mismatch for row a (main value, worker implicit)"],
  ]);
  spy.mockRestore();
});
it("AR-54 parse, analysis and evaluation errors are row values and never throw", async () => {
  const bad = [
    "\\frac{}{}",
    "x^{}",
    "\\sqrt{}",
    "2+",
    "\\left(",
    "\\operatorname{}",
    "=",
    "1/0",
    "\\sum",
    "\\begin{matrix}1\\end{matrix}",
    "x+y",
    "\\sim",
  ];
  expect(() =>
    m.engine.setExpressions(bad.map((latex, i) => ({ id: `b${i}`, latex })))
  ).not.toThrow();
  expect(() => m.engine.editRow("b0", "\\frac{1}", "typing")).not.toThrow();
  await m.settled();
  const rows = m.engine.getSnapshot().rows.slice(1); // row "1" comes first; then b0…b11 in input order
  // codes from the parse-errors corpus (PR-38 cases 35 to 41 and 45; PR-9 cases 8 and 20: matrix
  // and \sum are unsupported commands) and the RC-17 list (x+y is mixed-variables); "1/0" has no
  // error and its value is undefined
  expect(rows.map((r) => r.error?.code ?? null)).toEqual([
    "syntax", // b0, edited to \frac{1} (PR-38 case 45)
    "syntax", // x^{}
    "syntax", // \sqrt{}
    "syntax", // 2+
    "syntax", // \left(
    "syntax", // \operatorname{}
    "syntax", // =
    null, // 1/0
    "unsupported", // \sum
    "unsupported", // \begin{matrix}1\end{matrix}
    "mixed-variables", // x+y
    "sim-side", // \sim with nothing on either side (PR-30: a half-typed regression)
  ]);
  expect(rows[7].value).toEqual({ type: "undefined" });
  for (const r of rows.filter((r) => r.error))
    expect(r.error!.message).toBe(rowErrorMessage(r.error!.code, r.error!.names));
  expect(() => m.engine.setExpression({ id: 5 } as unknown as ExpressionState)).toThrow(
    KarmanCalculatorError
  );
});
it("AR-54 a worker fault reaches onError without row content", () => {
  const onError = vi.fn();
  const f = createTestEngine({ onError });
  f.engine.setExpression({ id: "a", latex: "x^{2}" });
  f.emit({ v: 1, type: "fault", generation: f.latestGeneration(), message: "TypeError" });
  expect(onError).toHaveBeenCalledTimes(1);
  const error = onError.mock.calls[0][0] as Error;
  expect(error).toBeInstanceOf(Error);
  expect(error.message).toBe("Calculator worker fault: TypeError");
});

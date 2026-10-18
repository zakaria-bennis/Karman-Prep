import { expect, it } from "vitest";
import {
  isMainMessage,
  isWorkerMessage,
  PROTOCOL_VERSION,
  WORKER_MARKER,
  type MainToWorker,
  type WorkerToMain,
} from "./protocol";

it("AR-45 the protocol is version 1 and ready carries the karman-compute-v1 marker (OI-29)", () => {
  expect(PROTOCOL_VERSION).toBe(1);
  expect(WORKER_MARKER).toBe("karman-compute-v1");
});
it("AR-45 isWorkerMessage accepts every versioned WorkerToMain shape and rejects others", () => {
  const ok: WorkerToMain[] = [
    { v: 1, type: "ready", worker: WORKER_MARKER },
    { v: 1, type: "begin", generation: 1, rowId: "1" },
    {
      v: 1,
      type: "analysis",
      generation: 1,
      rowId: "1",
      analysis: { kind: "value", error: null, isGraphable: false },
    },
    { v: 1, type: "value", generation: 1, rowId: null, jobId: 4, value: { type: "undefined" } },
    {
      v: 1,
      type: "plot",
      generation: 2,
      rowId: "1",
      geometry: { kind: "points", rowId: "1", evaluations: 0, coords: new Float64Array([2, 3]) },
    },
    { v: 1, type: "regression", generation: 2, rowId: "1" },
    {
      v: 1,
      type: "poi",
      generation: 2,
      rowId: "1",
      points: [{ x: 0, y: 1, kinds: ["y-intercept"], withRowId: null }],
    },
    { v: 1, type: "overrun", generation: 2, rowId: "1" },
    { v: 1, type: "heartbeat", generation: 2 },
    { v: 1, type: "done", generation: 2 },
    { v: 1, type: "fault", generation: null, message: "TypeError" },
  ];
  for (const m of ok) expect(isWorkerMessage(m)).toBe(true);
  for (const bad of [
    null,
    "ready",
    { type: "ready", worker: WORKER_MARKER },
    { v: 2, type: "done", generation: 1 },
    { v: 1, type: "ready", worker: "other" },
    { v: 1, type: "plot", generation: 1, rowId: "1" },
    {
      v: 1,
      type: "value",
      generation: "1",
      rowId: "1",
      jobId: null,
      value: { type: "number", value: 1 },
    },
    { v: 1, type: "explode" },
  ])
    expect(isWorkerMessage(bad)).toBe(false);
});
it("AR-45 isMainMessage accepts hello, state, view, evaluate and dispose only", () => {
  const state: Extract<MainToWorker, { type: "state" }> = {
    v: 1,
    type: "state",
    generation: 1,
    rows: [
      {
        id: "1",
        type: "expression",
        latex: "y=x",
        logMode: false,
        columns: null,
        hidden: false,
        sliderBounds: null,
      },
    ],
    settings: { angleMode: "radians", complex: false },
    sliders: {},
  };
  const view: Extract<MainToWorker, { type: "view" }> = {
    v: 1,
    type: "view",
    generation: 2,
    viewport: { left: -10, right: 10, bottom: -7.5, top: 7.5 },
    size: { width: 800, height: 600 },
    dpr: 1,
  };
  const ok: MainToWorker[] = [
    { v: 1, type: "hello", seed: 3 },
    state,
    view,
    { v: 1, type: "evaluate", jobId: 1, generation: 2, latex: "a+1" },
    { v: 1, type: "dispose" },
  ];
  for (const m of ok) expect(isMainMessage(m)).toBe(true);
  const omit = (o: object, key: string) =>
    Object.fromEntries(Object.entries(o).filter(([k]) => k !== key));
  for (const bad of [
    null,
    { ...state, v: 2 },
    omit(state, "generation"),
    omit(view, "generation"),
    { v: 1, type: "evaluate", jobId: 1, latex: "a+1" },
    { ...state, rows: "y=x" },
    { v: 1, type: "plot", generation: 1, rowId: "1" },
  ])
    expect(isMainMessage(bad)).toBe(false);
});

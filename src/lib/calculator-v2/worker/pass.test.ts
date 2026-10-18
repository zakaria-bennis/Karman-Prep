import { expect, it } from "vitest";
import type { Deadline } from "../core/deadline";
import { UNDEFINED, type Value } from "../core/eval/values";
import { toSExpr } from "../core/latex";
import { geometryTransferables } from "../plot/geometry";
import { fake, RAD, rows, VIEW } from "./__fixtures__/messages";
import {
  DEFAULT_COMPUTE,
  parseHelper,
  runHelper,
  runPlot,
  runValuesPass,
  type ComputeFns,
  type PassContext,
} from "./pass";
import type { WorkerToMain } from "./protocol";
import { SliceClock } from "./slice";

/** A generation-1 context on `fake(step)` that records every post and its transfer list. */
function makeCtx(step: number) {
  const clock = fake(step),
    posts: WorkerToMain[] = [],
    transfers: ArrayBuffer[][] = [];
  const post: PassContext["post"] = (m, t = []) => {
    posts.push(m);
    transfers.push(t);
  };
  const slice = new SliceClock({ now: clock.now, sliceMs: 8, heartbeatMs: 200 }, () =>
    post({ v: 1, type: "heartbeat", generation: 1 })
  );
  const ctx: PassContext = { generation: 1, clock: slice, now: clock.now, post };
  return { ctx, posts, transfers, clock };
}

it("AR-48 an expired row posts overrun and the other rows keep their values", () => {
  for (const mode of ["propagate", "swallow"] as const) {
    const { ctx, posts, clock } = makeCtx(0);
    const evaluateRows: ComputeFns["evaluateRows"] = (analysis, _s, deadlineFor) => {
      const out = new Map<string, Value>();
      for (const row of analysis.rows) {
        const d = deadlineFor(row.id);
        if (row.id === "r1") {
          clock.set(clock.t + 300);
          try {
            d.check();
          } catch (e) {
            if (mode === "propagate") throw e;
            out.set(row.id, UNDEFINED);
            continue;
          }
        }
        out.set(row.id, { type: "number", value: 1 });
      }
      return out;
    };
    const outcome = runValuesPass(rows("1", "2", "3"), RAD, ctx, {
      ...DEFAULT_COMPUTE,
      evaluateRows,
    });
    expect(
      posts.flatMap((m) =>
        m.type === "analysis" || m.type === "value" || m.type === "overrun"
          ? [`${m.type}:${m.rowId}`]
          : []
      )
    ).toEqual(["analysis:r0", "value:r0", "analysis:r1", "overrun:r1", "analysis:r2", "value:r2"]);
    expect(posts).toContainEqual({ v: 1, type: "begin", generation: 1, rowId: "r1" });
    expect([...outcome.overrun]).toEqual(["r1"]);
  }
});
it("AR-48 repeated deadlineFor calls for one row share one 250 ms deadline and one begin", () => {
  const { ctx, posts, clock } = makeCtx(0);
  const seen: Deadline[] = [];
  const evaluateRows: ComputeFns["evaluateRows"] = (analysis, _s, deadlineFor) => {
    const out = new Map<string, Value>();
    for (const row of analysis.rows) {
      const calls = row.id === "r0" ? 3 : 1; // r0: one check per row plus two user-function calls
      for (let i = 0; i < calls; i++) {
        const d = deadlineFor(row.id);
        if (row.id === "r0") {
          seen.push(d);
          clock.set(clock.t + 100);
        }
        d.check(); // r0: 100, 200, then 300 ms after its first call, which throws
      }
      out.set(row.id, { type: "number", value: 1 });
    }
    return out;
  };
  const outcome = runValuesPass(rows("1", "2"), RAD, ctx, { ...DEFAULT_COMPUTE, evaluateRows });
  expect(seen).toHaveLength(3);
  expect(new Set(seen).size).toBe(1);
  expect(posts.filter((m) => m.type === "begin" && m.rowId === "r0")).toHaveLength(1);
  expect([...outcome.overrun]).toEqual(["r0"]);
});
it("AR-48 a row over the 2,000-node cap gets its error before evaluation and never an overrun", () => {
  const { ctx, posts } = makeCtx(300); // every clock read advances 300 ms
  runValuesPass(rows("1+".repeat(1000) + "1"), RAD, ctx);
  expect(posts.find((m) => m.type === "analysis")).toMatchObject({
    analysis: { kind: "error", error: { code: "too-many-nodes" } },
  });
  expect(posts.find((m) => m.type === "value")).toMatchObject({ value: { type: "undefined" } });
  expect(posts.some((m) => m.type === "overrun")).toBe(false);
});
it("AR-48 a plot unit has no total limit and posts its geometry with transferables", () => {
  const { ctx, posts, transfers } = makeCtx(100); // every clock read advances 100 ms
  const outcome = runValuesPass(rows("x^{2}+y^{2}=25"), RAD, ctx);
  runPlot(outcome.analysis.rows[0], outcome, VIEW, ctx);
  expect(
    posts.flatMap((m) => (m.type === "begin" || m.type === "plot" ? [`${m.type}:${m.rowId}`] : []))
  ).toEqual(["begin:r0", "plot:r0"]);
  const i = posts.findIndex((m) => m.type === "plot");
  const plot = posts[i] as Extract<WorkerToMain, { type: "plot" }>;
  expect(transfers[i]).toEqual(geometryTransferables(plot.geometry));
  expect(posts.some((m) => m.type === "overrun")).toBe(false);
});
it("AR-54 a throwing plot posts a fault naming only the error type and the next row still plots", () => {
  const plotRow: ComputeFns["plotRow"] = (input, view, d) => {
    if (input.rowId === "r0") throw new TypeError("x^{2} broke");
    return DEFAULT_COMPUTE.plotRow(input, view, d);
  };
  const fns = { ...DEFAULT_COMPUTE, plotRow };
  const { ctx, posts } = makeCtx(0);
  const outcome = runValuesPass(rows("y=x^{2}", "y=x"), RAD, ctx, fns);
  for (const row of outcome.analysis.rows) runPlot(row, outcome, VIEW, ctx, fns);
  expect(posts).toContainEqual({ v: 1, type: "fault", generation: 1, message: "TypeError" });
  expect(posts.flatMap((m) => (m.type === "plot" ? [m.rowId] : []))).toEqual(["r1"]);
  expect(posts.flatMap((m) => (m.type === "fault" ? [m.message] : []))).toEqual(["TypeError"]);
});
it("AR-54 a throwing evaluateRows posts a fault and undefined values for every row", () => {
  const { ctx, posts } = makeCtx(0);
  const evaluateRows: ComputeFns["evaluateRows"] = () => {
    throw new RangeError("2+3 broke");
  };
  runValuesPass(rows("2+3", "4"), RAD, ctx, { ...DEFAULT_COMPUTE, evaluateRows });
  expect(posts.flatMap((m) => (m.type === "fault" ? [m.message] : []))).toEqual(["RangeError"]);
  expect(
    posts.flatMap((m) =>
      m.type === "analysis" || m.type === "value" ? [`${m.type}:${m.rowId}`] : []
    )
  ).toEqual(["analysis:r0", "value:r0", "analysis:r1", "value:r1"]);
  expect(posts.flatMap((m) => (m.type === "value" ? [m.value] : []))).toEqual([
    { type: "undefined" },
    { type: "undefined" },
  ]);
});
it("API-10 helper jobs evaluate against the row scope", () => {
  const { ctx, posts } = makeCtx(0);
  const outcome = runValuesPass(rows("a=4"), RAD, ctx);
  runHelper({ jobId: 7, latex: "a^{2}" }, outcome, ctx);
  runHelper({ jobId: 8, latex: "\\frac{" }, outcome, ctx);
  runHelper({ jobId: 9, latex: "y=x" }, outcome, ctx);
  expect(posts.filter((m) => m.type === "value" && m.jobId !== null)).toEqual([
    {
      v: 1,
      type: "value",
      generation: 1,
      rowId: null,
      jobId: 7,
      value: { type: "number", value: 16 },
    },
    { v: 1, type: "value", generation: 1, rowId: null, jobId: 8, value: { type: "undefined" } },
    { v: 1, type: "value", generation: 1, rowId: null, jobId: 9, value: { type: "undefined" } },
  ]);
});
it("API-10 after a=2x the helper a(x+1) is a product, as the row is, and f(2) still calls f (RC-6)", () => {
  const { ctx, posts } = makeCtx(0);
  const outcome = runValuesPass(rows("a=2x", "f(x)=x+1"), RAD, ctx);
  const tree = (latex: string) => {
    const r = parseHelper(latex, outcome.analysis);
    return r.ok && toSExpr(r.tree);
  };
  // the keys of analysis.functions hold "a" (a zero-parameter entry, 04 decision 2); userFunctionNames does not
  expect(tree("a(x+1)")).toBe("(mul (id a) (add (id x) (num 1)))");
  expect(tree("f(2)")).toBe("(call f (num 2))");
  runHelper({ jobId: 1, latex: "a(x+1)" }, outcome, ctx);
  runHelper({ jobId: 2, latex: "a\\cdot\\left(x+1\\right)" }, outcome, ctx);
  runHelper({ jobId: 3, latex: "f(2)" }, outcome, ctx);
  const helperValue = (jobId: number) =>
    posts.find((m) => m.type === "value" && m.jobId === jobId) as Extract<
      WorkerToMain,
      { type: "value" }
    >;
  expect(helperValue(1).value).toEqual(helperValue(2).value);
  expect(helperValue(3).value).toEqual({ type: "number", value: 3 });
});

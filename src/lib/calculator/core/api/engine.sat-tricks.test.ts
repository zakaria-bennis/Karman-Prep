// The calculator tricks the lessons teach (docs/research/2026-11-22-calculator-tricks.md, section
// 4, "Must" and "Should" rows), each run end to end on the engine with the example the lesson uses.
import { expect, it } from "vitest";
import { createTestEngine, TEST_VIEW, type TestEngine } from "./__fixtures__/test-engine";
import type { ExpressionState } from "./types";

async function run(rows: ExpressionState[], degrees = false): Promise<TestEngine> {
  const m = createTestEngine(undefined, { backend: "main-thread" });
  if (degrees) m.engine.updateSettings({ angleMode: "degrees" });
  m.engine.setExpressions(rows);
  m.engine.setView(TEST_VIEW);
  await m.settled();
  return m;
}

const rows = (...latex: string[]) => latex.map((l, i) => ({ id: `r${i}`, latex: l }));

/** The number a row shows, or fails with the row's error. */
function value(m: TestEngine, id: string): number {
  const a = m.engine.expressionAnalysis[id];
  expect(a?.errorMessage, `${id}: ${a?.errorMessage}`).toBeUndefined();
  const ev = a?.evaluation;
  if (ev?.type !== "number") throw new Error(`${id} shows ${JSON.stringify(ev)}`);
  return ev.value;
}

function graphs(m: TestEngine, id: string) {
  const a = m.engine.expressionAnalysis[id];
  expect(a?.errorMessage, `${id}: ${a?.errorMessage}`).toBeUndefined();
  expect(a?.isGraphable, id).toBe(true);
}

async function pointsOf(m: TestEngine, id: string) {
  m.engine.setSelectedRow(id);
  await m.settled();
  for (let k = 0; k < 40 && m.engine.getSnapshot().poi?.rowId !== id; k++) {
    await new Promise((r) => setTimeout(r, 5));
    m.flushFrames();
  }
  return m.engine.getSnapshot().poi?.points ?? [];
}

function params(m: TestEngine, id: string) {
  const row = m.engine.getSnapshot().rows.find((r) => r.id === id);
  return Object.fromEntries((row?.regression?.result?.params ?? []).map((p) => [p.name, p.value]));
}

it("lines typed as given (3x - 4y = 24), circles, inequalities and points all graph", async () => {
  const m = await run(
    rows("3x-4y=24", "(x-2)^{2}+(y+3)^{2}=16", "y<2x+1", "y\\ge -x+3", "(1,4)", "3x+5=20")
  );
  for (const id of ["r0", "r1", "r2", "r3", "r4", "r5"]) graphs(m, id);
});

it("graph both sides and click the crossing: y = 2x + 1 and y = -x + 7 cross at (2, 5)", async () => {
  const m = await run(rows("y=2x+1", "y=-x+7"));
  const crossing = (await pointsOf(m, "r0")).find((p) => p.withRowId === "r1");
  expect(crossing?.x).toBeCloseTo(2, 6);
  expect(crossing?.y).toBeCloseTo(5, 6);
});

it("points of interest give the zeros and the vertex of y = x^2 - 5x + 6", async () => {
  const m = await run(rows("y=x^{2}-5x+6"));
  const pts = await pointsOf(m, "r0");
  const zeros = pts.filter((p) => p.kinds.includes("zero")).map((p) => p.x);
  expect(zeros.sort()).toEqual([expect.closeTo(2, 6), expect.closeTo(3, 6)]);
  const vertex = pts.find((p) => p.kinds.includes("extremum"));
  expect(vertex?.x).toBeCloseTo(2.5, 5);
  expect(vertex?.y).toBeCloseTo(-0.25, 5);
});

it("an unknown constant offers a slider, and once it has a value the curve draws", async () => {
  let m = await run(rows("y=ax^{2}+3"));
  expect(m.engine.expressionAnalysis.r0.isError).toBe(true);
  const row = m.engine.getSnapshot().rows.find((r) => r.id === "r0");
  expect(JSON.stringify(row)).toContain('"a"');
  m = await run(rows("y=ax^{2}+3", "a=2"));
  graphs(m, "r0");
});

it("regression with ~ from a table: a line shows m and b, an exponential shows a and b", async () => {
  const table = (y: string[]): ExpressionState => ({
    id: "t",
    type: "table",
    columns: [
      { latex: "x_{1}", values: ["0", "1", "2", "3"] },
      { latex: "y_{1}", values: y },
    ],
  });
  let m = await run([table(["3", "5", "7", "9"]), { id: "f", latex: "y_{1}\\sim mx_{1}+b" }]);
  expect(params(m, "f")).toEqual({ m: expect.closeTo(2, 9), b: expect.closeTo(3, 9) });
  m = await run([table(["5", "10", "20", "40"]), { id: "f", latex: "y_{1}\\sim ab^{x_{1}}" }]);
  expect(params(m, "f")).toEqual({ a: expect.closeTo(5, 6), b: expect.closeTo(2, 6) });
});

it("a ~ fit over a plain list finds the constants that make an equation true for every x", async () => {
  const m = await run(rows("x_{1}=[1,2,3,4,5]", "2x_{1}^{2}+ax_{1}-15\\sim(2x_{1}-3)(x_{1}+5)"));
  expect(params(m, "r1").a).toBeCloseTo(7, 9);
});

it("lists, [1...10], mean, median, stdev, stdevp, min, max, total and repeat", async () => {
  const m = await run(
    rows(
      "L=[2,4,4,4,5,5,7,9]",
      "\\operatorname{mean}(L)",
      "\\operatorname{median}(L)",
      "\\operatorname{stdevp}(L)",
      "\\operatorname{stdev}(L)",
      "\\min(L)+\\max(L)",
      "\\operatorname{total}([1...10])",
      "\\operatorname{mean}(\\operatorname{repeat}([1,2,3],[2,3,5]))",
      "\\operatorname{mean}(2L)"
    )
  );
  expect(value(m, "r1")).toBe(5);
  expect(value(m, "r2")).toBe(4.5);
  expect(value(m, "r3")).toBeCloseTo(2, 12);
  expect(value(m, "r4")).toBeCloseTo(2.13809, 5);
  expect(value(m, "r5")).toBe(11);
  expect(value(m, "r6")).toBe(55);
  expect(value(m, "r7")).toBeCloseTo(2.3, 12);
  expect(value(m, "r8")).toBe(10);
});

it("functions: f(3), f(g(2)) and a shifted copy y = f(x - 2) + 1", async () => {
  const m = await run(rows("f(x)=x^{2}+1", "g(x)=2x", "f(3)", "f(g(2))", "y=f(x-2)+1"));
  expect(value(m, "r2")).toBe(10);
  expect(value(m, "r3")).toBe(17);
  graphs(m, "r4");
});

it("degrees and radians: sin(30) is 0.5 in degrees and about -0.988 in radians; arcsin", async () => {
  let m = await run(rows("\\sin(30)", "\\arcsin(0.5)", "\\tan(45)"), true);
  expect(value(m, "r0")).toBeCloseTo(0.5, 12);
  expect(value(m, "r1")).toBeCloseTo(30, 10);
  expect(value(m, "r2")).toBeCloseTo(1, 12);
  m = await run(rows("\\sin(30)"));
  expect(value(m, "r0")).toBeCloseTo(-0.988, 3);
});

it("radicals and exponents: sqrt, cube root, pi, abs and fractional exponents", async () => {
  const m = await run(
    rows(
      "\\sqrt{130}",
      "\\sqrt[3]{27}",
      "27^{\\frac{2}{3}}",
      "\\left|-4\\right|",
      "\\pi\\cdot 3^{2}"
    )
  );
  expect(value(m, "r0")).toBeCloseTo(11.40175, 5);
  expect(value(m, "r1")).toBeCloseTo(3, 12);
  expect(value(m, "r2")).toBeCloseTo(9, 12);
  expect(value(m, "r3")).toBe(4);
  expect(value(m, "r4")).toBeCloseTo(28.27433, 5);
});

it("percent and repeated growth: 1500(1.04)^10 and 15% of 80", async () => {
  const m = await run(rows("1500(1.04)^{10}", "0.15\\cdot 80"));
  expect(value(m, "r0")).toBeCloseTo(2220.37, 2);
  expect(value(m, "r1")).toBeCloseTo(12, 12);
});

it("a table with a computed column tests many inputs at once", async () => {
  const m = await run([
    {
      id: "t",
      type: "table",
      columns: [
        { latex: "x_{1}", values: ["-1", "0", "1", "2"] },
        { latex: "x_{1}^{3}-3x_{1}", values: ["", "", "", ""] },
      ],
    },
  ]);
  const table = m.engine.getSnapshot().rows.find((r) => r.id === "t");
  expect(JSON.stringify(table)).toContain("-2"); // f(1) = 1 - 3
  expect(m.engine.expressionAnalysis.t?.isError ?? false).toBe(false);
});

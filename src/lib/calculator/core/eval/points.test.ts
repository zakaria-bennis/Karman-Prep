// NM-32, G-6: point arithmetic inside a plotted row. The real-mode compiler hands any sum,
// difference, product, quotient, negation or |…| with a point operand to the general evaluator, so
// `y=\left|A-(x,0)\right|` and `y=(x,1)\cdot(1,1)` draw as the curves Desmos draws instead of NaN.
// PR-45: a coordinate member after any bracketed expression, `((1,2)+(3,4)).x`.
import { expect, it } from "vitest";
import { analyzeRows, type RowGraph } from "../analysis/index";
import { NO_DEADLINE } from "../deadline";
import { compileRealFunction1, compileRealFunction2, evaluateLatex, evaluateRows } from "./compile";
import { numberValue, UNDEFINED, type Value } from "./values";

const REAL = { angleMode: "radians", complex: false } as const;

/** The last row's graph, its scope built from the earlier rows' values. */
function lastGraph(rows: string[]) {
  const source = rows.map((latex, k) => ({ id: `r${k}`, latex, hidden: false })),
    analysis = analyzeRows(source, REAL),
    byRow = evaluateRows(analysis, REAL, () => NO_DEADLINE),
    values = new Map<string, Value>();
  for (const r of analysis.rows) {
    const v = byRow.get(r.id);
    if (r.kind === "definition" && r.defines && v) values.set(r.defines.name, v);
  }
  const row = analysis.rows[rows.length - 1];
  expect(row.error).toBe(null);
  return {
    graph: row.graph as RowGraph,
    scope: { functions: analysis.functions, values, settings: REAL },
  };
}

function curve(rows: string[]): (x: number) => number {
  const { graph, scope } = lastGraph(rows);
  if (graph.kind !== "explicit") throw new Error(`not explicit: ${graph.kind}`);
  return compileRealFunction1(graph.expr, graph.independent, scope);
}

it("NM-32 G-6 |A-(x,0)| plots as |1-x| and a dot product with (x,1) as x+1", () => {
  const norm = curve(["A=(1,0)", "y=\\left|A-(x,0)\\right|"]),
    dot = curve(["y=(x,1)\\cdot(1,1)"]);
  expect([norm(0), norm(2), norm(4)]).toEqual([1, 1, 3]);
  expect([dot(0), dot(2)]).toEqual([1, 3]);
});

it("NM-32 G-6 sums, negations and scaled points plot through their coordinates", () => {
  expect(curve(["A=(1,0)", "y=\\left|-A+2(x,0)\\right|"])(2)).toBe(3);
  expect(curve(["y=\\left|\\frac{(x,0)}{2}\\right|"])(-4)).toBe(2);
  expect(curve(["y=\\left|(x,0)+\\operatorname{midpoint}((0,0),(2,0))\\right|"])(2)).toBe(3);
});

it("NM-32 G-6 a user function that returns or reads a point plots", () => {
  expect(curve(["f(a)=(a,2a)", "y=\\left|f(x)\\right|"])(1)).toBeCloseTo(Math.sqrt(5), 12);
  expect(curve(["g(P)=\\left|P\\right|", "y=g((x,0))"])(-3)).toBe(3);
  expect(curve(["h(a)=\\left|(a,0)-(1,0)\\right|", "y=h(x)"])(4)).toBe(3);
});

it("NM-32 G-6 |(x,y)-(1,1)|=2 is the circle of radius 2 about (1,1)", () => {
  const { graph, scope } = lastGraph(["\\left|(x,y)-(1,1)\\right|=2"]);
  if (graph.kind !== "implicit") throw new Error(`not implicit: ${graph.kind}`);
  const F = compileRealFunction2(graph.expr, scope);
  expect([F(3, 1), F(1, 3), F(1, 1)]).toEqual([0, 0, -2]);
});

it("G-6 a row with no point keeps the allocation-free real path", () => {
  expect(curve(["A=3", "y=\\left|A-x\\right|"])(5)).toBe(2);
});

it("PR-45 a coordinate member reads any bracketed expression, not only a name", () => {
  const n = numberValue;
  expect([
    evaluateLatex("\\left((1,2)+(3,4)\\right).x"),
    evaluateLatex("((1,2)+(3,4)).y"),
    evaluateLatex("\\left(2P\\right).y", { rows: ["P=(1,2)"] }),
    evaluateLatex("\\left(P\\right).x", { rows: ["P=(1,2)"] }),
    evaluateLatex("(\\operatorname{midpoint}((0,0),(2,4))).x.x"),
  ]).toEqual([n(4), n(6), n(4), n(1), UNDEFINED]);
  expect(curve(["A=(1,0)", "y=(A+(x,1)).y"])(5)).toBe(1);
  expect(curve(["A=(1,0)", "y=\\left(A+(x,1)\\right).x"])(5)).toBe(6);
});

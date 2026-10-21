import { expect, it } from "vitest";
import { analyzeRows } from "../analysis/index";
import {
  compileExpression,
  compileRealFunction1,
  evaluateLatex,
  evaluateRows,
  type CompileScope,
} from "../eval/compile";
import { toPlotNumber } from "../eval/ops";
import { numberValue, type Value } from "../eval/values";
import { NO_DEADLINE } from "../deadline";
import statistics from "./desmos-statistics.fixture.json";
import { applyListFunction, givesList, reduceNumbers } from "./statistics";

const REAL = { angleMode: "radians", complex: false } as const;
const n = numberValue;
const list = (...xs: number[]): Value => ({ type: "list", value: xs.map(n) });

/** The graph expression of the last of `rows` and the scope its earlier rows define. */
function graphOf(rows: readonly string[]) {
  const analysis = analyzeRows(
      rows.map((latex, k) => ({ id: `r${k}`, latex, hidden: false })),
      REAL
    ),
    byRow = evaluateRows(analysis, REAL, () => NO_DEADLINE),
    values = new Map<string, Value>();
  for (const r of analysis.rows) {
    const v = byRow.get(r.id);
    if (r.kind === "definition" && r.defines && v) values.set(r.defines.name, v);
  }
  const graph = analysis.rows[rows.length - 1].graph;
  const scope: CompileScope = { functions: analysis.functions, values, settings: REAL };
  if (graph?.kind !== "explicit" && graph?.kind !== "lines") throw new Error(rows.join(" ; "));
  return { expr: graph.expr, scope };
}

it("FN-23 FN-27 every graphed catalogue row plots as the general evaluator gives it", () => {
  const rows = Object.entries(statistics.graphed).filter(
    ([latex, note]) => note.startsWith("graphed") && !/\((P|\(1,2\))/.test(latex)
  );
  expect(rows.length).toBe(31);
  for (const [latex] of rows) {
    const { expr, scope } = graphOf([...statistics._rows, latex]);
    const real = compileRealFunction1(expr, "x", scope),
      general = compileExpression(expr, scope);
    for (const x of [0.1, 0.3, 0.7, 0.9]) {
      const expected = toPlotNumber(general({ x: n(x), y: n(NaN) }, NO_DEADLINE));
      expect([latex, x, real(x)]).toEqual([latex, x, expected]);
      expect(Number.isFinite(expected), latex).toBe(true);
    }
  }
});

// Rows whose list argument or index target varies with x in a way the real plotter cannot lay out
// element by element (a power, a built-in or an absolute value of a list, a name defined from x);
// each must plot as the general evaluator gives it, not as a blank graph.
const VARYING_LISTS: readonly (readonly string[])[] = [
  ["y=\\operatorname{mean}([1,2,3]^x)"],
  ["y=\\operatorname{mean}(\\sin([1,2]x))"],
  ["y=\\max(\\sin([1,2]x))"],
  ["L=[3,1,4,1,5,9,2,6]", "y=\\operatorname{mean}((L-x)^2)"],
  ["y=\\operatorname{mean}(\\left|[1,-2]x\\right|)"],
  ["A=[x,2x]", "y=\\operatorname{mean}(A)"],
  ["y=\\operatorname{quantile}(\\sin([1,2,3]x),0.5)"],
  ["y=\\operatorname{quartile}([1,2,3]^x,1)"],
  ["f(t)=\\operatorname{mean}(\\sin([1,2]t))", "y=f(x)"],
  ["y=\\operatorname{total}(\\sin([1,2]x))+\\operatorname{mean}([1,2,3]x)"],
  ["y=\\sin([1,2]x)[2]"],
  ["y=([1,2,3]^x)[3]"],
];

it("FN-23 FN-27 NM-30 a list argument or index target that varies with x plots as the general evaluator gives it", () => {
  for (const rows of VARYING_LISTS) {
    const { expr, scope } = graphOf(rows);
    const real = compileRealFunction1(expr, "x", scope),
      general = compileExpression(expr, scope);
    for (const x of [0.5, 1, 2, 3.4]) {
      const expected = toPlotNumber(general({ x: n(x), y: n(NaN) }, NO_DEADLINE));
      expect(Number.isFinite(expected), rows.join(" ; ")).toBe(true);
      expect([rows, x, real(x)]).toEqual([rows, x, expected]);
    }
  }
  const { expr, scope } = graphOf(["y=\\operatorname{mean}([1,2,3]^x)"]);
  expect(compileRealFunction1(expr, "x", scope)(2)).toBeCloseTo(14 / 3, 12);
});

it("FN-23 y=max(x,2) graphs, quantile(L,x) is a step function, and count(x,1,2) is a line", () => {
  const max = graphOf(["y=\\max(x,2)"]),
    quantile = graphOf(["L=[3,1,4,1,5,9,2,6]", "\\operatorname{quantile}(L,x)"]),
    count = graphOf(["y=\\operatorname{count}(x,1,2)"]);
  const f = compileRealFunction1(max.expr, "x", max.scope),
    q = compileRealFunction1(quantile.expr, "x", quantile.scope),
    c = compileRealFunction1(count.expr, "y", count.scope); // the line y − 3 = 0
  expect([f(1), f(3), q(0), q(0.25), q(1), q(1.2), c(3)]).toEqual([2, 3, 1, 1.75, 9, NaN, 0]);
});

it("FN-23 a reducer gives a list only when it broadcasts, so mean(x,[1,2]) is a list of curves", () => {
  expect([givesList("mean", [false, true]), givesList("mean", [true])]).toEqual([true, false]);
  expect([givesList("length", [true, true]), givesList("quantile", [true, true])]).toEqual([
    false,
    true,
  ]);
  const row = analyzeRows(
    [{ id: "r", latex: "y=\\operatorname{mean}(x,[1,2])", hidden: false }],
    REAL
  ).rows[0];
  expect([row.kind, row.error, row.isGraphable]).toEqual(["curve-y", null, true]); // G-22
});

it("FN-24 the variance is computed in two passes, and stdev of one value is undefined", () => {
  expect(reduceNumbers("stdev", [1e9 + 1, 1e9 + 2, 1e9 + 3])).toBe(1);
  expect([reduceNumbers("stdev", [5]), reduceNumbers("stdevp", [5])]).toEqual([NaN, 0]);
  expect(reduceNumbers("mad", [1, 2, 3, 10])).toBe(3);
});

it("FN-23 count and length count undefined elements, which make every other result undefined", () => {
  expect([reduceNumbers("count", [1, NaN]), reduceNumbers("mean", [1, NaN])]).toEqual([2, NaN]);
  expect(applyListFunction("length", [list(1, 2), n(3)])).toEqual({ type: "undefined" });
  expect(applyListFunction("total", [list(), list()])).toEqual({ type: "list", value: [] });
});

it("FN-75 Gaussian gcd and lcm are shown in the first quadrant", () => {
  const z = (re: number, im: number): Value => ({ type: "complex", value: { re, im } });
  expect(applyListFunction("gcd", [z(3, 1), z(1, 1)])).toEqual(z(1, 1));
  expect(applyListFunction("lcm", [z(1, 1), z(1, -1)])).toEqual(z(1, 1));
  expect(applyListFunction("lcm", [z(2, 1), n(2)])).toEqual(z(4, 2));
  expect(applyListFunction("gcd", [z(0, -3), n(0)])).toEqual(n(3));
});

it("FN-23 mean and total broadcasting points are typed as a list of points, as they evaluate", () => {
  const rows = ["P=[(1,2),(3,4),(5,0)]"],
    message = (latex: string) =>
      analyzeRows(
        [...rows, latex].map((l, k) => ({ id: `r${k}`, latex: l, hidden: false })),
        REAL
      ).rows[1].error?.message;
  expect(evaluateLatex("\\operatorname{total}(P,P)", { rows })).toEqual({
    type: "list",
    value: [
      { type: "point", value: [2, 4] },
      { type: "point", value: [6, 8] },
      { type: "point", value: [10, 0] },
    ],
  });
  // Desmos names the shapes this way for length(P,1) (statistics catalogue)
  for (const latex of [
    "\\operatorname{length}(\\operatorname{total}(P,P),1)",
    "\\operatorname{length}(\\operatorname{mean}(P,(1,1)),1)",
  ]) {
    expect(message(latex)).toBe("length can't take a list of points and a number.");
  }
  expect(message("\\operatorname{length}(\\operatorname{count}(P,P),1)")).toBe(
    "length can't take a list of numbers and a number."
  );
});

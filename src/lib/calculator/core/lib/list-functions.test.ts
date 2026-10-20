// FN-30 to FN-38: the two-list statistics and list operations beyond the catalogue's captured
// values (desmos.reference.test.ts holds those): spec examples, run-time errors, real-mode plots
// and the hidden argmin and argmax names.
import { expect, it } from "vitest";
import { analyzeRows } from "../analysis/index";
import { compileRealFunction1, evaluateLatex } from "../eval/compile";
import { parseLatex } from "../latex";
import { numberValue, type Value } from "../eval/values";
import { applyListFunction, givesList } from "./statistics";
import { rowErrorMessage } from "../analysis/messages";

const n = numberValue;
const list = (...xs: number[]): Value => ({ type: "list", value: xs.map(n) });
const L = { rows: ["L=[5,3,8,1]"] };

it("FN-32 spearman gives tied values the mean of their ranks", () => {
  const v = evaluateLatex("\\operatorname{spearman}([1,2,2,3],[1,2,3,4])");
  expect(v.type === "number" && Math.abs(v.value - 0.9486832980505138) < 1e-12).toBe(true);
});

it("FN-35 FN-36 FN-38 join, sort and unique follow the spec's examples", () => {
  expect(evaluateLatex("\\operatorname{join}(1,[2,3],4)")).toEqual(list(1, 2, 3, 4));
  expect(evaluateLatex("\\operatorname{sort}([3,1,2],[30,10,20])")).toEqual(list(1, 2, 3));
  expect(evaluateLatex("\\operatorname{unique}([3,1,3,2,1])")).toEqual(list(3, 1, 2));
  // a stable sort keeps equal keys in their order
  expect(applyListFunction("sort", [list(1, 2, 3, 4), list(2, 1, 2, 1)])).toEqual(list(2, 4, 1, 3));
});

it("FN-34 repeat errors are the row's error, as Desmos shows them", () => {
  const error = (latex: string) => {
    const v = evaluateLatex(latex);
    return v.type === "undefined" ? v.error : v;
  };
  expect(
    [
      "\\operatorname{repeat}(1,2.5)",
      "\\operatorname{repeat}([1,2],[1,2,3])",
      "\\operatorname{repeat}(1,10001)",
      "\\operatorname{repeat}([1,2],[5000,5001])",
    ].map(error)
  ).toEqual(["repeat-count", "repeat-lengths", "list-too-long", "list-too-long"]);
  expect(evaluateLatex("\\operatorname{repeat}((1,2),2)")).toEqual({
    type: "list",
    value: [
      { type: "point", value: [1, 2] },
      { type: "point", value: [1, 2] },
    ],
  });
});

it("FN-34 a bad count in a list of counts has Desmos's own wording", () => {
  // No live capture: the wording and order come from Desmos's bundle (bad-counts, checked after
  // the lengths match, for list counts only).
  const error = (latex: string) => {
    const v = evaluateLatex(latex);
    return v.type === "undefined" ? v.error : v;
  };
  expect(
    [
      "\\operatorname{repeat}([1,2],[1.5,2])",
      "\\operatorname{repeat}([1,2],[\\frac{0}{0},1])",
      "\\operatorname{repeat}([1,2],[-1,1])",
      "\\operatorname{repeat}([1,2],[1.5,2,3])",
      "\\operatorname{repeat}(1,-1)",
    ].map(error)
  ).toEqual(["repeat-counts", "repeat-counts", "repeat-counts", "repeat-lengths", "repeat-count"]);
  expect(rowErrorMessage("repeat-counts", [])).toBe(
    "Each 'repeat' count must be a finite, non-negative integer."
  );
});

it("FN-30 cov is covp · n / (n − 1), so Desmos's whole-number results stay whole", () => {
  // Desmos's rounding, from its bundle: Σ / (n − 1) would give −1.9999999999999998, −7.999999999999999
  // and −7.000000000000001 here.
  expect(
    [
      "\\operatorname{cov}([-2,-0.8,-2],[-6,-5,6])",
      "\\operatorname{cov}([1,4,1],[-4,-6,8])",
      "\\operatorname{cov}([6,0,2],[0,5,1])",
      "\\operatorname{cov}([1],[2])",
    ].map((latex) => evaluateLatex(latex))
  ).toEqual([n(-2), n(-8), n(-7), { type: "undefined" }]);
});

it("FN-30 FN-35 list operations always give a list and two-list statistics never", () => {
  expect([
    givesList("sort", [true]),
    givesList("join", [false, false]),
    givesList("cov", [true, true]),
  ]).toEqual([true, true, false]);
});

it("FN-30 a two-list statistic of lists that vary with x plots through the general evaluator", () => {
  const rows = ["y=\\operatorname{cov}([1,2,3],[1,2,4]x)+\\operatorname{argmax}([x,1])"];
  const analysis = analyzeRows(
    rows.map((latex, k) => ({ id: `r${k}`, latex, hidden: false })),
    { angleMode: "radians", complex: false }
  );
  const graph = analysis.rows[0].graph;
  if (graph?.kind !== "explicit") throw new Error("not a curve");
  const scope = {
    functions: analysis.functions,
    values: new Map(),
    settings: { angleMode: "radians" as const, complex: false },
  };
  const f = compileRealFunction1(graph.expr, "x", scope);
  expect([f(2), f(0.5)]).toEqual([1.5 * 2 + 1, 1.5 * 0.5 + 2]);
});

it("FN-23 argmin and argmax read from pasted latex, and typed arg then min stays two names", () => {
  expect(evaluateLatex("\\operatorname{argmin}(L)", L)).toEqual(n(4));
  // typed letters split into arg and min, as in Desmos; arg has not shipped
  const typed = parseLatex("argmin(1)");
  expect(typed.ok ? typed.tree : typed.error.detail).toBe('"arg" is not supported');
});

it("FN-34 FN-38 count and length read x when repeat's counts or unique's values hold it", () => {
  // Desmos folds count and length only when the list's length is constant (its bundle's list
  // length rule), and a top-level list with no constant length is its list-length error.
  const analyse = (latex: string) =>
    analyzeRows([{ id: "r", latex, hidden: false }], { angleMode: "radians", complex: false });
  const curve = (latex: string) => {
    const analysis = analyse(latex),
      graph = analysis.rows[0].graph;
    if (graph?.kind !== "explicit") throw new Error(latex);
    const scope = {
      functions: analysis.functions,
      values: new Map(),
      settings: { angleMode: "radians" as const, complex: false },
    };
    return compileRealFunction1(graph.expr, "x", scope);
  };
  const repeated = curve("y=\\operatorname{length}(\\operatorname{repeat}(1,x))"),
    counted = curve("y=\\operatorname{count}(\\operatorname{repeat}([1,2],[x,1]))"),
    unique = curve("y=\\operatorname{length}(\\operatorname{unique}([x,1]))");
  expect([repeated(3), repeated(2.5), counted(2), unique(1), unique(2)]).toEqual([3, NaN, 3, 1, 2]);
  expect(evaluateLatex("\\operatorname{length}([1,2,3]x)")).toEqual(n(3));
  expect(analyse("\\operatorname{length}(\\operatorname{repeat}(x,3))").rows[0].kind).toBe("value");
  const errors = ["y=\\operatorname{repeat}(1,x)", "\\operatorname{unique}([x,1])"].map(
    (latex) => analyse(latex).rows[0].error?.message
  );
  expect(errors).toEqual([
    "Can't plot a list whose length depends on free variable 'x'.",
    "Can't plot a list whose length depends on free variable 'x'.",
  ]);
});

it("FN-36 FN-38 the hidden sortPerm and uniquePerm give 0-based indexes, of points too", () => {
  const P = { rows: ["P=[(1,2),(3,4),(1,2)]"] };
  expect(evaluateLatex("\\operatorname{uniquePerm}(P)", P)).toEqual(list(0, 1));
  expect(evaluateLatex("\\operatorname{sortPerm}([2,\\frac{0}{0},1,2])")).toEqual(list(2, 0, 3, 1));
  // indexes are numbers, so uniquePerm(P) adds to a number
  const analysis = analyzeRows(
    ["P=[(1,2),(3,4),(1,2)]", "\\operatorname{uniquePerm}(P)+1"].map((latex, k) => ({
      id: `r${k}`,
      latex,
      hidden: false,
    })),
    { angleMode: "radians", complex: false }
  );
  expect(analysis.rows[1].error).toBe(null);
  expect(evaluateLatex("\\operatorname{uniquePerm}(P)+1", P)).toEqual(list(1, 2));
});

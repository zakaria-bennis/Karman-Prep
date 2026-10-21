import { describe, expect, it } from "vitest";
import { analyzeRows } from "../analysis/index";
import { parseLatex } from "../latex/index";
import {
  compileRealFunction1,
  compileRealFunction2,
  evaluateLatex,
  type CompileScope,
} from "./compile";
import { piecewiseValue } from "./piecewise";
import { numberValue, UNDEFINED, type Value } from "./values";

const REAL: CompileScope = {
  functions: new Map(),
  values: new Map(),
  settings: { angleMode: "radians", complex: false },
};
const n = numberValue;
const list = (...items: Value[]): Value => ({ type: "list", value: items });

function tree(latex: string) {
  const parsed = parseLatex(latex);
  if (!parsed.ok) throw new Error(`${latex}: ${parsed.error.code}`);
  return parsed.tree;
}

describe("PR-31 piecewiseValue", () => {
  const unsafe = (v: Value) => ({ run: () => v, safe: false });
  const safe = (v: Value) => ({ run: () => v, safe: true });

  it("picks the first part that holds and runs an unsafe value only when picked", () => {
    let runs = 0;
    const value = (v: number) => ({
      run: () => {
        runs += 1;
        return n(v);
      },
      safe: false,
    });
    const parts = [
      { test: () => UNDEFINED, value: value(1) },
      { test: () => n(1), value: value(2) },
      { test: () => n(1), value: value(3) },
    ];
    expect([piecewiseValue(parts, value(4)), runs]).toEqual([n(2), 1]);
  });

  it("a bare condition is 1, no part holding is the otherwise value or undefined", () => {
    expect(piecewiseValue([{ test: () => n(1), value: null }], null)).toEqual(n(1));
    expect(piecewiseValue([{ test: () => UNDEFINED, value: null }], null)).toEqual(UNDEFINED);
    expect(piecewiseValue([{ test: () => UNDEFINED, value: null }], unsafe(n(7)))).toEqual(n(7));
    expect(piecewiseValue([], null)).toEqual(n(1));
  });

  it("NM-33 a list condition broadcasts every part, truncating to the shortest list", () => {
    const parts = [
      { test: () => list(UNDEFINED, n(1), n(1)), value: unsafe(list(n(5), n(6))) },
      { test: () => n(1), value: null },
    ];
    expect(piecewiseValue(parts, unsafe(n(0)))).toEqual(list(n(1), n(6)));
  });

  it("NM-33 with scalar conditions, a safe list value broadcasts a picked number", () => {
    const holds = [{ test: () => n(1), value: safe(n(1)) }];
    expect(piecewiseValue(holds, safe(list(n(1), n(2))))).toEqual(list(n(1), n(1)));
    // a picked list is the result whole (Desmos, 2026-10-20)
    const fails = [{ test: () => UNDEFINED, value: safe(list(n(1), n(2))) }];
    expect(piecewiseValue(fails, safe(list(n(3), n(4), n(5))))).toEqual(list(n(3), n(4), n(5)));
    expect(piecewiseValue(holds, unsafe(list(n(1), n(2))))).toEqual(n(1));
  });
});

describe("PR-31 PR-32 evaluation", () => {
  it("NM-41 `=` compares the full doubles; ±∞ compares and undefined holds no condition", () => {
    // literals fold exactly, so 0.1+0.2 is 0.3 (Desmos, 2026-10-20); computed doubles compare whole
    expect(evaluateLatex("\\{0.1+0.2=0.3:1,0\\}")).toEqual(n(1));
    expect(evaluateLatex("\\{\\sqrt{2}^{2}=2:1,0\\}")).toEqual(n(0));
    // Desmos, captured 2026-10-20: 1/0 is +∞, which is greater than 0
    expect(evaluateLatex("\\{\\frac{1}{0}>0:1,0\\}")).toEqual(n(1));
    expect(evaluateLatex("\\{\\frac{0}{0}>0:1,0\\}")).toEqual(n(0));
  });

  it("several restrictions multiply: the row is undefined where any is false", () => {
    expect(evaluateLatex("5\\{a>0\\}\\{a<2\\}", { rows: ["a=1"] })).toEqual(n(5));
    expect(evaluateLatex("5\\{a>0\\}\\{a<2\\}", { rows: ["a=3"] })).toEqual(UNDEFINED);
  });

  it("G-2 a restricted curve is NaN outside its restriction in real mode", () => {
    const f = compileRealFunction1(tree("x^{2}\\{0<x<2\\}"), "x", REAL);
    expect([f(-1), f(1), f(1.999), f(2), f(3)]).toEqual([NaN, 1, 1.999 ** 2, NaN, NaN]);
  });

  it("G-2 a step graphs each branch and the otherwise value in real mode", () => {
    const f = compileRealFunction1(tree("\\{x<0:-1,x>0:1\\}"), "x", REAL);
    const g = compileRealFunction1(tree("\\{x<0:-1,2\\}"), "x", REAL);
    expect([
      f(-3),
      f(0),
      f(3),
      g(-3),
      g(0),
      compileRealFunction1(tree("\\{\\}"), "x", REAL)(5),
    ]).toEqual([-1, NaN, 1, -1, 2, 1]);
  });

  it("G-2 a restricted region and implicit curve hold only where the restriction does", () => {
    const region = compileRealFunction2(tree("y-x\\{x>0\\}"), REAL);
    const circle = compileRealFunction2(tree("x^{2}+y^{2}-1\\{y>0\\}"), REAL);
    expect([region(1, 2), region(-1, 2), circle(0, 1), circle(0, -1)]).toEqual([1, NaN, 0, NaN]);
  });
});

describe("PR-31 branch types", () => {
  const error = (rows: string[]) => {
    const analysis = analyzeRows(
      rows.map((latex, k) => ({ id: `r${k}`, latex, hidden: false })),
      REAL.settings
    );
    return analysis.rows[rows.length - 1].error?.message;
  };

  it("points and numbers cannot share a piecewise, in either order or through a name", () => {
    const text = (a: string, b: string) =>
      `Cannot use ${a} and ${b} as the branches in a piecewise. Every branch must have the same type.`;
    expect(error(["\\{1>0:3,(1,2)\\}"])).toBe(text("a number", "a point"));
    expect(error(["\\{1>0,(1,2)\\}"])).toBe(text("a number", "a point"));
    expect(error(["P=[(1,2),(3,4)]", "\\{1>0:P,3\\}"])).toBe(text("a list of points", "a number"));
  });

  it("numbers and lists of numbers broadcast, and points share a piecewise", () => {
    expect(error(["\\{1>0:[1,2],3\\}"])).toBe(undefined);
    expect(error(["\\{1>0:(1,2),(3,4)\\}"])).toBe(undefined);
    expect(evaluateLatex("\\{1<0:(1,2),(3,4)\\}")).toEqual({ type: "point", value: [3, 4] });
  });
});

// Inferred from Desmos's typed piecewise (a three-argument broadcast) and its bundle's comparator
// errors; no live capture yet, so these pin the behaviour rather than a Desmos value.
describe("PR-31 PR-32 point rows, broadcasting and conditions", () => {
  const row = (rows: string[]) => {
    const analysis = analyzeRows(
      rows.map((latex, k) => ({ id: `r${k}`, latex, hidden: false })),
      REAL.settings
    );
    const last = analysis.rows[rows.length - 1];
    return [last.kind, last.isGraphable, last.error?.message ?? null];
  };
  const point = (x: number, y: number): Value => ({ type: "point", value: [x, y] });

  it("RC-15 a point-valued piecewise or restriction is a point row that evaluates", () => {
    expect(row(["\\{1>0:(1,2)\\}"])).toEqual(["point", true, null]);
    expect(row(["a=1", "\\{a>0:(1,2),(3,4)\\}"])).toEqual(["point", true, null]);
    expect(row(["a=1", "\\{a>0\\}(1,2)"])).toEqual(["point", true, null]);
    expect(evaluateLatex("\\{1>0:(1,2)\\}")).toEqual(point(1, 2));
    expect(evaluateLatex("(a,2)\\{a>0\\}\\{a<2\\}", { rows: ["a=1"] })).toEqual(point(1, 2));
    expect(evaluateLatex("(1,2)\\{a>0\\}", { rows: ["a=-1"] })).toEqual(UNDEFINED);
    expect(evaluateLatex("[(1,2),(3,4)]\\{1>0\\}")).toEqual(list(point(1, 2), point(3, 4)));
  });

  it("RC-2 a point piecewise using x or y, or a restricted (t, …), keeps the point errors", () => {
    const coordinates = "Too many variables, I don't know what to do with this.";
    expect(row(["\\{x>0:(1,2)\\}"])).toEqual(["error", false, coordinates]);
    expect(row(["\\{x>0:(x,1),(0,0)\\}"])).toEqual(["error", false, coordinates]);
    const notation = "This calculator doesn't support that notation.";
    expect(row(["(t,t^{2})\\{t>0.5\\}"])).toEqual(["error", false, notation]);
  });

  it("NM-33 a list value broadcasts a scalar condition's picked number; a picked list is whole", () => {
    expect(evaluateLatex("\\{1>0:1,[1,2]\\}")).toEqual(list(n(1), n(1)));
    expect(evaluateLatex("\\operatorname{length}(\\{1>0:1,[1,2]\\})")).toEqual(n(2));
    expect(evaluateLatex("\\{1>0:1,[1,2]\\}[2]")).toEqual(n(1));
    expect(evaluateLatex("\\{1<0:[1,2],[3,4,5]\\}")).toEqual(list(n(3), n(4), n(5)));
  });

  it("NM-31 a condition comparing points is Desmos's comparator error", () => {
    const text = "Cannot compare a point to a point.";
    expect(row(["\\{(1,2)>(0,0):1,0\\}"])).toEqual(["error", false, text]);
    expect(row(["\\{(1,2)=(1,2):1,0\\}"])).toEqual(["error", false, text]);
  });

  it("PR-29 a condition chain may point both ways, but never mixes = with an inequality", () => {
    expect(row(["a=1", "\\{1<a=2:5\\}"])[2]).toBe(
      "Cannot mix inequalities and equations in a chain of comparisons."
    );
    expect(evaluateLatex("\\{1<a>0:5\\}", { rows: ["a=1"] })).toEqual(UNDEFINED);
    expect(evaluateLatex("\\{0<a>0:5\\}", { rows: ["a=1"] })).toEqual(n(5));
    expect(evaluateLatex("\\{1=1=1:5\\}")).toEqual(n(5));
  });
});

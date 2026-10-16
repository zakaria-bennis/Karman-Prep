import { describe, expect, it } from "vitest";
import { buildScene } from "./scene";
import { DEFAULT_SETTINGS, type Expression } from "./types";
import { compileMath, makeScope, real } from "./math";
import { plainMath } from "./syntax";
import { sampleCurve } from "./plot";
const expression = (latex: string, id = "expression"): Expression => ({ id, latex });
const table: Expression = {
  id: "table",
  type: "table",
  columns: [
    { latex: "x_1", values: ["1", "2", "3", "4"] },
    { latex: "y_1", values: ["3", "5", "7", "9"] },
  ],
};
const scope = makeScope(DEFAULT_SETTINGS);
const evaluate = (s: string) => real(compileMath(s, scope).evaluate());
describe("local math engine", () => {
  it.each([
    ["2+3*4", 14],
    ["2^3^2", 512],
    ["-2^2", -4],
    ["sin(30)", 0.5],
    ["cos(60)", 0.5],
    ["asin(0.5)", 30],
    ["log(100)", 2],
    ["ln(e)", 1],
    ["sqrt(16)", 4],
    ["5!", 120],
    ["nCr(5,2)", 10],
    ["mean([1,2,6])", 3],
    ["total([1,2,3]^2)", 14],
    ["median([1,2,8,9])", 5],
    ["stdevp([1,2,3])", Math.sqrt(2 / 3)],
    ["2pi", 2 * Math.PI],
    ["\\frac{1}{\\sqrt{4}}", 0.5],
  ])("evaluates %s", (s, result) => expect(evaluate(s as string)).toBeCloseTo(result as number, 9));
  it("switches degrees, radians, and complex arithmetic", () => {
    expect(
      real(compileMath("sin(pi/2)", makeScope({ ...DEFAULT_SETTINGS, degrees: false })).evaluate())
    ).toBeCloseTo(1);
    expect(buildScene([expression("sqrt(-1)")], DEFAULT_SETTINGS).rows.expression.error).toContain(
      "complex mode"
    );
    const s = buildScene([expression("sqrt(-1)+i")], { ...DEFAULT_SETTINGS, complex: true });
    expect(s.rows.expression.value).toBe("2i");
  });
  it("evaluates variable dependencies and user functions", () => {
    const s = buildScene(
      [
        expression("y=f(x)+b", "g"),
        expression("f(x)=a*x^2", "f"),
        expression("b=3", "b"),
        expression("a=2", "a"),
      ],
      DEFAULT_SETTINGS
    );
    expect(s.plots.find((p) => p.id === "g")?.fn?.(4)).toBeCloseTo(35);
  });
  it("graphs implicit equations, inequalities, polar, piecewise and restricted domains", () => {
    const s = buildScene(
      [
        expression("x^2+y^2=25", "circle"),
        expression("y<x+1", "ineq"),
        expression("r=2sin(theta)", "polar"),
        expression("y={x<0:-x,x^2}", "piece"),
        expression("y=x^2{x>0}", "domain"),
      ],
      DEFAULT_SETTINGS
    );
    expect(s.plots.find((p) => p.id === "circle")?.fn?.(3, 4)).toBe(0);
    expect(s.plots.find((p) => p.id === "ineq")?.inequality).toBe("<");
    expect(s.plots.find((p) => p.id === "polar")?.xy?.(Math.PI / 2)[1]).toBeCloseTo(2);
    expect(s.plots.find((p) => p.id === "piece")?.fn?.(-3)).toBe(3);
    expect(s.plots.find((p) => p.id === "piece")?.fn?.(3)).toBe(9);
    expect(s.plots.find((p) => p.id === "domain")?.fn?.(-1)).toBeNaN();
  });
  it("finds repeated and crossing roots without reporting poles", () => {
    const s = buildScene(
      [
        expression("(x-1)^2=0", "repeated"),
        expression("x^2=4", "crossing"),
        expression("1/x=0", "pole"),
      ],
      DEFAULT_SETTINGS
    );
    expect(s.plots.find((p) => p.id === "repeated")?.points?.[0][0]).toBeCloseTo(1, 5);
    expect(s.plots.find((p) => p.id === "crossing")?.points?.map((p) => p[0])).toEqual([-2, 2]);
    expect(s.plots.find((p) => p.id === "pole")?.points).toEqual([]);
  });
  it("fits linear, constant, nonlinear and single-value regressions", () => {
    let s = buildScene([table, expression("y_1~m*x_1+b")], DEFAULT_SETTINGS);
    expect(s.rows.expression.regression?.parameters.m).toBeCloseTo(2, 6);
    expect(s.rows.expression.regression?.parameters.b).toBeCloseTo(1, 6);
    expect(s.rows.expression.regression?.r2).toBeCloseTo(1);
    expect(s.rows.expression.regression?.r).toBeCloseTo(1);
    s = buildScene([table, expression("y_1~a")], DEFAULT_SETTINGS);
    expect(s.rows.expression.regression?.parameters.a).toBeCloseTo(6, 6);
    const exp = {
      ...table,
      columns: [table.columns![0], { latex: "y_1", values: ["6", "18", "54", "162"] }],
    };
    s = buildScene([exp, expression("y_1~a*b^x_1")], DEFAULT_SETTINGS);
    expect(s.rows.expression.regression?.parameters.a).toBeCloseTo(2, 5);
    expect(s.rows.expression.regression?.parameters.b).toBeCloseTo(3, 5);
    s = buildScene([expression("5~a")], DEFAULT_SETTINGS);
    expect(s.rows.expression.regression?.parameters.a).toBeCloseTo(5);
    expect(s.rows.expression.regression?.r2).toBeNaN();
  });
  it("does not claim an unidentified regression is a unique fit", () => {
    const data = {
      ...table,
      columns: [{ latex: "x_1", values: ["1", "1", "1", "1"] }, table.columns![1]],
    };
    expect(
      buildScene([data, expression("y_1~m*x_1+b")], DEFAULT_SETTINGS).rows.expression.error
    ).toContain("uniquely");
  });
  it("keeps table rows paired and resolves plots placed before a regression", () => {
    const incomplete = {
      ...table,
      columns: [
        { latex: "x_1", values: ["1", "", "3"] },
        { latex: "y_1", values: ["2", "4", "6"] },
      ],
    };
    expect(buildScene([incomplete], DEFAULT_SETTINGS).rows.table.error).toContain("both cells");
    const result = buildScene(
      [expression("y=m*x+b", "graph"), table, expression("y_1~m*x_1+b")],
      DEFAULT_SETTINGS
    );
    expect(result.plots.find((p) => p.id === "graph")?.fn?.(5)).toBeCloseTo(11, 6);
  });
  it("evaluates scalar inequalities and equations in other variable names", () => {
    const result = buildScene(
      [expression("2<3", "compare"), expression("2a+1=5", "equation")],
      DEFAULT_SETTINGS
    );
    expect(result.rows.compare.value).toBe("true");
    expect(result.rows.equation.value).toBe("a = 2");
  });
  it("does not connect the branches of 1/x across its asymptote", () => {
    const s = buildScene([expression("y=1/x")], DEFAULT_SETTINGS);
    const paths = sampleCurve(s.plots[0], DEFAULT_SETTINGS, { width: 500, height: 500 });
    expect(paths.length).toBeGreaterThanOrEqual(2);
    expect(
      paths.every((path) => !(path.some(([x]) => x < 250) && path.some(([x]) => x > 250)))
    ).toBe(true);
  });
  it.each([
    'import("evil")',
    'evaluate("2+2")',
    "a=3",
    "x.constructor",
    "[1:10000000]",
    '"text"',
    "zeros(1000000)",
  ])("rejects non-math capabilities: %s", (input) =>
    expect(() => compileMath(input, scope)).toThrow()
  );
  it("normalizes nested fractions, subscripts and a bounded range", () => {
    expect(plainMath("\\frac{1}{\\frac{2}{3}}+x_{1}")).toBe("((1)/(((2)/(3))))+x_1");
    expect(evaluate("total([1...4])")).toBe(10);
    expect(() => plainMath("[1...100000000]")).toThrow();
  });
});

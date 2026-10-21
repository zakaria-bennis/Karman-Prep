import { describe, expect, it } from "vitest";
import { compileExpression, evaluateLatex, evaluateRows } from "./compile";
import { formatValue, formatValueLatex } from "./format";
import { ListError, MAX_LIST_ELEMENTS, rangeValue } from "./lists";
import { numberValue, UNDEFINED, type Value } from "./values";
import { analyzeRows, userFunctionNames } from "../analysis/index";
import { NO_DEADLINE } from "../deadline";
import { parseLatex } from "../latex/index";

const REAL = { angleMode: "radians", complex: false } as const;
const n = numberValue;
const list = (...items: number[]): Value => ({ type: "list", value: items.map(n) });
const numbers = (v: Value): number[] =>
  v.type === "list" ? v.value.map((item) => (item.type === "number" ? item.value : NaN)) : [];
const show = (latex: string, rows?: string[]) => formatValue(evaluateLatex(latex, { rows }));
const errorOf = (v: Value): string | null => (v.type === "undefined" ? (v.error ?? null) : null);

/** `latex` compiled straight against the values of `rows`, past any row-level analysis check. */
function direct(latex: string, rows: string[] = []): Value {
  const sources = rows.map((l, k) => ({ id: `r${k}`, latex: l, hidden: false }));
  const analysis = analyzeRows(sources, REAL);
  const byRow = evaluateRows(analysis, REAL, () => NO_DEADLINE);
  const values = new Map<string, Value>();
  for (const r of analysis.rows) {
    const v = byRow.get(r.id);
    if (r.kind === "definition" && r.defines && v) values.set(r.defines.name, v);
  }
  const parsed = parseLatex(latex, { userFunctions: userFunctionNames(analysis.functions) });
  if (!parsed.ok) throw new Error(`${latex}: ${parsed.error.code}`);
  const scope = { functions: analysis.functions, values, settings: REAL };
  return compileExpression(parsed.tree, scope)({}, NO_DEADLINE);
}

describe("list values", () => {
  it("NM-32 operators, one-argument built-ins and user functions apply element by element with scalar broadcast", () => {
    expect(evaluateLatex("[1,2,3]+1")).toEqual(list(2, 3, 4));
    expect(evaluateLatex("2\\cdot[1,2,3]")).toEqual(list(2, 4, 6));
    expect(evaluateLatex("10-[1,2]")).toEqual(list(9, 8));
    expect(evaluateLatex("[1,2,3]^{2}")).toEqual(list(1, 4, 9));
    expect(evaluateLatex("2^{[1,2,3]}")).toEqual(list(2, 4, 8));
    expect(evaluateLatex("-[1,2]")).toEqual(list(-1, -2));
    expect(evaluateLatex("\\left|[-1,2]\\right|")).toEqual(list(1, 2));
    expect(evaluateLatex("\\sqrt{[4,9]}")).toEqual(list(2, 3));
    expect(evaluateLatex("\\frac{[2,4]}{2}")).toEqual(list(1, 2));
    expect(evaluateLatex("\\ln([1,1])")).toEqual(list(0, 0));
    expect(show("\\sin[0,\\pi]")).toBe("[0, 0]");
    expect(show("\\sin([30,90]\\degree)", ["\\degree=\\frac{\\pi}{180}"])).toBe("[0.5, 1]");
    expect(evaluateLatex("f([1,2,3])", { rows: ["f(a)=a^{2}+1"] })).toEqual(list(2, 5, 10));
    expect(evaluateLatex("L+L", { rows: ["L=[1,2]"] })).toEqual(list(2, 4));
    expect(show("[1,0]/0")).toBe("[undefined, undefined]");
  });

  it("NM-33 lists of different lengths are truncated to the shorter one", () => {
    expect(evaluateLatex("[1,2,3]+[10,20]")).toEqual(list(11, 22));
    expect(evaluateLatex("[1,2]\\cdot[3,4,5]")).toEqual(list(3, 8));
    expect(evaluateLatex("[1,2]+[]")).toEqual(list());
    expect(show("(L_{1},L_{2})", ["L_{1}=[1,2,3]", "L_{2}=[4,5]"])).toBe("[(1, 4), (2, 5)]");
    expect(show("(L,5)", ["L=[1,2]"])).toBe("[(1, 5), (2, 5)]");
  });

  it("NM-34 a nested list evaluated at run time is a nested-list error, never a nested value", () => {
    const v = direct("[f(1,1),2]", ["f(a,b)=[a,b]"]);
    expect([v.type, errorOf(v)]).toEqual(["undefined", "nested-list"]);
    expect(errorOf(direct("[1...f(2,2)]", ["f(a,b)=[a,b]"]))).toBe("nested-list");
  });

  it("NM-35 a range longer than 10,000 elements is a list-too-long error", () => {
    expect(MAX_LIST_ELEMENTS).toBe(10000);
    expect(numbers(evaluateLatex("[1...10000]")).length).toBe(10000);
    expect(errorOf(direct("[1...10001]"))).toBe("list-too-long");
    expect(errorOf(direct("[0,10^{-300},...,1]"))).toBe("list-too-long");
    expect(errorOf(direct("[1...n]", ["n=20000"]))).toBe("list-too-long");
  });

  it("NM-36 [0,0.1,...,1] has 11 elements and ends exactly at 1", () => {
    const v = numbers(evaluateLatex("[0,0.1,...,1]"));
    expect(v.length).toBe(11);
    expect(v[10]).toBe(1);
    // Exact, as Desmos folds a constant range in fractions: not 3·0.1 = 0.30000000000000004.
    expect(v).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
  });

  it("NM-36 ranges step by ±1 or by b − a and round their count, so the last element can pass c", () => {
    expect(numbers(evaluateLatex("[1...5]"))).toEqual([1, 2, 3, 4, 5]);
    expect(numbers(evaluateLatex("[10...1]"))).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(numbers(evaluateLatex("[1...10.5]")).at(-1)).toBe(11);
    expect(numbers(evaluateLatex("[1...10.4]")).at(-1)).toBe(10);
    expect(numbers(evaluateLatex("[1,3,...,10]"))).toEqual([1, 3, 5, 7, 9, 11]);
    expect(numbers(evaluateLatex("[5...5]"))).toEqual([5]);
    expect(numbers(evaluateLatex("[0.5...2.5]"))).toEqual([0.5, 1.5, 2.5]);
    expect(numbers(evaluateLatex("[0,0.1,...,1]")).at(-1)).toBe(1);
    expect(numbers(evaluateLatex("[1...n]", { rows: ["n=3"] }))).toEqual([1, 2, 3]);
  });

  it("NM-36 counts and elements are exact on fractions, as Desmos folds a constant range", () => {
    // (1.25 − 1)/(1.1 − 1) is 2.5 exactly, rounded up; in doubles it is 2.499999999999998.
    expect(numbers(evaluateLatex("[1,1.1,...,1.25]"))).toEqual([1, 1.1, 1.2, 1.3]);
    expect(numbers(evaluateLatex("[2,2.1,...,2.15]"))).toEqual([2, 2.1, 2.2]);
    // Elements are a + k·s, never the bound: the last one is 3, not 3.0000000001.
    expect(numbers(evaluateLatex("[1...3.0000000001]"))).toEqual([1, 2, 3]);
    expect(numbers(evaluateLatex("[0,\\frac{1}{3},...,1]"))).toEqual([0, 1 / 3, 2 / 3, 1]);
    expect(numbers(evaluateLatex("[a,a+0.1,...,a+0.3]", { rows: ["a=0"] }))).toEqual([
      0, 0.1, 0.2, 0.3,
    ]);
  });

  it("NM-36 more values before or after the ellipsis must sit on the one sequence", () => {
    expect(numbers(evaluateLatex("[1,2,3,...,10]"))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(numbers(evaluateLatex("[1,...,9,10]"))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(numbers(evaluateLatex("[0,0.1,0.2,...,0.9,1]")).at(3)).toBe(0.3);
    expect(errorOf(direct("[1,2,4,...,10]"))).toBe("range-step");
    expect(errorOf(direct("[1,2,...,9,11]"))).toBe("range-step");
    expect(errorOf(direct("[1,2,...,a,10]", ["a=8"]))).toBe("range-step");
    // A count below the number of values written on either side: [1, 2] cannot hold 3 values.
    expect(errorOf(direct("[1,2,3,...,2]"))).toBe("range-step");
    expect(errorOf(direct("[1...0,1]"))).toBe("range-step");
  });

  it("NM-36 a range Desmos does not count as arithmetic is a range-step error", () => {
    expect(errorOf(direct("[1,1,...,5]"))).toBe("range-step");
    expect(errorOf(direct("[a,a,...,5]", ["a=2"]))).toBe("range-step");
    expect(errorOf(direct("[1,2,...,a]", ["a=0"]))).toBe("range-step");
    expect(errorOf(direct("[1,0,...,a]", ["a=5"]))).toBe("range-step");
    expect(() => rangeValue([UNDEFINED], [n(3)])).toThrow(new ListError("range-step"));
    expect(() => rangeValue([n(1)], [n(NaN)])).toThrow(new ListError("range-step"));
  });

  it("NM-32 a list of points and a point of lists are lists of points; mixing numbers and points is list-mixed", () => {
    expect(show("[(1,2),(3,4)]")).toBe("[(1, 2), (3, 4)]");
    expect(show("([1,2],[3,4])")).toBe("[(1, 3), (2, 4)]");
    expect(errorOf(direct("[1,(2,3)]"))).toBe("list-mixed");
  });

  it("AR-54 a list error never throws out of a compiled closure and never reaches other rows' scope", () => {
    const parsed = parseLatex("[1,1,...,5]");
    if (!parsed.ok) throw new Error("parse");
    const f = compileExpression(parsed.tree, {
      functions: new Map(),
      values: new Map(),
      settings: REAL,
    });
    expect(() => f({}, NO_DEADLINE)).not.toThrow();
    const rows = ["a=1", "L=[a,a,...,5]", "L+1"].map((latex, k) => ({
      id: `r${k}`,
      latex,
      hidden: false,
    }));
    const byRow = evaluateRows(analyzeRows(rows, REAL), REAL, () => NO_DEADLINE);
    expect(errorOf(byRow.get("r1")!)).toBe("range-step");
    expect(byRow.get("r2")).toEqual(UNDEFINED);
  });
});

describe("list display", () => {
  it("NM-38 a list result shows its first 30 elements, then …", () => {
    expect(show("[1...30]")).toBe(`[${Array.from({ length: 30 }, (_, k) => k + 1).join(", ")}]`);
    expect(show("[1...31]")).toBe(`[${Array.from({ length: 30 }, (_, k) => k + 1).join(", ")}, …]`);
    expect(show("[]")).toBe("[]");
    expect(formatValueLatex(list(1, 2))).toBe("\\left[1,2\\right]");
    const long = { type: "list" as const, value: Array.from({ length: 40 }, (_, k) => n(k)) };
    expect(formatValueLatex(long)).toBe(
      `\\left[${Array.from({ length: 30 }, (_, k) => k).join(",")},\\ldots\\right]`
    );
  });
});

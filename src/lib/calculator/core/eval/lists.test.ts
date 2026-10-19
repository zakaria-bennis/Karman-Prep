import { describe, expect, it } from "vitest";
import { compileExpression, evaluateLatex, evaluateRows } from "./compile";
import { formatValue, formatValueLatex } from "./format";
import { MAX_LIST_ELEMENTS, rangeValue } from "./lists";
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
    expect(evaluateLatex("2[1,2,3]")).toEqual(list(2, 4, 6));
    expect(evaluateLatex("10-[1,2]")).toEqual(list(9, 8));
    expect(evaluateLatex("[1,2,3]^{2}")).toEqual(list(1, 4, 9));
    expect(evaluateLatex("2^{[1,2,3]}")).toEqual(list(2, 4, 8));
    expect(evaluateLatex("-[1,2]")).toEqual(list(-1, -2));
    expect(evaluateLatex("\\left|[-1,2]\\right|")).toEqual(list(1, 2));
    expect(evaluateLatex("\\sqrt{[4,9]}")).toEqual(list(2, 3));
    expect(evaluateLatex("\\frac{[2,4]}{2}")).toEqual(list(1, 2));
    expect(evaluateLatex("\\ln([1,1])")).toEqual(list(0, 0));
    expect(show("\\sin[0,\\pi]")).toBe("[0, 0]");
    expect(show("\\sin([30,90]^{\\circ})")).toBe("[0.5, 1]");
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
    expect(v[3]).toBe(3 * 0.1); // a + k·s, never accumulated
  });

  it("NM-36 ranges step by ±1 or by b − a, stop at c and are empty when the step points away", () => {
    expect(numbers(evaluateLatex("[1...5]"))).toEqual([1, 2, 3, 4, 5]);
    expect(numbers(evaluateLatex("[10...1]"))).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(numbers(evaluateLatex("[1...10.5]")).at(-1)).toBe(10);
    expect(numbers(evaluateLatex("[1,3,...,10]"))).toEqual([1, 3, 5, 7, 9]);
    expect(numbers(evaluateLatex("[5...5]"))).toEqual([5]);
    expect(numbers(evaluateLatex("[0.5...2.5]"))).toEqual([0.5, 1.5, 2.5]);
    expect(evaluateLatex("[1,2,...,0]")).toEqual(list());
    expect(evaluateLatex("[1,0,...,5]")).toEqual(list());
    expect(numbers(evaluateLatex("[1...n]", { rows: ["n=3"] }))).toEqual([1, 2, 3]);
  });

  it("NM-36 a range whose step is 0 is a range-step error, and undefined bounds give undefined", () => {
    expect(errorOf(direct("[1,1,...,5]"))).toBe("range-step");
    expect(errorOf(direct("[a,a,...,5]", ["a=2"]))).toBe("range-step");
    expect(rangeValue(UNDEFINED, null, n(3))).toEqual(UNDEFINED);
    expect(rangeValue(n(1), null, n(NaN))).toEqual(UNDEFINED);
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

import { describe, expect, it } from "vitest";
import { compileRealFunction1, compileRealFunction2, evaluateLatex, evaluateRows } from "./compile";
import { NO_DEADLINE } from "../deadline";
import { analyzeRows } from "../analysis/index";
import { parseLatex } from "../latex/index";
import type { Value } from "./values";

/** The double value of `latex` after `rows`, or NaN when it is not a real number. */
function value(latex: string, rows: string[] = [], complex = false): number {
  const v: Value = evaluateLatex(latex, { rows, settings: { complex } });
  return v.type === "number" ? v.value : NaN;
}

describe("MATHS-CORE-1 exact constant path", () => {
  it("MATHS-CORE-1 literals stay exact through +, −, ×, ÷ and powers", () => {
    expect(value("0.1+0.2-0.3")).toBe(0);
    expect(value("-0.3+0.1+0.2")).toBe(0);
    expect(value("0.1\\cdot3-0.3")).toBe(0);
    expect(value("\\frac{0.3}{0.1}-3")).toBe(0);
    expect(value("0.1^{2}-0.01")).toBe(0);
    expect(value("0.04^{0.5}-0.2")).toBe(0);
    expect(value("10\\%-0.1")).toBe(0);
    expect([value("0.1+0.2=0.3"), value("b+0.2=0.3", ["b=0.1"]), value("0.1+0.2>0.3")]).toEqual([
      1,
      1,
      NaN,
    ]);
  });

  it("MATHS-CORE-1 rule i: sqrt, mod and abs have exact versions", () => {
    expect(value("\\sqrt{0.04}-0.2")).toBe(0);
    expect(value("\\operatorname{mod}(0.3,0.1)")).toBe(0);
    expect(value("\\operatorname{mod}(-0.3,0.2)")).toBe(0.1);
    expect(value("\\left|-0.1\\right|+0.2-0.3")).toBe(0);
    expect(value("\\operatorname{abs}(-0.1)+0.2-0.3")).toBe(0);
    expect(value("\\operatorname{round}(\\sqrt{1.010025},2)")).toBe(1.01);
  });

  it("MATHS-CORE-1 rule ii: an integer-valued double sub-result re-enters the exact path", () => {
    expect(value("\\pi-\\pi+0.1+0.2-0.3")).toBe(0);
    expect(value("\\sqrt{2}\\cdot0+0.1+0.2-0.3")).toBe(0);
    expect(value("\\pi+0.1+0.2-0.3-\\pi")).toBe(4.440892098500626e-16);
  });

  it("MATHS-CORE-1 non-rational inputs fall back to doubles", () => {
    expect(value("2^{0.5}\\cdot2^{0.5}")).toBe(2.0000000000000004);
    expect(value("\\sqrt{2}^{2}")).toBe(2.0000000000000004);
    expect(value("\\frac{1}{0}")).toBeNaN();
    expect(value("\\sqrt{-4}")).toBeNaN();
  });

  it("MATHS-CORE-1 the exact path keeps complex mode's rules", () => {
    const v = evaluateLatex("\\sqrt{-0.04}", { settings: { complex: true } });
    expect(v).toEqual({ type: "complex", value: { re: 0, im: 0.2 } });
    expect(value("(-8)^{\\frac{1}{3}}+2", [], true)).toBe(0);
  });
});

describe("MATHS-CORE-61 round on exact inputs", () => {
  it("MATHS-CORE-61 round(x,n) is round(x·10^r)/10^r on the exact value", () => {
    expect(value("\\operatorname{round}(1.005,2)")).toBe(1.01);
    expect(value("\\operatorname{round}(0.285,2)")).toBe(0.29);
    expect(value("\\operatorname{round}(2.675,2)")).toBe(2.68);
    expect(value("\\operatorname{round}(1234.5678,-2.4)")).toBe(1200);
    expect(value("\\operatorname{round}(2.5,1.5)")).toBe(2.5);
    expect(value("\\operatorname{round}(0.1,400)")).toBe(0.1);
    expect(value("\\operatorname{round}(-2.5)")).toBe(-2);
  });
});

describe("MATHS-CORE-2 constants in definitions and user calls", () => {
  it("MATHS-CORE-2 definitions and user-function calls on constants stay exact", () => {
    expect(value("b+0.2-0.3", ["b=0.1"])).toBe(0);
    expect(value("a-0.3", ["a=0.1+0.2"])).toBe(0);
    expect(value("f(a)", ["f(x)=\\operatorname{round}(x,2)", "a=1.005"])).toBe(1.01);
    expect(value("g(0.1)", ["g(x)=x+0.2-0.3"])).toBe(0);
  });

  it("MATHS-CORE-2 graphing over x uses doubles", () => {
    const parsed = parseLatex("x+0.2-0.3");
    if (!parsed.ok) throw new Error("parse");
    const settings = { angleMode: "radians", complex: false } as const;
    const f = compileRealFunction1(parsed.tree, "x", {
      functions: new Map(),
      values: new Map(),
      settings,
    });
    expect(f(0.1)).toBe(0.1 + 0.2 - 0.3);
  });
});

/** The row `y=latex` graphed over x after `rows`, in the scope the worker builds. */
function plot(latex: string, rows: string[] = [], complex = false): (x: number) => number {
  const settings = { angleMode: "radians", complex } as const,
    sources = [...rows, `y=${latex}`].map((l, k) => ({ id: `row-${k}`, latex: l, hidden: false })),
    analysis = analyzeRows(sources, settings),
    byRow = evaluateRows(analysis, settings, () => NO_DEADLINE),
    values = new Map<string, Value>();
  for (const row of analysis.rows) {
    const v = byRow.get(row.id);
    if (row.kind === "definition" && row.defines?.type === "value" && v !== undefined) {
      values.set(row.defines.name, v);
    }
  }
  const graph = analysis.byId.get(`row-${rows.length}`)?.graph;
  if (graph?.kind !== "explicit") throw new Error("not an explicit graph");
  return compileRealFunction1(graph.expr, "x", { functions: analysis.functions, values, settings });
}

describe("MATHS-CORE-1, 2 graphing folds constant sub-trees on the exact path", () => {
  it("MATHS-CORE-2 a constant part plots the value its row shows, in both modes", () => {
    for (const complex of [false, true]) {
      expect(plot("x+1000\\operatorname{mod}(0.3,0.1)", [], complex)(0)).toBe(0);
      expect(plot("x+10^{4}\\operatorname{round}(1.005,2)-10100", [], complex)(0)).toBe(0);
      expect(plot("x+10^{18}(0.1+0.2-0.3)", [], complex)(0.5)).toBe(0.5);
      expect(plot("\\operatorname{round}(1.005,2)+x", [], complex)(0)).toBe(1.01);
      expect(plot("\\operatorname{round}(a,2)+x", ["a=1.005"], complex)(0)).toBe(1.01);
      expect(plot("10^{18}(b+0.2-0.3)+x", ["b=0.1"], complex)(0.5)).toBe(0.5);
      expect(plot("f(x)", ["f(t)=t+10^{18}(0.1+0.2-0.3)"], complex)(0.5)).toBe(0.5);
      expect(plot("f(2)+x", ["f(t)=\\operatorname{round}(t+0.005,2)"], complex)(0)).toBe(2.01);
    }
  });

  it("MATHS-CORE-2 a part that depends on x uses doubles, in both modes", () => {
    for (const complex of [false, true]) {
      expect(plot("x+0.2-0.3", [], complex)(0.1)).toBe(0.1 + 0.2 - 0.3);
      expect(plot("x\\cdot0.1-0.3", [], complex)(3)).toBe(3 * 0.1 - 0.3);
      expect(plot("f(x)", ["f(t)=t+0.2-0.3"], complex)(0.1)).toBe(0.1 + 0.2 - 0.3);
      expect(plot("g", ["g=x+0.2-0.3"], complex)(0.1)).toBe(0.1 + 0.2 - 0.3);
    }
  });

  it("MATHS-CORE-2 implicit graphs fold constants too", () => {
    const parsed = parseLatex("x+y+10^{18}(0.1+0.2-0.3)");
    if (!parsed.ok) throw new Error("parse");
    const settings = { angleMode: "radians", complex: false } as const;
    const F = compileRealFunction2(parsed.tree, {
      functions: new Map(),
      values: new Map(),
      settings,
    });
    expect(F(0.5, 0.25)).toBe(0.75);
  });
});

describe("MATHS-CORE-54 = compares exact values", () => {
  it("MATHS-CORE-54 two rationals that share a double are not equal", () => {
    const a = "\\frac{9007199254740990}{9007199254740991}",
      b = "\\frac{9007199254740989}{9007199254740990}";
    expect(9007199254740990 / 9007199254740991).toBe(9007199254740989 / 9007199254740990);
    expect([value(`${a}=${b}`), value(`${a}>${b}`), value(`${a}<${b}`)]).toEqual([NaN, 1, NaN]);
    expect([value(`${a}>=${b}`), value(`${a}=${a}`), value(`0.1+0.2<=0.3`)]).toEqual([1, 1, 1]);
  });
});

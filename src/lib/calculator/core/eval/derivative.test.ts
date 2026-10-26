import { describe, expect, it } from "vitest";
import type { FunctionDefinition } from "../analysis/index";
import { parseLatex } from "../latex/index";
import type { Node } from "../latex/ast";
import { compileExpression } from "./compile";
import { differentiate, primedCalls, withDerivatives } from "./derivative";
import { numberValue } from "./values";
import { NO_DEADLINE } from "../deadline";

const tree = (latex: string, userFunctions: string[] = []): Node => {
  const parsed = parseLatex(latex, { userFunctions: new Set(userFunctions) });
  if (!parsed.ok) throw new Error(parsed.error.code);
  return parsed.tree;
};
const settings = { angleMode: "radians" as const, complex: false };

/** d/dx of `latex` at x, through the real compiler. */
function slope(latex: string, x: number, angleMode: "radians" | "degrees" = "radians") {
  const d = differentiate(tree(latex), "x", () => undefined, angleMode);
  if (d === null) return null;
  const run = compileExpression(d, { functions: new Map(), values: new Map(), settings });
  const v = run({ x: numberValue(x) }, NO_DEADLINE);
  return v.type === "number" ? v.value : null;
}

describe("FN-61 symbolic derivatives", () => {
  it("polynomials are exact: 2x²−15x+23 has slope 1 at 4, x³ slope 12 at 2", () => {
    expect(slope("2x^{2}-15x+23", 4)).toBe(1);
    expect(slope("x^{3}", 2)).toBe(12);
    expect(slope("5", 2)).toBe(0);
    expect(slope("\\frac{1}{x}", 2)).toBe(-0.25);
  });

  it("the elementary built-ins, by the chain rule", () => {
    expect(slope("\\sin(x)", 1)).toBe(Math.cos(1));
    expect(slope("\\cos(2x)", 1)).toBeCloseTo(-2 * Math.sin(2), 15);
    expect(slope("e^{3x}", 0)).toBeCloseTo(3, 15);
    expect(slope("\\ln(x)", 4)).toBe(0.25);
    expect(slope("\\sqrt{x}", 4)).toBe(0.25);
    expect(slope("\\arctan(x)", 1)).toBe(0.5);
    expect(slope("2^{x}", 0)).toBeCloseTo(Math.LN2, 15);
    expect(slope("x^{x}", 1)).toBeCloseTo(1, 15);
    expect(slope("\\log(x)", 10)).toBeCloseTo(1 / (10 * Math.LN10), 15);
  });

  it("NM-25: degree-mode circular functions carry π/180", () => {
    expect(slope("\\sin(x)", 0, "degrees")).toBeCloseTo(Math.PI / 180, 15);
  });

  it("is undefined where the function is not differentiable, 0 on a step's flat", () => {
    expect(slope("\\left|x\\right|", 0)).toBeNull();
    expect(slope("\\left|x\\right|", -2)).toBe(-1);
    expect(slope("\\operatorname{floor}(x)", 0.5)).toBe(0);
    expect(slope("\\operatorname{floor}(x)", 1)).toBeNull();
    expect(differentiate(tree("x!"), "x", () => undefined, "radians")).toBeNull();
  });
});

describe("FN-63 derived definitions", () => {
  const definition = (name: string, params: string[], body: string, fns: string[] = []) => ({
    name,
    params,
    body: tree(body, fns),
    rowId: name,
  });

  it("f', f'' and f''' of a one-parameter function; other user functions inlined", () => {
    const functions = new Map<string, FunctionDefinition>([
      ["f", definition("f", ["x"], "x^{3}")],
      ["g", definition("g", ["t"], "f(2t)", ["f"])],
      ["k", definition("k", ["a", "b"], "a+b")],
    ]);
    const names = new Set<string>();
    primedCalls(tree("f'''(1)+g'(1)+k'(1,2)", ["f", "g", "k"]), names);
    expect([...names].sort()).toEqual(["f'''", "g'", "k'"]);
    withDerivatives(functions, names, "radians");
    expect(functions.get("f'")?.params).toEqual(["x"]);
    expect(functions.has("f''")).toBe(true);
    expect(functions.has("k'")).toBe(false); // FN-63: two parameters
    const run = (latex: string) =>
      compileExpression(tree(latex, ["f", "g", "f'", "f''", "f'''", "g'"]), {
        functions,
        values: new Map(),
        settings,
      })({}, NO_DEADLINE);
    expect(run("f'(2)")).toEqual(numberValue(12));
    expect(run("f''(2)")).toEqual(numberValue(12));
    expect(run("f'''(2)")).toEqual(numberValue(6));
    expect(run("g'(1)")).toEqual(numberValue(24));
  });
});

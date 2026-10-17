import { expect, it } from "vitest";
import { collectNameUses, isReservedName } from "./names";
import { displayName, rowErrorMessage } from "./messages";
import { COMPLEX_HINT } from "./index";
import { parseLatex } from "../latex/index";
import type { RowErrorCode } from "../corpus/types";

const REAL = { angleMode: "radians", complex: false } as const;
const CX = { ...REAL, complex: true } as const;

/** The parseLatex tree of `latex`; throws on a parse error. */
function tree(latex: string, userFunctions?: ReadonlySet<string>) {
  const parsed = parseLatex(latex, { userFunctions });
  if (!parsed.ok) throw new Error(`${latex}: ${parsed.error.code}`);
  return parsed.tree;
}

it("RC-3 reserved names are coordinates, constants, i in complex mode and built-ins", () => {
  for (const x of ["x", "y", "r", "\\theta", "e", "pi", "tau", "sin", "ln", "arccot"])
    expect(isReservedName(x, REAL), x).toBe(true);
  for (const x of ["t", "a", "A", "i", "a_{1}", "\\alpha"])
    expect(isReservedName(x, REAL), x).toBe(false);
  expect(isReservedName("i", CX)).toBe(true);
});

it("RC-3 name uses come in source order with call and point flags", () => {
  const flags = (l: string, fns?: Set<string>) =>
    collectNameUses(tree(l, fns)).map((u) => [u.name, u.call, u.inPoint]);
  expect(flags("(t,\\log_{b}x)")).toEqual([
    ["t", false, true],
    ["b", false, true],
    ["x", false, true],
  ]);
  expect(flags("f(2)+c", new Set(["f"]))).toEqual([
    ["f", true, false],
    ["c", false, false],
  ]);
});

it("RC-2, RC-7, RC-8, RC-19, RC-20 row errors and the complex hint use the exact copy of 01-interfaces section 3", () => {
  const table: [RowErrorCode, string[], string][] = [
    ["syntax", [], "This can't be read. Check for a missing bracket or operator."],
    ["point-arity", [], "A point needs exactly two coordinates."],
    ["unsupported", ["t"], "This calculator doesn't support that notation."],
    ["unsupported", ["r"], "r is for polar graphs, which aren't available yet."],
    ["unsupported", ["θ"], "θ is for polar graphs, which aren't available yet."],
    ["relation-chain", [], "A chain of inequalities must point one way and use at most one =."],
    ["too-many-nodes", [], "This row is too long to evaluate. Split it into smaller definitions."],
    ["too-deep", [], "This row is nested too deeply."],
    ["too-many-params", [], "Functions can have at most 8 parameters."],
    ["duplicate-definition", ["a"], "a is defined more than once."],
    ["dependency", ["a"], "a has more than one definition."],
    ["cycle", ["a"], "a is defined in terms of itself."],
    ["reserved-name", ["e"], "e is reserved and can't be redefined."],
    ["arity", ["g", "2"], "g takes 2 arguments."],
    ["arity", ["sin", "1"], "sin takes 1 argument."],
    ["arity", ["arctan", "1 or 2"], "arctan takes 1 or 2 arguments."],
    ["point-coordinates", [], "A point's coordinates can't use x or y."],
    ["mixed-variables", [], "Use an equation such as y=… to graph an expression in x and y."],
    ["polar-variable", ["r"], "r only has a meaning in a polar equation."],
    ["timeout", [], "This is taking too long. Try a smaller range or fewer terms."],
  ];
  for (const [code, names, text] of table) expect(rowErrorMessage(code, names)).toBe(text);
  expect(COMPLEX_HINT).toEqual({
    text: "Turn on complex mode to use i.",
    action: "Turn on complex mode",
  });
  const shown = [
    ["\\theta", "θ"],
    ["pi", "π"],
    ["tau", "τ"],
    ["\\alpha", "α"],
    ["a_{1}", "a_1"],
    ["v_{max}", "v_max"],
    ["A", "A"],
  ];
  for (const [name, text] of shown) expect(displayName(name)).toBe(text);
});

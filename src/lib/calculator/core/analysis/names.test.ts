import { expect, it } from "vitest";
import { collectNameUses, isReservedName } from "./names";
import { displayName, rowErrorMessage } from "./messages";
import { analyzeRows, COMPLEX_HINT } from "./index";
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

it("RC-2, RC-7, RC-8, RC-19, RC-20 row errors and the complex hint use the exact spec copy", () => {
  const table: [RowErrorCode, string[], string][] = [
    ["syntax", [], "Sorry, I don't understand this."],
    ["point-arity", [], "Points may only have 2 coordinates."],
    ["unsupported", ["t"], "This calculator doesn't support that notation."],
    ["unsupported", ["r"], "r is for polar graphs, which aren't available yet."],
    ["unsupported", ["θ"], "θ is for polar graphs, which aren't available yet."],
    ["relation-chain", [], "Cannot mix inequalities and equations in a chain of comparisons."],
    ["relation-side", [">"], "You need something on both sides of the '>' symbol."],
    ["too-many-nodes", [], "This row is too long to evaluate. Split it into smaller definitions."],
    ["too-deep", [], "This row is nested too deeply."],
    ["too-many-params", [], "Functions can have at most 8 parameters."],
    [
      "duplicate-definition",
      ["a"],
      "You've defined 'a' in more than one place. Try deleting some of the definitions of 'a'.",
    ],
    [
      "duplicate-definition",
      ["θ_1"],
      "You've defined 'θ_1' in more than one place. Try deleting some of the definitions of 'θ_1'.",
    ],
    ["dependency", ["a"], "a has more than one definition."],
    ["cycle", ["a"], "a is defined in terms of itself."],
    ["reserved-name", ["e"], "e is reserved and can't be redefined."],
    [
      "arity",
      ["g", "2", "1"],
      "Function 'g' requires 2 arguments. For example, try typing: g(1, 2).",
    ],
    [
      "arity",
      ["f", "1", "2"],
      "Function 'f' requires only 1 argument. For example, try typing: f(x).",
    ],
    [
      "arity",
      ["sin", "1", "2"],
      "Function 'sin' requires only 1 argument. For example, try typing: sin(x).",
    ],
    [
      "arity",
      ["arctan", "1 or 2", "3"],
      "Function 'arctan' requires 2 arguments. For example, try typing: arctan(1, 2).",
    ],
    [
      "arity",
      ["nCr", "2", "1"],
      "Function 'nCr' requires 2 arguments. For example, try typing: nCr(1, 2).",
    ],
    ["point-coordinates", [], "Too many variables, I don't know what to do with this."],
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

it("PR-30, PR-34, NM-37 a half-typed regression and deferred list notation have their own copy", () => {
  const table: [RowErrorCode, string[], string][] = [
    ["sim-side", [], "You need something on both sides of the '∼' symbol."],
    [
      "unsupported",
      ["Building a list with 'for'"],
      "Building a list with 'for' isn't supported yet.",
    ],
  ];
  for (const [code, names, text] of table) expect(rowErrorMessage(code, names)).toBe(text);
  const rows = ["[n^{2}\\operatorname{for}n=[1...5]]", "y_{1}\\sim"].map((latex, k) => ({
    id: `r${k}`,
    latex,
    hidden: false,
  }));
  expect(analyzeRows(rows, REAL).rows.map((r) => r.error?.message)).toEqual([
    "Building a list with 'for' isn't supported yet.",
    "You need something on both sides of the '∼' symbol.",
  ]);
});

it("NM-34, NM-35, NM-36, NM-32 list errors use their exact copy", () => {
  const table: [RowErrorCode, string[], string][] = [
    ["nested-list", [], "Cannot store a list of numbers in a list."],
    ["list-too-long", [], "Lists may not have more than 10,000 elements."],
    ["range-step", [], "Ranges must be arithmetic sequences."],
    ["list-mixed", [], "All elements of a list must have the same type."],
  ];
  for (const [code, names, text] of table) expect(rowErrorMessage(code, names)).toBe(text);
});

it("R-6, EL-35 undefined names read as the reference's Too many variables warning", () => {
  const table: [RowErrorCode, string[], string][] = [
    ["too-many-variables", ["k"], "Too many variables. Try defining 'k'."],
    ["too-many-variables", ["m", "b"], "Too many variables. Try defining 'm' or 'b'."],
    ["too-many-variables", ["a", "b", "c"], "Too many variables. Try defining 'a', 'b' or 'c'."],
    ["too-many-variables", [], "Too many variables, I don't know what to do with this."],
  ];
  for (const [code, names, text] of table) expect(rowErrorMessage(code, names)).toBe(text);
});

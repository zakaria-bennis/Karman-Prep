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
    ["arity", ["g", "2"], "g takes 2 arguments."],
    ["arity", ["f", "1", "2"], "f takes 1 argument."],
    [
      "arity",
      ["sin", "1", "2"],
      "Function 'sin' requires only 1 argument. For example, try typing: sin(x).",
    ],
    [
      "arity",
      ["arctan", "1 or 2", "3"],
      "Function 'arctan' requires only 1 or 2 arguments. For example, try typing: arctan(1, 2).",
    ],
    [
      "arity",
      ["nCr", "2", "1"],
      "Function 'nCr' requires 2 arguments. For example, try typing: nCr(1, 2).",
    ],
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

it("PR-30, PR-34, NM-30, NM-31, NM-37, G-22 a half-typed regression and deferred list notation have their own copy", () => {
  const table: [RowErrorCode, string[], string][] = [
    ["sim-side", [], "You need something on both sides of the '∼' symbol."],
    ["unsupported", ["Indexing a list"], "Indexing a list isn't supported yet."],
    ["unsupported", ["Slicing a list"], "Slicing a list isn't supported yet."],
    ["unsupported", ["Filtering a list"], "Filtering a list isn't supported yet."],
    [
      "unsupported",
      ["Building a list with 'for'"],
      "Building a list with 'for' isn't supported yet.",
    ],
    [
      "unsupported",
      ["Graphing a list of curves"],
      "Graphing a list of curves isn't supported yet.",
    ],
  ];
  for (const [code, names, text] of table) expect(rowErrorMessage(code, names)).toBe(text);
  const rows = ["L[2]", "y_{1}\\sim"].map((latex, k) => ({ id: `r${k}`, latex, hidden: false }));
  expect(analyzeRows(rows, REAL).rows.map((r) => r.error?.message)).toEqual([
    "Indexing a list isn't supported yet.",
    "You need something on both sides of the '∼' symbol.",
  ]);
});

it("NM-34, NM-35, NM-36, NM-32 list errors use their exact copy", () => {
  const table: [RowErrorCode, string[], string][] = [
    ["nested-list", [], "Cannot store a list of numbers in a list."],
    ["list-too-long", [], "A list can have at most 10,000 elements."],
    ["range-step", [], "A range can't step by 0. Make its first two values different."],
    ["list-mixed", [], "A list can't mix numbers and points."],
  ];
  for (const [code, names, text] of table) expect(rowErrorMessage(code, names)).toBe(text);
});

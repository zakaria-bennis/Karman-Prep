import { expect, it } from "vitest";
import { collectNameUses, isReservedName } from "./names";
import { displayName, rowErrorMessage } from "./messages";
import { analyzeRows } from "./index";
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
    ["syntax", [], "Can't read this expression."],
    ["point-arity", [], "Points can have only 2 coordinates."],
    ["unsupported", ["t"], "This notation isn't supported."],
    ["unsupported", ["r"], "Polar graphs (r) aren't available yet."],
    ["unsupported", ["θ"], "Polar graphs (θ) aren't available yet."],
    ["relation-chain", [], "Can't mix equations and inequalities in a chain."],
    ["relation-side", [">"], "'>' needs something on both sides."],
    ["too-many-nodes", [], "This row is too long. Split it up."],
    ["too-deep", [], "This row is nested too deeply."],
    ["too-many-params", [], "Functions can have at most 8 inputs."],
    ["duplicate-definition", ["a"], "a is defined more than once."],
    ["duplicate-definition", ["θ_1"], "θ_1 is defined more than once."],
    ["cycle", ["a", "b"], "a and b are defined using each other."],
    ["cycle", ["a", "b", "c"], "a, b and c are defined using each other."],
    ["function-cycle", ["f"], "f depends on itself."],
    ["recursive-cycle", ["f"], "f depends on itself. Add a base case."],
    ["function-cycle", ["g", "f"], "Functions g and f depend on each other."],
    ["recursive-cycle", ["g", "f"], "Functions g and f depend on each other. Add a base case."],
    ["implicit-variables", [], "Implicit equations can use only x and y."],
    ["equation-required", ["x="], "Add x= at the start."],
    ["equation-required", [], "Add an equals sign to make an equation."],
    ["reserved-name", ["e"], "e is built in and can't be redefined."],
    ["arity", ["g", "2", "1"], "g needs 2 inputs, like g(1, 2)."],
    ["arity", ["f", "1", "2"], "f takes only 1 input, like f(x)."],
    ["arity", ["sin", "1", "2"], "sin takes only 1 input, like sin(x)."],
    ["arity", ["arctan", "1 or 2", "3"], "arctan needs 2 inputs, like arctan(1, 2)."],
    ["arity", ["nCr", "2", "1"], "nCr needs 2 inputs, like nCr(1, 2)."],
    ["point-coordinates", [], "Too many unknown variables."],
    ["mixed-variables", [], "Add an equals sign to make an equation."],
    ["polar-variable", ["r"], "r only works in polar equations."],
    ["timeout", [], "This took too long. Try a smaller range."],
  ];
  for (const [code, names, text] of table) expect(rowErrorMessage(code, names)).toBe(text);
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

it("PR-30, NM-37 a half-typed regression and a comprehension of a number have Desmos's copy", () => {
  const table: [RowErrorCode, string[], string][] = [
    ["sim-side", ["∼"], "'∼' needs something on both sides."],
    ["for-list", ["n", "1"], "After 'for', n must be a list, like n=[1]."],
  ];
  for (const [code, names, text] of table) expect(rowErrorMessage(code, names)).toBe(text);
  const rows = ["[n^{2}\\operatorname{for}n=1]", "y_{1}\\sim"].map((latex, k) => ({
    id: `r${k}`,
    latex,
    hidden: false,
  }));
  expect(analyzeRows(rows, REAL).rows.map((r) => r.error?.message)).toEqual([
    "After 'for', n must be a list, like n=[1].",
    "'∼' needs something on both sides.",
  ]);
});

it("NM-34, NM-35, NM-36, NM-32 list errors use their exact copy", () => {
  const table: [RowErrorCode, string[], string][] = [
    ["nested-list", [], "A list can't hold lists."],
    ["list-too-long", [], "A list can hold at most 10,000 items."],
    ["range-step", [], "A range must go up in equal steps."],
    ["list-mixed", [], "A list's items must all be the same type."],
  ];
  for (const [code, names, text] of table) expect(rowErrorMessage(code, names)).toBe(text);
});

it("R-6, EL-35 undefined names read as the reference's Too many variables warning", () => {
  const table: [RowErrorCode, string[], string][] = [
    ["too-many-variables", ["k"], "k is not defined."],
    ["too-many-variables", ["m", "b"], "m and b are not defined."],
    ["too-many-variables", ["a", "b", "c"], "a, b and c are not defined."],
    ["too-many-variables", [], "Too many unknown variables."],
  ];
  for (const [code, names, text] of table) expect(rowErrorMessage(code, names)).toBe(text);
});

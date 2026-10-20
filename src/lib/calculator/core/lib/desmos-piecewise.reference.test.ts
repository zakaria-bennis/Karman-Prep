// PR-31, PR-32, NM-41: every live Desmos value and error text the function catalogue captured for
// piecewise braces and restrictions (desmos-piecewise.fixture.json, copied from its
// ALL.values.json), plus the piecewise rows of the plan's capture that Desmos graphs. A key's rows
// are separated by " ;; " or " ⟹ ", the last one being the case; " [degrees]" marks degree mode.
// Not yet matched, each an expected failure that fails once matched, by the notation they use that
// has not shipped: derivatives and integrals, the stored +∞ behind `invNorm(1)`'s undefined (NM-6
// keeps one undefined state), recursion with a piecewise base case, `and` and `or`, `\sum` and
// `polygon`.
import { expect, it } from "vitest";
import captured from "../../../../../docs/superpowers/plans/2026-10-19-calculator-phase2-desmos/desmos-reference-values.json";
import { analyzeRows } from "../analysis";
import { evaluateLatex, type EvalSettings } from "../eval/compile";
import type { Value } from "../eval/values";
import piecewise from "./desmos-piecewise.fixture.json";
import { withinTolerance } from "./tolerance";

type Captured = number | number[] | null | string;

const GAPS: readonly RegExp[] = [
  /\\frac\{d\}|\\int/,
  /invNorm/,
  /^p\\left\(n\\right\)=/,
  /\\operatorname\{(and|or)\}/,
  /\\sum|polygon/,
];
const isGap = (key: string) => GAPS.some((gap) => gap.test(key));
const GRAPHED = "graphable (no numeric value)";

function caseOf(key: string): { latex: string; rows: string[]; settings: Partial<EvalSettings> } {
  const degrees = key.endsWith(" [degrees]");
  const parts = (degrees ? key.slice(0, -" [degrees]".length) : key).split(/ ;; | ⟹ /);
  return {
    latex: parts[parts.length - 1],
    rows: parts.slice(0, -1),
    settings: degrees ? { angleMode: "degrees" } : {},
  };
}

function lastRow(rows: readonly string[], latex: string) {
  const all = [...rows, latex].map((row, i) => ({ id: `row-${i}`, latex: row, hidden: false }));
  return analyzeRows(all, { angleMode: "radians", complex: false }).rows[rows.length];
}

function matches(v: Value, expected: number | null): boolean {
  if (expected === null) return v.type === "undefined";
  if (v.type !== "number") return false;
  return Number.isInteger(expected)
    ? v.value === expected
    : withinTolerance(v.value, expected, "default");
}

function sameValue(v: Value, expected: number | number[] | null): boolean {
  if (!Array.isArray(expected)) return matches(v, expected);
  return (
    v.type === "list" &&
    v.value.length === expected.length &&
    expected.every((e, i) => matches(v.value[i], e))
  );
}

const VALUES = Object.entries(piecewise.values) as [string, Captured][];
const ERRORS = Object.entries(piecewise.errors);

it("PR-31 PR-32 all 33 catalogue piecewise values are checked, 24 matched", () =>
  expect([VALUES.length, VALUES.filter(([key]) => !isGap(key)).length]).toEqual([33, 24]));

for (const [key, expected] of VALUES) {
  const check = () => {
    const { latex, rows, settings } = caseOf(key);
    const row = lastRow(rows, latex);
    expect(row.error).toBe(null);
    // a curve row (`y=x\{x>0\}`) graphs; its value is undefined, as Desmos's evaluation is
    if (expected === GRAPHED || latex.startsWith("y=")) expect(row.isGraphable).toBe(true);
    if (expected === GRAPHED) return;
    const v = evaluateLatex(latex, { rows, settings });
    expect(sameValue(v, expected as number | number[] | null), JSON.stringify(v)).toBe(true);
  };
  const shown = JSON.stringify(expected);
  if (isGap(key)) it.fails(`not yet matched: ${key} is ${shown} in Desmos`, check);
  else it(`PR-31 PR-32 ${key} is ${shown}, as in Desmos`, check);
}

it("PR-31 all 9 catalogue piecewise error messages are checked, 6 matched", () =>
  expect([ERRORS.length, ERRORS.filter(([key]) => !isGap(key)).length]).toEqual([9, 6]));

for (const [key, message] of ERRORS) {
  const check = () => {
    const { latex, rows } = caseOf(key);
    expect(lastRow(rows, latex).error?.message).toBe(message);
  };
  if (isGap(key)) it.fails(`not yet matched: ${key} reads "${message}" in Desmos`, check);
  else it(`PR-31 ${key} reads "${message}", as in Desmos`, check);
}

// G-2: the plan capture's piecewise rows that Desmos graphs, a restricted line and a step.
const GRAPHABLE = captured.graphable.filter((latex) => latex.includes("\\left\\{"));

it("G-2 both captured piecewise rows that Desmos graphs are checked", () =>
  expect(GRAPHABLE).toEqual(["y=x\\left\\{0<x<2\\right\\}", "\\left\\{x<0:-1,x>0:1\\right\\}"]));

for (const latex of GRAPHABLE) {
  it(`G-2 ${latex} graphs as a curve, as in Desmos`, () => {
    const row = lastRow([], latex);
    expect([row.kind, row.error, row.isGraphable]).toEqual(["curve-y", null, true]);
  });
}

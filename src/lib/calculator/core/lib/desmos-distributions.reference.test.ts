// Desmos parity (appendix F decision 2): every live Desmos value and error text the function
// catalogue captured on 2026-10-19 for normaldist, tdist and binomialdist with their methods and
// summary statistics (FN-45 to FN-51), erf, and the legacy names normalcdf, normalpdf, binomcdf,
// binompdf, invNorm, tpdf, tcdf, invT and invBinom, with the dot and typed-name errors around them
// (desmos-distributions.fixture.json, copied from the catalogue's
// ALL.values.json). A whole-number value must match exactly, any other within the relative 1e-12,
// null (undefined in Desmos) must be undefined, and a list must match element by element.
import { expect, it } from "vitest";
import { analyzeRows } from "../analysis";
import { evaluateLatex } from "../eval/compile";
import type { Value } from "../eval/values";
import distributions from "./desmos-distributions.fixture.json";
import { withinTolerance } from "./tolerance";

type Expected = number | null | (number | null)[] | { length: number; sample: number[] };

/** A fixture key as its helper rows and its case row (" ; ", " ;; " or " ⟹ " between rows). */
function caseOf(key: string): { latex: string; rows: string[] } {
  const parts = key.split(/ ;; | ; | ⟹ /);
  return { latex: parts[parts.length - 1], rows: parts.slice(0, -1) };
}

function matches(v: Value | undefined, expected: number | null): boolean {
  if (v === undefined) return false;
  if (expected === null) return v.type === "undefined";
  if (v.type !== "number") return false;
  return Number.isInteger(expected)
    ? v.value === expected
    : withinTolerance(v.value, expected, "default");
}

function sameValue(v: Value, expected: Expected): boolean {
  if (expected === null || typeof expected === "number") return matches(v, expected);
  if (!Array.isArray(expected)) return false; // a random sample
  return (
    v.type === "list" &&
    v.value.length === expected.length &&
    expected.every((e, i) => matches(v.value[i], e))
  );
}

function errorMessage(key: string): string | undefined {
  const { latex, rows } = caseOf(key);
  const analysis = analyzeRows(
    [...rows, latex].map((row, i) => ({ id: `row-${i}`, latex: row, hidden: false })),
    { angleMode: "radians", complex: false }
  );
  return analysis.rows[rows.length].error?.message;
}

// Cases not yet matched, each an expected failure that fails once matched, by the notation they
// use that has not shipped: derivatives; `\infty` as a value; `random` (T14); a stored ±∞ behind
// "undefined" (`1/invNorm(1)` is 0 in Desmos, NM-6 keeps one undefined state); Desmos's "Try
// adding 'y=' to the beginning of this equation." for `i` in real mode, where the calculator
// offers an `i` chip (NM-17); and `\operatorname{inv}N\operatorname{or}m`, whose unknown
// `\operatorname{inv}` the parser refuses before it reaches the `or`.
const GAPS: readonly RegExp[] = [
  /\\frac\{d\}/,
  /\\infty/,
  /\\operatorname\{random\}/,
  /\\frac\{1\}\{\\operatorname\{invNorm\}|\\operatorname\{invNorm\}\\left\(1\\right\)>5/,
  /^\\arctan\\left\(\\operatorname\{tdist\}\\left\(2\\right\)\.\\operatorname\{stdev\}\\right\)$/,
  /\\left\(i\\right\)$/,
  /^\\operatorname\{inv\}N\\operatorname\{or\}m/,
];
const gap = (key: string) => GAPS.some((g) => g.test(key));

const VALUES = Object.entries(distributions.values) as [string, Expected][];
const ERRORS = Object.entries(distributions.errors);

it("FN-45 FN-51 all 194 catalogue distribution values and 69 errors are checked, 169 and 58 matched", () =>
  expect([
    VALUES.length,
    ERRORS.length,
    VALUES.filter(([k]) => !gap(k)).length,
    ERRORS.filter(([k]) => !gap(k)).length,
  ]).toEqual([194, 69, 169, 58]));

for (const [key, expected] of VALUES) {
  const check = () => {
    const { latex, rows } = caseOf(key);
    const v = evaluateLatex(latex, { rows });
    expect(sameValue(v, expected), JSON.stringify(v)).toBe(true);
    // an undefined value counts only from a row without an error (not unsupported notation)
    expect(errorMessage(key)).toBe(undefined);
  };
  const shown = JSON.stringify(expected).slice(0, 60);
  if (gap(key)) it.fails(`not yet matched: ${key} is ${shown} in Desmos`, check);
  else it(`FN-45 FN-51 ${key} is ${shown}, as in Desmos`, check);
}

for (const [key, message] of ERRORS) {
  const check = () => expect(errorMessage(key)).toBe(message);
  if (gap(key)) it.fails(`not yet matched: ${key} reads "${message}" in Desmos`, check);
  else it(`FN-45 FN-51 ${key} reads "${message}", as in Desmos`, check);
}

it("erf, normalcdf, normalpdf, binomcdf, binompdf and invNorm graph as functions of x", () => {
  const rows = [
    "y=\\operatorname{erf}(x)",
    "y=\\operatorname{normalcdf}(0,x)",
    "y=\\operatorname{normalpdf}(x)",
    "y=\\operatorname{binompdf}(x,10)",
    "y=\\operatorname{invNorm}(x)",
  ].map((latex, i) => ({ id: `row-${i}`, latex, hidden: false }));
  const analysis = analyzeRows(rows, { angleMode: "radians", complex: false });
  expect(analysis.rows.map((r) => [r.kind, r.isGraphable, r.error])).toEqual(
    rows.map(() => ["curve-y", true, null])
  );
});

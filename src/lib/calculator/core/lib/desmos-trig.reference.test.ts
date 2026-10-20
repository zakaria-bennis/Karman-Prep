// Desmos parity (appendix F decision 2): every live Desmos value and error text the function
// catalogue captured on 2026-10-19 for circular trig, inverse trig and exp, and every user-defined
// function arity error (desmos-trig.fixture.json, copied from the catalogue's ALL.values.json).
// A whole-number value must match exactly, any other within the relative 1e-12, null (undefined in
// Desmos) must be undefined, a list element by element, and a complex value [re, im] by parts.
import { expect, it } from "vitest";
import { analyzeRows } from "../analysis";
import { evaluateLatex, type EvalSettings } from "../eval/compile";
import type { Value } from "../eval/values";
import hyperbolic from "./desmos-hyperbolic.fixture.json";
import trig from "./desmos-trig.fixture.json";
import { withinTolerance } from "./tolerance";

type Expected = number | null | (number | null)[];

interface Case {
  latex: string;
  rows: string[];
  settings: EvalSettings;
}

/** A fixture key as its rows and settings: "[deg] ", "[complex] " and the degree suffixes. */
function caseOf(key: string): Case {
  const [, mode = "", rest = key] = /^(?:\[(deg|degree|complex|complex\+deg)\] )?(.*)$/.exec(key)!;
  const suffix = / (@degrees|\[degrees\])$/.exec(rest);
  const body = suffix === null ? rest : rest.slice(0, suffix.index);
  const parts = body.split(/ ;; | ; | ⟹ /);
  const degrees = suffix !== null || mode === "deg" || mode === "degree" || mode === "complex+deg";
  return {
    latex: parts[parts.length - 1],
    rows: parts.slice(0, -1),
    settings: {
      angleMode: degrees ? "degrees" : "radians",
      complex: mode.startsWith("complex"),
    },
  };
}

function matches(v: Value | undefined, expected: number | null): boolean {
  if (v === undefined) return false;
  if (expected === null) return v.type === "undefined";
  if (v.type !== "number") return false;
  return Number.isInteger(expected)
    ? v.value === expected
    : withinTolerance(v.value, expected, "default");
}

function sameValue(v: Value, expected: Expected, complex: boolean): boolean {
  if (!Array.isArray(expected)) return matches(v, expected);
  if (complex && v.type !== "list") {
    const [re, im] = expected;
    if (im === 0) return matches(v, re);
    if (v.type !== "complex" || re === null || im === null) return v.type === "undefined";
    return withinTolerance(v.value.re, re, "default") && withinTolerance(v.value.im, im, "default");
  }
  return (
    v.type === "list" &&
    v.value.length === expected.length &&
    expected.every((e, i) => matches(v.value[i], e))
  );
}

function errorMessage({ latex, rows, settings }: Case): string | undefined {
  const analysis = analyzeRows(
    [...rows, latex].map((row, i) => ({ id: `row-${i}`, latex: row, hidden: false })),
    settings
  );
  return analysis.rows[rows.length].error?.message;
}

// Cases not yet matched, each an expected failure that fails once matched: derivatives, integrals,
// sums and products; `\infty` as a value; the degree sign, which Desmos does not have (it reads
// `\circ` and `\degree` as variables; PR-8 keeps it); complex mode ignoring the degree setting
// for a real argument; Desmos's branch signs for arcsin, arccos, arccsc and arcsec on the real
// axis outside their domain; and `\sin\cos(0)`, which Desmos asks to write with parentheses
// (PR-24 reads it as sin(cos 0)).
const GAPS: readonly RegExp[] = [
  /\\frac\{d\}|'/,
  /\\int|\\sum|\\prod/,
  /\\infty/,
  /\\circ|\\degree/,
  /^\[complex\+deg\] \\[a-z]+\([0-9.,]+\)$/,
  /^\[complex\] \\arc(sin|cos)\(2\)$|^\[complex\] \\arc(csc|sec)\(0\.5\)$/,
  /^\\sin\\cos\(0\)$/,
];
const gap = (key: string) => GAPS.some((g) => g.test(key));

const VALUES = Object.entries(trig.values) as [string, Expected][];
const ERRORS = Object.entries(trig.errors);

it("FN-18 FN-20 all 390 catalogue trig and exp values are checked", () =>
  expect(VALUES.length).toBe(390));

for (const [key, expected] of VALUES) {
  const check = () => {
    const c = caseOf(key);
    const v = evaluateLatex(c.latex, { rows: c.rows, settings: c.settings });
    expect(sameValue(v, expected, c.settings.complex), JSON.stringify(v)).toBe(true);
    expect(errorMessage(c)).toBe(undefined);
  };
  const shown = JSON.stringify(expected).slice(0, 60);
  if (gap(key)) it.fails(`not yet matched: ${key} is ${shown} in Desmos`, check);
  else it(`FN-18 FN-20 ${key} is ${shown}, as in Desmos`, check);
}

it("RC-20 PR-26 all 63 catalogue trig, exp and user-function error texts are checked", () =>
  expect(ERRORS.length).toBe(63));

for (const [key, message] of ERRORS) {
  const check = () => expect(errorMessage(caseOf(key))).toBe(message);
  if (gap(key)) it.fails(`not yet matched: ${key} reads "${message}" in Desmos`, check);
  else it(`RC-20 PR-26 ${key} reads "${message}", as in Desmos`, check);
}

// NM-4, NM-26, NM-28: Desmos is exact only at quarter turns, so each real trig and inverse trig
// value of a number is the captured double exactly, last digit included (`\tan(\frac{\pi}{4})` is
// 0.9999999999999999), not merely within the tolerance.
const EXACT = VALUES.filter(
  ([key]) =>
    /^(\[deg\] )?\\(arc)?(sin|cos|tan|csc|sec|cot)(\^\{-1\})?\([^()]*\)$/.test(key) && !gap(key)
);

it("NM-4 NM-26 NM-28 all 217 real trig values of numbers are checked exactly", () =>
  expect(EXACT.length).toBe(217));

for (const [key, expected] of EXACT) {
  it(`NM-4 NM-26 NM-28 ${key} is exactly ${JSON.stringify(expected)}`, () => {
    const c = caseOf(key);
    const v = evaluateLatex(c.latex, { rows: c.rows, settings: c.settings });
    const got = v.type === "list" ? v.value.map(exactOf) : exactOf(v);
    expect(got).toEqual(expected);
  });
}

// FN-68: every live Desmos value and error text the catalogue captured for the hyperbolic
// functions and their inverses (desmos-hyperbolic.fixture.json), checked as the trig cases. Not
// yet matched, each an expected failure that fails once matched: derivatives, the `ar`-spelled
// inverse names (`\operatorname{arsinh}`) and the hidden complexArc… names, none shipped.
const HYPERBOLIC_GAPS: readonly RegExp[] = [
  /\\frac\{d\}/,
  /\\operatorname\{ar(sinh|cosh|tanh|csch|sech|coth)\}/,
  /complexArc/,
];
const hyperbolicGap = (key: string) => HYPERBOLIC_GAPS.some((g) => g.test(key));
const HYPERBOLIC_VALUES = Object.entries(hyperbolic.values) as [string, Expected][];
const HYPERBOLIC_ERRORS = Object.entries(hyperbolic.errors);

it("FN-68 all 211 catalogue hyperbolic values and 19 errors are checked", () =>
  expect([HYPERBOLIC_VALUES.length, HYPERBOLIC_ERRORS.length]).toEqual([211, 19]));

for (const [key, expected] of HYPERBOLIC_VALUES) {
  const check = () => {
    const c = caseOf(key);
    const v = evaluateLatex(c.latex, { rows: c.rows, settings: c.settings });
    expect(sameValue(v, expected, c.settings.complex), JSON.stringify(v)).toBe(true);
    expect(errorMessage(c)).toBe(undefined);
  };
  const shown = JSON.stringify(expected).slice(0, 60);
  if (hyperbolicGap(key)) it.fails(`not yet matched: ${key} is ${shown} in Desmos`, check);
  else it(`FN-68 ${key} is ${shown}, as in Desmos`, check);
}

for (const [key, message] of HYPERBOLIC_ERRORS) {
  it(`RC-20 FN-68 ${key} reads "${message}", as in Desmos`, () =>
    expect(errorMessage(caseOf(key))).toBe(message));
}

function exactOf(v: Value): number | null {
  return v.type === "number" ? v.value : v.type === "undefined" ? null : NaN;
}

// Desmos parity (appendix F decision 2): every value captured from desmos.com/calculator on
// 2026-10-19 for a built-in or list notation the calculator has shipped, evaluated by its engine. A
// whole-number value must match exactly, any other within FN-the relative 1e-12, null (undefined
// in Desmos) must be undefined, and a list must match element by element. Each family states how
// many captured values it covers, so none is skipped silently.
import { expect, it } from "vitest";
import captured from "../../../../../docs/superpowers/plans/2026-10-19-calculator-phase2-desmos/desmos-reference-values.json";
import { analyzeRows } from "../analysis";
import { evaluateLatex, type EvalSettings } from "../eval/compile";
import type { Value } from "../eval/values";
import catalogue from "./desmos-catalogue.fixture.json";
import { withinTolerance } from "./tolerance";

type Captured = number | number[] | null;
const VALUES: [string, Captured][] = Object.entries(captured.values);

const FAMILIES: { rules: string; pattern: RegExp; count: number }[] = [
  {
    rules: "FN-76 FN-77 FN-78",
    pattern: /^\\operatorname\{(floor|ceil|round|sign|mod|nCr|nPr)\}\(/,
    count: 62,
  },
  { rules: "NM-15 FN-79", pattern: /!$/, count: 13 },
  // PR-26: `^{-1}` on an inverse hyperbolic name is the forward function, as in Desmos.
  { rules: "PR-26 FN-68", pattern: /^\\operatorname\{arc[a-z]+\}\^\{-1\}\(/, count: 3 },
  // PR-34, NM-32, NM-36: list literals, ranges and element-by-element arithmetic, without
  // indexing (L[…]) or list functions, which have not shipped.
  { rules: "PR-34 NM-32 NM-36", pattern: /^(\[[^\]]*\]([+^\\]|$)|\\sin\(\[)/, count: 17 },
];

function matches(v: Value, expected: number | null): boolean {
  if (expected === null) return v.type === "undefined";
  if (v.type !== "number") return false;
  return Number.isInteger(expected)
    ? v.value === expected
    : withinTolerance(v.value, expected, "default");
}

for (const { rules, pattern, count } of FAMILIES) {
  const cases = VALUES.filter(([latex]) => pattern.test(latex));
  it(`${rules} all ${count} captured Desmos values are checked`, () =>
    expect(cases.length).toBe(count));
  for (const [latex, expected] of cases) {
    it(`${rules} ${latex} is ${JSON.stringify(expected)}, as in Desmos`, () => {
      const v = evaluateLatex(latex);
      if (Array.isArray(expected)) {
        expect(v.type, JSON.stringify(v)).toBe("list");
        const items = v.type === "list" ? v.value : [];
        expect(items.length, JSON.stringify(v)).toBe(expected.length);
        expected.forEach((e, i) => expect(matches(items[i], e), JSON.stringify(v)).toBe(true));
      } else {
        expect(matches(v, expected), JSON.stringify(v)).toBe(true);
      }
    });
  }
}

// Every captured Desmos error message, built-in arity (RC-20), "is a function" (PR-24), list
// (NM-34, NM-35, PR-34) and the rest, is checked, either as the calculator's message or, for the gaps listed
// under "Not yet matched" in f-desmos-parity.md, as an expected failure that fails once matched.
const ERROR_GAP: ReadonlySet<string> = new Set([
  // Piecewise braces (PR-31) have not shipped; the calculator reads this as unsupported notation.
  "\\left\\{1<0:5,\\right\\}",
]);
const ERRORS = Object.entries(captured.errors);
const { _rows: DEFINITIONS, ...USER_ERRORS } = captured.errorsWithDefinitions;

function errorMessage(rows: readonly string[], latex: string): string | undefined {
  const analysis = analyzeRows(
    [...rows, latex].map((row, i) => ({ id: `row-${i}`, latex: row, hidden: false })),
    { angleMode: "radians", complex: false }
  );
  return analysis.rows[rows.length].error?.message;
}

it("RC-20 PR-24 PR-34 all 41 captured Desmos error messages are checked", () => {
  expect(ERRORS.length).toBe(41);
});

for (const [latex, message] of ERRORS) {
  const check = () => expect(errorMessage([], latex)).toBe(message);
  if (ERROR_GAP.has(latex))
    it.fails(`not yet matched: ${latex} reads "${message}" in Desmos`, check);
  else it(`RC-20 PR-24 PR-34 ${latex} reads "${message}", as in Desmos`, check);
}

it("RC-20 all 4 captured user-function arity messages are checked", () =>
  expect(Object.keys(USER_ERRORS).length).toBe(4));

for (const [latex, message] of Object.entries(USER_ERRORS)) {
  it(`RC-20 with ${DEFINITIONS.join(" and ")}, ${latex} reads "${message}", as in Desmos`, () =>
    expect(errorMessage(DEFINITIONS, latex)).toBe(message));
}

// The function catalogue's live Desmos values (desmos-catalogue.fixture.json, copied from the
// catalogue's ALL.values.json) for every built-in and notation the calculator ships and its
// Phase 2 tasks have touched: ranges (NM-36), log and ln (FN-60, PR-26, PR-27). A "[deg] " key is
// evaluated in degree mode and a "[complex] " key in complex mode, where a value is [re, im].
type CatalogueValue = Captured | number[][] | { length: number; first: number[]; last: number };
const CATALOGUE_VALUES = Object.entries(catalogue.values) as [string, CatalogueValue][];
const CATALOGUE_ROWS = ["L=[3,1,4,1,5,9,2,6]"]; // the catalogue's statistics-lists definitions

function catalogueCase(key: string): { latex: string; settings: Partial<EvalSettings> } {
  const [, mode = "", latex = key] = /^(?:\[(deg|complex)\] )?(.*)$/.exec(key) ?? [];
  if (mode === "deg") return { latex, settings: { angleMode: "degrees" } };
  return { latex, settings: { complex: mode === "complex" } };
}

function sameValue(v: Value, expected: CatalogueValue, complex: boolean): boolean {
  if (expected === null || typeof expected === "number") return matches(v, expected);
  if (complex && Array.isArray(expected) && !Array.isArray(expected[0])) {
    const [re, im] = expected as number[];
    if (im === 0) return matches(v, re);
    return (
      v.type === "complex" &&
      withinTolerance(v.value.re, re, "default") &&
      withinTolerance(v.value.im, im, "default")
    );
  }
  if (v.type !== "list") return false;
  if (!Array.isArray(expected)) {
    const { length, first, last } = expected;
    return (
      v.value.length === length &&
      matches(v.value[length - 1], last) &&
      first.every((e, i) => matches(v.value[i], e))
    );
  }
  return (
    v.value.length === expected.length &&
    expected.every((e, i) => {
      const item = v.value[i];
      if (!Array.isArray(e)) return matches(item, e);
      return item.type === "point" && item.value.every((c, k) => c === e[k]);
    })
  );
}

// Catalogue values not yet matched, each an expected failure that fails once matched: `\infty`
// is not a value yet (the calculator reads it as undefined), so an infinite base is too.
const CATALOGUE_VALUE_GAP: ReadonlySet<string> = new Set(["\\log_{\\infty}(5)"]);

it("NM-36 FN-60 all 90 catalogue values for ranges, log and ln are checked", () =>
  expect(CATALOGUE_VALUES.length).toBe(90));

for (const [key, expected] of CATALOGUE_VALUES) {
  const check = () => {
    const { latex, settings } = catalogueCase(key);
    const v = evaluateLatex(latex, { settings });
    expect(sameValue(v, expected, settings.complex === true), JSON.stringify(v)).toBe(true);
  };
  const shown = JSON.stringify(expected).slice(0, 60);
  if (CATALOGUE_VALUE_GAP.has(key))
    it.fails(`not yet matched: ${key} is ${shown} in Desmos`, check);
  else it(`NM-36 FN-60 ${key} is ${shown}, as in Desmos`, check);
}

// NM-36: Desmos folds a range of constants in exact fractions, so a range's elements are the
// captured doubles exactly, not merely within the tolerance (`[0,0.1,...,1]` holds 0.3).
const RANGE_VALUES = CATALOGUE_VALUES.filter(
  ([key, expected]) =>
    /^(\\left)?\[[^\]]*(\.\.\.|\\ldots)/.test(key) &&
    Array.isArray(expected) &&
    expected.every((e) => typeof e === "number")
);

it("NM-36 all 27 catalogue range values are checked exactly", () =>
  expect(RANGE_VALUES.length).toBe(27));

for (const [latex, expected] of RANGE_VALUES) {
  it(`NM-36 ${latex} holds exactly the captured elements`, () => {
    const v = evaluateLatex(latex);
    expect(
      v.type === "list" ? v.value.map((item) => item.type === "number" && item.value) : v
    ).toEqual(expected);
  });
}

// Catalogue errors not yet matched, each an expected failure that fails once matched: an
// ellipsis outside a list (the calculator reads a syntax error), a range whose length depends
// on x (G-22's list-valued graphs, task T11) and a built-in applied to a point (task M4's point
// arithmetic).
const CATALOGUE_ERROR_GAP: ReadonlySet<string> = new Set(["1...5", "[x...5]", "\\ln((1,2))"]);
const CATALOGUE_ERRORS = Object.entries(catalogue.errors);

it("NM-36 RC-20 all 31 catalogue error messages for ranges, log and ln are checked", () =>
  expect(CATALOGUE_ERRORS.length).toBe(31));

for (const [latex, message] of CATALOGUE_ERRORS) {
  const check = () => expect(errorMessage(CATALOGUE_ROWS, latex)).toBe(message);
  if (CATALOGUE_ERROR_GAP.has(latex))
    it.fails(`not yet matched: ${latex} reads "${message}" in Desmos`, check);
  else it(`NM-36 RC-20 ${latex} reads "${message}", as in Desmos`, check);
}

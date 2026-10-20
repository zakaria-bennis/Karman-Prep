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
import indexing from "./desmos-index.fixture.json";
import roots from "./desmos-root.fixture.json";
import statistics from "./desmos-statistics.fixture.json";
import { withinTolerance } from "./tolerance";

type Captured = number | number[] | null;
const VALUES: [string, Captured][] = Object.entries(captured.values);

const FAMILIES: { rules: string; pattern: RegExp; count: number; rows?: string[] }[] = [
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
  // NM-30, NM-31: indexing and slicing after the capture's context row.
  { rules: "NM-30 NM-31", pattern: /^(L\[|\[[^\]]*\]\[)/, count: 14, rows: ["L=[5,3,8,1]"] },
  // FN-2, FN-23 to FN-29, FN-75: statistics, length, gcd and lcm after the capture's context row.
  {
    rules: "FN-2 FN-23 FN-29 FN-75",
    pattern:
      /^\\(operatorname\{(length|total|mean|median|min|max|count|stdev|stdevp|var|mad|quantile|quartile|gcd|lcm)\}|min|max)\(/,
    count: 38,
    rows: ["L=[5,3,8,1]"],
  },
];

function matches(v: Value, expected: number | null): boolean {
  if (expected === null) return v.type === "undefined";
  if (v.type !== "number") return false;
  return Number.isInteger(expected)
    ? v.value === expected
    : withinTolerance(v.value, expected, "default");
}

for (const { rules, pattern, count, rows } of FAMILIES) {
  const cases = VALUES.filter(([latex]) => pattern.test(latex));
  it(`${rules} all ${count} captured Desmos values are checked`, () =>
    expect(cases.length).toBe(count));
  for (const [latex, expected] of cases) {
    it(`${rules} ${latex} is ${JSON.stringify(expected)}, as in Desmos`, () => {
      const v = evaluateLatex(latex, { rows });
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

function errorMessage(rows: readonly string[], latex: string, complex = false): string | undefined {
  const analysis = analyzeRows(
    [...rows, latex].map((row, i) => ({ id: `row-${i}`, latex: row, hidden: false })),
    { angleMode: "radians", complex }
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
  const [, mode = "", latex = key, suffix] =
    /^(?:\[(deg|complex)\] )?(.*?)( @degrees)?$/.exec(key) ?? [];
  if (mode === "deg" || suffix !== undefined) return { latex, settings: { angleMode: "degrees" } };
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
// ellipsis outside a list (the calculator reads a syntax error) and a built-in applied to a
// point (task M4's point arithmetic).
const CATALOGUE_ERROR_GAP: ReadonlySet<string> = new Set(["1...5", "\\ln((1,2))"]);
const CATALOGUE_ERRORS = Object.entries(catalogue.errors);

it("NM-36 RC-20 all 31 catalogue error messages for ranges, log and ln are checked", () =>
  expect(CATALOGUE_ERRORS.length).toBe(31));

for (const [latex, message] of CATALOGUE_ERRORS) {
  const check = () => expect(errorMessage(CATALOGUE_ROWS, latex)).toBe(message);
  if (CATALOGUE_ERROR_GAP.has(latex))
    it.fails(`not yet matched: ${latex} reads "${message}" in Desmos`, check);
  else it(`NM-36 RC-20 ${latex} reads "${message}", as in Desmos`, check);
}

// NM-30, NM-31: the catalogue's live Desmos values for indexing, slicing and filtering
// (desmos-index.fixture.json), after its definition rows; a "[defs: R] " key uses the row R
// instead. A point is [x, y].
const INDEX_ROWS = indexing._rows;
const INDEX_VALUES = Object.entries(indexing.values) as [string, Captured][];

function indexCase(key: string): { latex: string; rows: string[] } {
  const defs = /^\[defs: (.*?)\] (.*)$/.exec(key);
  return defs === null ? { latex: key, rows: INDEX_ROWS } : { latex: defs[2], rows: [defs[1]] };
}

function sameIndexValue(v: Value, expected: Captured): boolean {
  if (!Array.isArray(expected)) return matches(v, expected);
  if (v.type === "point") return v.value.every((c, k) => c === expected[k]);
  return (
    v.type === "list" &&
    v.value.length === expected.length &&
    expected.every((e, i) => matches(v.value[i], e))
  );
}

// Index values not yet matched, each an expected failure that fails once matched: member access
// `.x` (PR-9), `and`, `or`, piecewise braces (T10) and comprehensions (NM-37) have not shipped.
const INDEX_VALUE_GAP: ReadonlySet<string> = new Set([
  "[defs: L=\\left[(1,2),(3,4)\\right]] L[2].x",
  "L[L>3 \\operatorname{and} L<9]",
  "[L[i] \\operatorname{for} i=[1...3]]",
  "P[2].x",
  "P[P.x>2].x",
  "[i^2 \\operatorname{for} i=[1...3]][2]",
  "L[(L>3) \\operatorname{or} (L<2)]",
  "L[\\{L>3\\}]",
]);

it("NM-30 NM-31 all 57 catalogue values for indexing, slicing and filtering are checked", () =>
  expect(INDEX_VALUES.length).toBe(57));

for (const [key, expected] of INDEX_VALUES) {
  const check = () => {
    const { latex, rows } = indexCase(key);
    const v = evaluateLatex(latex, { rows });
    expect(sameIndexValue(v, expected), JSON.stringify(v)).toBe(true);
  };
  const shown = JSON.stringify(expected);
  if (INDEX_VALUE_GAP.has(key)) it.fails(`not yet matched: ${key} is ${shown} in Desmos`, check);
  else it(`NM-30 NM-31 ${key} is ${shown}, as in Desmos`, check);
}

// Index errors not yet matched, each an expected failure that fails once matched: `;` matrix
// indexing (matrices have not shipped; the tokenizer rejects `;`) and `\ne` (PR-9).
const INDEX_ERROR_GAP: ReadonlySet<string> = new Set([
  "\\left[1,2,3\\right]\\left[1;2\\right]",
  "L[L\\ne1]",
]);
const INDEX_ERRORS = Object.entries(indexing.errors);

it("NM-30 NM-31 all 8 catalogue error messages for indexing are checked", () =>
  expect(INDEX_ERRORS.length).toBe(8));

for (const [latex, message] of INDEX_ERRORS) {
  const check = () => expect(errorMessage(INDEX_ROWS, latex)).toBe(message);
  if (INDEX_ERROR_GAP.has(latex))
    it.fails(`not yet matched: ${latex} reads "${message}" in Desmos`, check);
  else it(`NM-30 NM-31 ${latex} reads "${message}", as in Desmos`, check);
}

// Rows Desmos graphs without a value: `L[x]` is a step function; `P[2]` is a point, which a name
// defined as a list of points does not graph yet (M5); `E[1...3]` shows no value and no error.
it("NM-30 all 3 catalogue rows graphed without a value are checked", () =>
  expect(Object.keys(indexing.graphed).length).toBe(3));

function indexRow(latex: string) {
  const rows = [...INDEX_ROWS, latex].map((row, i) => ({
    id: `row-${i}`,
    latex: row,
    hidden: false,
  }));
  return analyzeRows(rows, { angleMode: "radians", complex: false }).rows[INDEX_ROWS.length];
}

it("NM-30 L[x] graphs as a step function, as in Desmos", () => {
  const row = indexRow("L[x]");
  expect([row.kind, row.isGraphable, row.error]).toEqual(["curve-y", true, null]);
});

it.fails("not yet matched: P[2] graphs as a point in Desmos", () =>
  expect(indexRow("P[2]").isGraphable).toBe(true)
);

it("NM-31 E[1...3] has no error, as in Desmos", () =>
  expect(indexRow("E[1...3]").error).toBe(null));

// NM-30, PR-45: more catalogue cases for indexing and member access, each after its own rows
// (" ;; " separates them). Not yet matched, each an expected failure that fails once matched:
// member access (PR-9), colours, tones, matrices and `;` (none has shipped).
const RELATED = indexing.related;
const RELATED_VALUE_GAP: ReadonlySet<string> = new Set(Object.keys(RELATED.values));
const RELATED_ERROR_GAP: ReadonlySet<string> = new Set(Object.keys(RELATED.errors));

it("NM-30 PR-45 all 3 related values and 10 related errors are checked", () =>
  expect([Object.keys(RELATED.values).length, Object.keys(RELATED.errors).length]).toEqual([
    3, 10,
  ]));

const rowsOf = (key: string) => key.split(" ;; ");

for (const [key, expected] of Object.entries(RELATED.values) as [string, Captured][]) {
  const check = () => {
    const rows = rowsOf(key);
    const v = evaluateLatex(rows[rows.length - 1], { rows: rows.slice(0, -1) });
    expect(sameIndexValue(v, expected), JSON.stringify(v)).toBe(true);
  };
  if (RELATED_VALUE_GAP.has(key))
    it.fails(`not yet matched: ${key} is ${expected} in Desmos`, check);
  else it(`NM-30 ${key} is ${JSON.stringify(expected)}, as in Desmos`, check);
}

for (const [key, message] of Object.entries(RELATED.errors)) {
  const rows = rowsOf(key);
  const check = () => expect(errorMessage(rows.slice(0, -1), rows[rows.length - 1])).toBe(message);
  if (RELATED_ERROR_GAP.has(key))
    it.fails(`not yet matched: ${key} reads "${message}" in Desmos`, check);
  else it(`NM-30 ${key} reads "${message}", as in Desmos`, check);
}

// G9, PR-27, FN-5: every catalogue value and error for square and nth roots
// (desmos-root.fixture.json), keyed as the catalogue's. Not yet matched, each an expected failure
// that fails once matched: the name `\operatorname{sqrt}` and `real` (not shipped), a point
// argument (M4), `\sqrt{4,9}` (a point inside the braces reads as a syntax error), a bare `[`
// inside the index (normalizing drops `\left` and `\right`, so `\sqrt[[2,3]]{64}` reads as the
// `\left[` spelling, which is [8, 4] in Desmos too) and `\sqrt(4)`, which the calculator reads
// as a pasted `sqrt(4)`.
const ROOT_VALUES = Object.entries(roots.values) as [string, CatalogueValue][];
const ROOT_ERRORS = Object.entries(roots.errors);
const ROOT_VALUE_GAP: ReadonlySet<string> = new Set([
  "\\operatorname{sqrt}(4)",
  "[complex] \\operatorname{real}(\\sqrt{-4})",
  "[complex] \\operatorname{sqrt}(4)",
]);
const ROOT_ERROR_GAP: ReadonlySet<string> = new Set([
  "\\sqrt(4)",
  "\\sqrt{(1,2)}",
  "\\sqrt[[2,3]]{64}",
  "\\operatorname{sqrt}()",
  "\\operatorname{sqrt}(4,2)",
  "\\sqrt{(1,4)}",
  "\\sqrt{4,9}",
]);

it("G9 FN-5 all 55 catalogue root values and 13 root errors are checked", () =>
  expect([ROOT_VALUES.length, ROOT_ERRORS.length]).toEqual([55, 13]));

for (const [key, expected] of ROOT_VALUES) {
  const check = () => {
    const { latex, settings } = catalogueCase(key);
    const v = evaluateLatex(latex, { settings });
    expect(sameValue(v, expected, settings.complex === true), JSON.stringify(v)).toBe(true);
  };
  const shown = JSON.stringify(expected);
  if (ROOT_VALUE_GAP.has(key)) it.fails(`not yet matched: ${key} is ${shown} in Desmos`, check);
  else it(`G9 FN-5 ${key} is ${shown}, as in Desmos`, check);
}

for (const [key, message] of ROOT_ERRORS) {
  const check = () => {
    const { latex, settings } = catalogueCase(key);
    expect(errorMessage([], latex, settings.complex === true)).toBe(message);
  };
  if (ROOT_ERROR_GAP.has(key))
    it.fails(`not yet matched: ${key} reads "${message}" in Desmos`, check);
  else it(`G9 PR-27 ${key} reads "${message}", as in Desmos`, check);
}

// FN-2, FN-23 to FN-29, FN-75: every catalogue value, error and graphed row for the statistics
// reducers, length, gcd, lcm and their aliases (desmos-statistics.fixture.json), after the
// catalogue's rows L, M, E, P, S and N unless the key brings its own (" ;; ", " ; " or " ⟹ "
// between rows). A point is [x, y]; a "[complex] " value is [re, im].
function statisticsCase(key: string): { latex: string; rows: string[]; complex: boolean } {
  const { latex, settings } = catalogueCase(key);
  const parts = latex.split(/ ;; | ; | ⟹ /);
  const rows = parts.length > 1 ? parts.slice(0, -1) : statistics._rows;
  return { latex: parts[parts.length - 1], rows, complex: settings.complex === true };
}

function sameStatisticsValue(v: Value, expected: Captured, complex: boolean): boolean {
  if (Array.isArray(expected) && v.type === "point") return sameIndexValue(v, expected);
  return sameValue(v, expected, complex);
}

// Statistics cases not yet matched, each an expected failure that fails once matched, by the
// notation they use that has not shipped: derivatives, colours and tones, distributions, member
// access (`L.\operatorname{mean}`, `.x`), comprehensions and matrices, the list operations (task
// 6 and T14), `\arg` (complex mode), `\infty` as a value, and `y=` rows, which Desmos gives a
// value when the right side
// is constant (`y=\operatorname{count}(x,1,2)` = 3) and the calculator graphs as a line without one.
const STATISTICS_GAPS: readonly RegExp[] = [
  /\\frac\{d\}|'\(/,
  /\\operatorname\{(rgb|hsv|okhsv|oklab|oklch|tone)\}/,
  /dist\}/,
  /\.(\\operatorname|x$|y$)/,
  /\\operatorname\{for\}|bmatrix/,
  /\\operatorname\{(shuffle|join|random|unique|polygon|boxplot|stats)\}/,
  /\\arg/,
  /\\infty/,
  /^y=/,
];
const statisticsGap = (key: string) => STATISTICS_GAPS.some((gap) => gap.test(key));

const STATISTICS_VALUES = Object.entries(statistics.values) as [string, Captured][];

it("FN-2 FN-23 FN-29 FN-75 all 438 catalogue statistics values are checked, 309 matched", () =>
  expect([
    STATISTICS_VALUES.length,
    STATISTICS_VALUES.filter(([k]) => !statisticsGap(k)).length,
  ]).toEqual([438, 309]));

for (const [key, expected] of STATISTICS_VALUES) {
  const check = () => {
    const { latex, rows, complex } = statisticsCase(key);
    const settings = { ...catalogueCase(key).settings, complex };
    const v = evaluateLatex(latex, { rows, settings });
    expect(sameStatisticsValue(v, expected, complex), JSON.stringify(v)).toBe(true);
    // an undefined value counts only from a row without an error (not unsupported notation)
    expect(errorMessage(rows, latex, complex)).toBe(undefined);
  };
  const shown = JSON.stringify(expected).slice(0, 60);
  if (statisticsGap(key)) it.fails(`not yet matched: ${key} is ${shown} in Desmos`, check);
  else it(`FN-2 FN-23 FN-29 FN-75 ${key} is ${shown}, as in Desmos`, check);
}

const STATISTICS_ERRORS = Object.entries(statistics.errors);

it("FN-2 FN-23 FN-29 FN-75 all 75 catalogue statistics errors are checked, 60 matched", () =>
  expect([
    STATISTICS_ERRORS.length,
    STATISTICS_ERRORS.filter(([k]) => !statisticsGap(k)).length,
  ]).toEqual([75, 60]));

for (const [key, message] of STATISTICS_ERRORS) {
  const check = () => {
    const { latex, rows, complex } = statisticsCase(key);
    expect(errorMessage(rows, latex, complex)).toBe(message);
  };
  if (statisticsGap(key)) it.fails(`not yet matched: ${key} reads "${message}" in Desmos`, check);
  else it(`FN-2 FN-23 FN-29 FN-75 ${key} reads "${message}", as in Desmos`, check);
}

// Rows Desmos graphs without a value, and broadcasts over an empty list, which show no value
// because they are the empty list. Not yet matched, each an expected failure that fails once
// matched: a point-valued call (`\operatorname{total}(P)`) does not graph yet (M5).
const STATISTICS_GRAPHED = Object.entries(statistics.graphed);
const POINT_ROWS: ReadonlySet<string> = new Set([
  "\\operatorname{mean}(P)",
  "\\operatorname{total}(P)",
  "\\operatorname{mean}((1,2),(3,4))",
]);

it("FN-23 FN-27 all 38 catalogue rows without a value are checked", () =>
  expect(STATISTICS_GRAPHED.length).toBe(38));

for (const [latex, note] of STATISTICS_GRAPHED) {
  const check = () => {
    if (note.startsWith("graphed")) {
      const row = analyzeRows(
        [...statistics._rows, latex].map((l, i) => ({ id: `row-${i}`, latex: l, hidden: false })),
        { angleMode: "radians", complex: false }
      ).rows[statistics._rows.length];
      expect([row.error, row.isGraphable]).toEqual([null, true]);
    } else {
      expect(evaluateLatex(latex, { rows: statistics._rows })).toEqual({ type: "list", value: [] });
    }
  };
  if (POINT_ROWS.has(latex)) it.fails(`not yet matched: ${latex} is ${note} in Desmos`, check);
  else it(`FN-23 FN-27 ${latex} is ${note}, as in Desmos`, check);
}

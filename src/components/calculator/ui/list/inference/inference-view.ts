// FN-59: what an inference row's footer shows, from the row's value and its settings, as live
// Desmos (College Board version) lays it out (captured 2026-10-26):
// - a test (`ttest(L)`, `T=ztest(10,2,3)`) has a Confidence Interval section and a Hypothesis Test
//   section, a chi-square test an Observed (Expected) table section and a Hypothesis Test section
//   with no null value or tails (always the upper tail);
// - `T.null(h)` shows the tails and the p-value diagram only, `T.conf(c)` the interval only;
// - a stats form's arguments are named under the math ("sample size, mean, pop stdev").
// Pure TypeScript: no DOM.

import {
  defaultNull,
  expectedCounts,
  intervalResult,
  isChiSquare,
  testResult,
  usesT,
  type Inference,
  type InferenceFamily,
  type IntervalResult,
  type TestResult,
} from "@/lib/calculator/core/lib/inference";
import type { InferenceTails } from "@/lib/calculator/core/api/inference-state";

export type ScoreSymbol = "z" | "t" | "χ²";

export interface InferenceView {
  stage: Inference["stage"];
  family: InferenceFamily;
  symbol: ScoreSymbol;
  chiSquare: boolean;
  /** The null value's name, as LaTeX: `\mu`, `\mu_{1}-\mu_{2}`, `p`, `p_{1}-p_{2}`. */
  nullName: string;
  defaultNull: number;
  nullValue: number;
  level: number;
  interval: IntervalResult | null; // null for chi-square tests and null tests
  test: TestResult | null; // null for an interval
  tails: InferenceTails; // "right" for chi-square tests
  /** The p-value the diagram shows: two-sided, or one tail. */
  p: number;
}

const NULL_NAMES: Readonly<Record<InferenceFamily, string>> = {
  z1: "\\mu",
  t1: "\\mu",
  z2: "\\mu_{1}-\\mu_{2}",
  t2: "\\mu_{1}-\\mu_{2}",
  zp1: "p",
  zp2: "p_{1}-p_{2}",
  chiind: "",
  chigof: "",
};

/**
 * The footer's numbers for `inf` with the row's tails and the values its fields hold (NaN while
 * a field is blank, which keeps the default null value or 0.95).
 */
export function inferenceView(
  inf: Inference,
  tails: InferenceTails,
  hypothesis: number,
  levelField: number
): InferenceView {
  const family = inf.data.family;
  const chiSquare = isChiSquare(family);
  const nullValue =
    inf.stage === "test"
      ? (inf.nullValue ?? defaultNull(family))
      : Number.isNaN(hypothesis)
        ? defaultNull(family)
        : hypothesis;
  const level = inf.stage === "interval" ? (inf.level ?? NaN) : Number.isNaN(levelField) ? 0.95 : levelField; // prettier-ignore
  const test = inf.stage === "interval" ? null : testResult(inf.data, nullValue);
  const shownTails = chiSquare ? "right" : tails;
  const p =
    test === null
      ? NaN
      : shownTails === "left"
        ? test.pleft
        : shownTails === "right"
          ? test.pright
          : test.p;
  return {
    stage: inf.stage,
    family,
    symbol: chiSquare ? "χ²" : usesT(family) ? "t" : "z",
    chiSquare,
    nullName: NULL_NAMES[family],
    defaultNull: defaultNull(family),
    nullValue,
    level,
    interval: chiSquare || inf.stage === "test" ? null : intervalResult(inf.data, level),
    test,
    tails: shownTails,
    p,
  };
}

/** The names Desmos writes under a stats form's arguments, or null for a data form. */
export function argumentCaption(latex: string): string | null {
  const m = /\\operatorname\{(ztest|ttest|zproptest)\}\\left\((.*)\\right\)\s*$/.exec(latex);
  if (m === null) return null;
  const args = topLevelArgs(m[2]);
  if (m[1] === "zproptest") return args === 2 || args === 4 ? "successes, sample size" : null;
  if (args !== 3 && args !== 6) return null;
  return m[1] === "ztest" ? "sample size, mean, pop stdev" : "sample size, mean, stdev";
}

/** The number of top-level comma-separated arguments in `inner`. */
function topLevelArgs(inner: string): number {
  let depth = 0,
    count = 1;
  for (let i = 0; i < inner.length; i++) {
    if (inner.startsWith("\\left", i)) depth += 1;
    else if (inner.startsWith("\\right", i)) depth -= 1;
    else if (inner[i] === "{") depth += 1;
    else if (inner[i] === "}") depth -= 1;
    else if (inner[i] === "," && depth === 0) count += 1;
  }
  return count;
}

export interface ChiTable {
  rows: number; // the table's rows (a goodness of fit test's categories)
  columns: number; // 1 for a goodness of fit test
  observed: (r: number, c: number) => number;
  expected: (r: number, c: number) => number;
  contribution: (r: number, c: number) => number; // (O − E)²/E
  maxContribution: number;
  totalsDiffer: boolean;
}

/** A chi-square test's table of counts, expected counts and contributions. */
export function chiTable(inf: Inference): ChiTable | null {
  const d = inf.data;
  if (d.family !== "chiind" && d.family !== "chigof") return null;
  const columns = d.family === "chiind" ? d.observed : [d.observed];
  const expected = d.family === "chiind" ? expectedCounts(d.observed) : [d.expected];
  const contribution = (r: number, c: number) => {
    const e = expected[c][r];
    return ((columns[c][r] - e) * (columns[c][r] - e)) / e;
  };
  let maxContribution = 0;
  columns.forEach((col, c) =>
    col.forEach((_, r) => {
      const v = contribution(r, c);
      if (Number.isFinite(v)) maxContribution = Math.max(maxContribution, v);
    })
  );
  return {
    rows: columns[0]?.length ?? 0,
    columns: columns.length,
    observed: (r, c) => columns[c][r],
    expected: (r, c) => expected[c][r],
    contribution,
    maxContribution,
    totalsDiffer: d.family === "chigof" && d.totalsDiffer,
  };
}

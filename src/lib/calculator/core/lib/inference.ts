// Inference (FN-53 to FN-58) on plain numbers: the eight kinds of test the reference's inference
// functions make, their sufficient statistics, and what a test reports for a null value and an
// interval for a confidence level, as live Desmos (College Board version) computes them
// (captured 2026-10-26, docs/superpowers/specs/calculator/b-functions-and-data.md):
// - z tests use the given population stdev as written (a negative one flips the score's sign),
//   t tests the sample stdev; two-sample tests are unpooled, a two-sample t test takes Welch's
//   degrees of freedom unrounded;
// - a one-proportion test scores with the null proportion's standard error and reports the
//   sample's (√(p̂(1 − p̂)/n)) as `stderr`; a two-proportion test of no difference scores with
//   the pooled proportion, of any other difference with the unpooled error it reports;
//   successes above the sample size are undefined;
// - p is two-sided, 2·min(P(S ≤ score), P(S ≥ score)), for z and t tests and the upper tail for
//   chi-square tests; an infinite score (a zero standard error) is undefined but its p-values are
//   0 or 1;
// - intervals are estimate ∓ c·stderr with c the normal or t quantile at (1 + level)/2, for
//   0 ≤ level < 1.
// NaN means undefined. Pure TypeScript: no DOM (AR-44).

import { chiSquareUpper } from "./chi-square";
import { normalCdf, normalQuantile, tCdf, tQuantile } from "./probability";

/** The kinds of inference object, with the type text Desmos's errors use. */
export type InferenceFamily = "z1" | "z2" | "t1" | "t2" | "zp1" | "zp2" | "chiind" | "chigof";

/** n, mean and standard deviation (σ for a z test, s for a t test). */
export interface Sample {
  n: number;
  mean: number;
  sd: number;
}

export type InferenceData =
  | { family: "z1" | "t1"; a: Sample }
  | { family: "z2" | "t2"; a: Sample; b: Sample }
  | { family: "zp1"; x: number; n: number }
  | { family: "zp2"; x1: number; n1: number; x2: number; n2: number }
  | { family: "chiind"; observed: readonly (readonly number[])[] } // the columns, as written
  | { family: "chigof"; observed: readonly number[]; expected: readonly number[] }; // expected rescaled

/**
 * An inference value: the object a test function makes, the test `T.null(h)` makes from it
 * (`nullValue` set) or the interval `T.conf(c)` makes (`level` set).
 */
export interface Inference {
  data: InferenceData;
  stage: "object" | "test" | "interval";
  nullValue?: number;
  level?: number;
}

export const isChiSquare = (f: InferenceFamily) => f === "chiind" || f === "chigof";
export const usesT = (f: InferenceFamily) => f === "t1" || f === "t2";
export const isTwoSample = (f: InferenceFamily) => f === "z2" || f === "t2" || f === "zp2";

/** The null value a test takes when none is set: ½ for one proportion, else 0. */
export function defaultNull(family: InferenceFamily): number {
  return family === "zp1" ? 0.5 : 0;
}

/** The sample statistics of a data list: n, the mean and the sample stdev (n − 1). */
export function sampleOf(values: readonly number[]): { n: number; mean: number; s: number } {
  const n = values.length;
  let sum = 0;
  for (const v of values) sum += v;
  const mean = sum / n;
  let squares = 0;
  for (const v of values) squares += (v - mean) * (v - mean);
  return { n, mean, s: Math.sqrt(squares / (n - 1)) };
}

/** The point estimate: a mean, a proportion or their difference; NaN for chi-square tests. */
export function estimateOf(d: InferenceData): number {
  switch (d.family) {
    case "z1":
    case "t1":
      return d.a.mean;
    case "z2":
    case "t2":
      return d.a.mean - d.b.mean;
    case "zp1":
      return d.x > d.n ? NaN : d.x / d.n;
    case "zp2":
      return d.x1 > d.n1 || d.x2 > d.n2 ? NaN : d.x1 / d.n1 - d.x2 / d.n2;
    default:
      return NaN;
  }
}

/** The standard error `stderr` reports: unpooled, and the sample's for proportions. */
export function stderrOf(d: InferenceData): number {
  switch (d.family) {
    case "z1":
    case "t1":
      return d.a.sd / Math.sqrt(d.a.n);
    case "z2":
    case "t2":
      return Math.sqrt((d.a.sd * d.a.sd) / d.a.n + (d.b.sd * d.b.sd) / d.b.n);
    case "zp1": {
      const p = estimateOf(d);
      return Math.sqrt((p * (1 - p)) / d.n);
    }
    case "zp2": {
      if (Number.isNaN(estimateOf(d))) return NaN;
      const [p1, p2] = [d.x1 / d.n1, d.x2 / d.n2];
      return Math.sqrt((p1 * (1 - p1)) / d.n1 + (p2 * (1 - p2)) / d.n2);
    }
    default:
      return NaN;
  }
}

/** Degrees of freedom: n − 1, Welch–Satterthwaite (unrounded), or the chi-square table's. */
export function dofOf(d: InferenceData): number {
  switch (d.family) {
    case "t1":
      return d.a.n - 1;
    case "t2": {
      const [u, v] = [(d.a.sd * d.a.sd) / d.a.n, (d.b.sd * d.b.sd) / d.b.n];
      return ((u + v) * (u + v)) / ((u * u) / (d.a.n - 1) + (v * v) / (d.b.n - 1));
    }
    case "chiind": {
      const rows = d.observed[0]?.length ?? 0;
      return (rows - 1) * (d.observed.length - 1);
    }
    case "chigof":
      return d.observed.length - 1;
    default:
      return NaN;
  }
}

/** A chi-square independence table's expected counts, column by column. */
export function expectedCounts(columns: readonly (readonly number[])[]): number[][] {
  const rows = columns[0]?.length ?? 0;
  const colTotals = columns.map((c) => c.reduce((s, v) => s + v, 0));
  const rowTotals = Array.from({ length: rows }, (_, i) => columns.reduce((s, c) => s + c[i], 0));
  const grand = colTotals.reduce((s, v) => s + v, 0);
  return columns.map((_, j) => rowTotals.map((r) => (r * colTotals[j]) / grand));
}

/** The test's standard error for its score: the null proportion's or the pooled one's. */
function scoreError(d: InferenceData, h: number): number {
  if (d.family === "zp1") return Math.sqrt((h * (1 - h)) / d.n);
  if (d.family === "zp2" && h === 0) {
    const p = (d.x1 + d.x2) / (d.n1 + d.n2);
    return Math.sqrt(p * (1 - p) * (1 / d.n1 + 1 / d.n2));
  }
  return stderrOf(d);
}

/** Σ(O − E)²/E over a table's cells. */
function chiSquareScore(observed: readonly number[], expected: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < observed.length; i++) {
    const e = expected[i];
    sum += ((observed[i] - e) * (observed[i] - e)) / e;
  }
  return sum;
}

export interface TestResult {
  score: number; // undefined (NaN) when infinite
  pleft: number;
  pright: number;
  p: number;
  dof: number;
}

/** A test's result with null value `h` (the default when undefined; chi-square tests ignore it). */
export function testResult(d: InferenceData, h: number = defaultNull(d.family)): TestResult {
  const dof = dofOf(d);
  if (d.family === "chiind" || d.family === "chigof") {
    const observed = d.family === "chiind" ? d.observed.flat() : d.observed;
    const expected = d.family === "chiind" ? expectedCounts(d.observed).flat() : d.expected;
    const score = chiSquareScore(observed, expected);
    const p = Number.isFinite(score) ? chiSquareUpper(score, dof) : NaN;
    return { score: Number.isFinite(score) ? score : NaN, pleft: NaN, pright: p, p, dof };
  }
  const raw = (estimateOf(d) - h) / scoreError(d, h);
  const cdf = (t: number) => (usesT(d.family) ? tCdf(t, dof) : normalCdf(t));
  const pleft = Number.isNaN(raw) ? NaN : cdf(raw),
    pright = Number.isNaN(raw) ? NaN : cdf(-raw);
  return {
    score: Number.isFinite(raw) ? raw : NaN,
    pleft,
    pright,
    p: Math.min(1, 2 * Math.min(pleft, pright)),
    dof,
  };
}

export interface IntervalResult {
  lower: number;
  upper: number;
  estimate: number;
  stderr: number;
  dof: number;
}

/** The confidence interval at `level`, 0 ≤ level < 1 (else undefined bounds). */
export function intervalResult(d: InferenceData, level: number): IntervalResult {
  const estimate = estimateOf(d),
    stderr = stderrOf(d),
    dof = dofOf(d);
  const q = (1 + level) / 2;
  const c =
    level >= 0 && level < 1 ? (usesT(d.family) ? tQuantile(q, dof) : normalQuantile(q)) : NaN;
  const half = c === 0 ? 0 : c * stderr;
  const finite = (v: number) => (Number.isFinite(v) ? v : NaN);
  return { lower: finite(estimate - half), upper: finite(estimate + half), estimate, stderr, dof };
}

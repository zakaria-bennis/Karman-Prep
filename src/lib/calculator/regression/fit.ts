// One regression fit (D-24 to D-34 as amended by appendix F): Desmos's error for undefined data,
// the direct SVD path for models affine in their parameters (tested numerically; in exact fractions
// when every value the model reads is exact, exact-linear.ts), Levenberg–
// Marquardt from the standard starts and the log-mode solution otherwise, log mode unchecked by
// default and offered only when its values are positive, R² always (RMSE in its place when it is
// undefined), and r for a linear model with a free intercept or a log-mode fit. Pure TypeScript.

import { fitNonlinear } from "./levenberg";
import { fitMultiStart, type IndexedGradient } from "./multi-start-fit";
import { columnOrderPivots, solveColumnOrder } from "./linear-fit";
import { MAX_EXACT_ROWS, solveExact } from "./exact-linear";
import { literalFraction, subFractions, type Fraction } from "../core/lib/rational";
import { regressionStatistics, type RegressionStatistics } from "./statistics";

export const FIT_ERROR = "This model isn't defined for this data.";

/** D-27: a model log mode can linearise, with the indices of its parameters in `params`. */
export type LogFormMatch =
  | { kind: "exponential-base"; a: number; b: number } // a·b^x
  | { kind: "exponential-growth"; a: number; r: number } // a·(1+r)^x
  | { kind: "exponential-e"; a: number; b: number } // a·e^(bx), a·exp(bx)
  | { kind: "exponential-ac"; c: number; a: number; b: number } // a·c^(bx), c a number
  | { kind: "exponential-c"; c: number; m: number; k: number } // c^(mx+k)
  | { kind: "power"; a: number; b: number } // a·x^b
  | { kind: "logarithmic"; a: number; b: number }; // a + b·ln x

export interface FitInput {
  observed: number[]; // L, NaN for a blank or non-numeric element
  predictor: number[]; // the first predictor list (r, log mode), NaN likewise
  others?: number[][]; // any further predictor lists
  params: string[];
  model: (p: Float64Array, i: number) => number;
  logForm: LogFormMatch | null;
  logMode: boolean; // the row's checkbox (D-30: unchecked by default)
  plainLeft?: boolean; // REG-STATISTICS-8: L is a bare name (default true)
  uniquePredictor?: boolean; // REG-STATISTICS-7: M reads exactly one list (default true)
  multiStart?: boolean; // a fit of both sides whole: REGRESSION-10's multi-start search too
  gradient?: IndexedGradient; // the model's derivatives for the multi-start search, when known
  // every observation's prediction as an exact fraction (null where it is not exact), when known
  exactModel?: (p: readonly Fraction[]) => (Fraction | null)[];
}
export interface RegressionResult {
  ok: boolean;
  error: string | null;
  params: { name: string; value: number }[];
  r2: number | null;
  r: number | null;
  rmse: number | null;
  residuals: number[];
  logMode: { available: boolean; on: boolean };
  approximate: boolean;
  isLinear: boolean; // RT-17: affine in its parameters, so solved exactly (RT-31's "?" when false)
  exact?: (Fraction | null)[]; // each parameter's exact fraction, from an exact solve (exact-linear.ts)
}

const STARTS = [1, 0.1, -1, 0, 10]; // D-25
const AFFINE_TOLERANCE = 1e-9;
const AFFINE_SEEDS = [0.37, -1.91, 5.83, -7.37, 19.3, -43.1];
const EXACT_SSE = 1e-20; // sums of squares this close, relative to 1 + Σy², are equal
const TIE = 1e-9; // and so are sums of squares within this fraction of each other
const SNAP = 1e-6; // a whole-value fit's parameters smaller than this try 0 (zeroed)

const failure = (available: boolean, on: boolean): RegressionResult => ({
  ok: false,
  error: FIT_ERROR,
  params: [],
  r2: null,
  r: null,
  rmse: null,
  residuals: [],
  logMode: { available, on },
  approximate: false,
  isLinear: true,
});

const mean = (v: ArrayLike<number>) => {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i];
  return s / v.length;
};

/** Simple linear regression of v on u: slope, intercept, Pearson r (null when undefined). */
function simple(u: ArrayLike<number>, v: ArrayLike<number>) {
  const mu = mean(u),
    mv = mean(v);
  let suv = 0,
    suu = 0,
    svv = 0;
  for (let i = 0; i < u.length; i++) {
    suv += (u[i] - mu) * (v[i] - mv);
    suu += (u[i] - mu) ** 2;
    svv += (v[i] - mv) ** 2;
  }
  const slope = suu > 0 ? suv / suu : 0;
  const r = suu > 0 && svv > 0 ? suv / Math.sqrt(suu * svv) : null;
  return { slope, intercept: mv - slope * mu, r, ssTotal: svv };
}

/** The transformed pairs (u, v) a log form fits, or null when a needed value is not positive. */
function transformed(form: LogFormMatch, x: ArrayLike<number>, y: ArrayLike<number>) {
  const needX = form.kind === "power" || form.kind === "logarithmic",
    needY = form.kind !== "logarithmic";
  for (let i = 0; i < x.length; i++) {
    if ((needX && !(x[i] > 0)) || (needY && !(y[i] > 0))) return null;
  }
  const u = Float64Array.from(x, (v) => (needX ? Math.log(v) : v));
  const v = Float64Array.from(y, (w) => (needY ? Math.log(w) : w));
  return { u, v };
}

/** D-29: the log-mode parameters mapped back from the transformed fit. */
function logParams(form: LogFormMatch, k: number, fit: { slope: number; intercept: number }) {
  const p = new Float64Array(k);
  const { slope, intercept } = fit;
  switch (form.kind) {
    case "exponential-base":
      p[form.a] = Math.exp(intercept);
      p[form.b] = Math.exp(slope);
      break;
    case "exponential-growth":
      p[form.a] = Math.exp(intercept);
      p[form.r] = Math.expm1(slope);
      break;
    case "exponential-e":
    case "power":
      p[form.a] = Math.exp(intercept);
      p[form.b] = slope;
      break;
    case "exponential-ac":
      p[form.a] = Math.exp(intercept);
      p[form.b] = slope / Math.log(form.c);
      break;
    case "exponential-c":
      p[form.m] = slope / Math.log(form.c);
      p[form.k] = intercept / Math.log(form.c);
      break;
    case "logarithmic":
      p[form.a] = intercept;
      p[form.b] = slope;
      break;
  }
  return p;
}

/**
 * The model's columns when it is affine in its parameters, else null. It is tried at AFFINE_SEEDS:
 * far ones find a kink such as |a−3|, or `\left|2n+7\right|+4\sim1`'s at −3.5 (live −3.5, not
 * the line's −5, 2026-10-25).
 */
function affineColumns(model: FitInput["model"], n: number, k: number) {
  const zero = new Float64Array(k);
  const f0 = Float64Array.from({ length: n }, (_, i) => model(zero, i));
  const cols = Array.from({ length: k }, (_, j) => {
    const e = new Float64Array(k);
    e[j] = 1;
    return Float64Array.from({ length: n }, (_, i) => model(e, i) - f0[i]);
  });
  if (![...f0, ...cols.flatMap((c) => [...c])].every(Number.isFinite)) return null;
  for (const seed of AFFINE_SEEDS) {
    const p = Float64Array.from({ length: k }, (_, j) => seed * (j + 1.3));
    for (let i = 0; i < n; i++) {
      let lin = f0[i];
      for (let j = 0; j < k; j++) lin += p[j] * cols[j][i];
      const got = model(p, i);
      if (!(Math.abs(got - lin) <= AFFINE_TOLERANCE * Math.max(1, Math.abs(got), Math.abs(lin)))) {
        return null;
      }
    }
  }
  return { f0, cols };
}

/**
 * A whole-value fit's parameters below SNAP in size set to 0, in order, wherever that fits no
 * worse (live Desmos, 2026-10-25): `-n^2\sim264` stalls at −1.6×10^-7 and shows 0, and so do
 * stalls at 9.7×10^-7 (`-\left(0.2n\right)^2\sim5767`), while 1.018×10^-6 stays
 * (`-\left(0.1n\right)^2\sim150`) and `n^3\sim10^{-21}` keeps its exact 1×10^-7.
 */
function zeroed(model: FitInput["model"], y: Float64Array, start: Float64Array): Float64Array {
  const sse = (q: Float64Array) => {
    let s = 0;
    for (let i = 0; i < y.length; i++) s += (y[i] - model(q, i)) ** 2;
    return s;
  };
  let p = start,
    error = sse(p);
  for (let j = 0; j < p.length; j++) {
    if (p[j] === 0 || !(Math.abs(p[j]) < SNAP)) continue;
    const q = Float64Array.from(p);
    q[j] = 0;
    const e = sse(q);
    if (e <= error) [p, error] = [q, e];
  }
  return p;
}

/** The affine model solved in exact fractions when every value it reads is exact, else null. */
function exactAffine(
  exactModel: NonNullable<FitInput["exactModel"]>,
  y: Float64Array,
  k: number,
  pivots: () => number[]
) {
  if (y.length > MAX_EXACT_ROWS) return null;
  const observed = Array.from(y, literalFraction); // data read as typed
  if (observed.some((v) => v === null)) return null;
  const at = (j: number) =>
    exactModel(Array.from({ length: k }, (_, q) => ({ n: q === j ? 1 : 0, d: 1 }))).slice(
      0,
      y.length
    );
  const f0 = at(-1);
  if (f0.length !== y.length || f0.some((v) => v === null)) return null;
  const cols: Fraction[][] = [];
  for (let j = 0; j < k; j++) {
    const col = at(j).map((v, i) => (v === null ? null : subFractions(v, f0[i]!)));
    if (col.length !== y.length || col.some((v) => v === null)) return null;
    cols.push(col as Fraction[]);
  }
  return solveExact(f0 as Fraction[], cols, observed as Fraction[], pivots());
}

export function fitRegression(input: FitInput): RegressionResult {
  const { params, model, logForm } = input;
  const k = params.length;
  const lists = [input.observed, input.predictor, ...(input.others ?? [])];
  const n = Math.min(...lists.map((l) => l.length));
  const y = Float64Array.from(input.observed.slice(0, n)),
    x = Float64Array.from(input.predictor.slice(0, n));
  const trans = logForm === null || n === 0 ? null : transformed(logForm, x, y);
  const available = trans !== null,
    on = available && input.logMode;
  if (n === 0 || lists.some((l) => l.slice(0, n).some((v) => !Number.isFinite(v)))) {
    return failure(available, on);
  }
  let p: Float64Array = new Float64Array(k),
    approximate = false,
    exact: (Fraction | null)[] | undefined;
  const affine = k > 0 ? affineColumns(model, n, k) : null;
  const isLinear = k === 0 || affine !== null;
  const logFit = trans === null ? null : simple(trans.u, trans.v);
  if (on && logFit !== null) {
    p = logParams(logForm!, k, logFit);
  } else if (k > 0) {
    if (affine !== null) {
      const a = new Float64Array(n * k);
      for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) a[i * k + j] = affine.cols[j][i];
      // RT-17: free (non-pivot) parameters are 0, not a minimum-norm solution.
      p = solveColumnOrder(
        a,
        n,
        k,
        Float64Array.from(y, (v, i) => v - affine.f0[i])
      );
      const solved =
        input.exactModel && exactAffine(input.exactModel, y, k, () => columnOrderPivots(a, n, k));
      if (solved) [p, exact] = [Float64Array.from(solved.values), solved.fractions];
    } else {
      const starts = STARTS.map((v) => new Float64Array(k).fill(v));
      if (logFit !== null) starts.push(logParams(logForm!, k, logFit));
      const exact = EXACT_SSE * (1 + y.reduce((acc, v) => acc + v * v, 0));
      // The first start, in order, whose fit is as good as the best within rounding (b > 0 for
      // `y_1\sim ab^{x_1}` on x = 0, 2, 4, where b and −b fit alike).
      const fits = starts.map((start) => fitNonlinear(model, y, start));
      const least = Math.min(...fits.map((f) => (Number.isFinite(f.sse) ? f.sse : Infinity)));
      const best = Number.isFinite(least)
        ? (fits.find((f) => f.sse <= least * (1 + TIE) + exact) ?? null)
        : null;
      // A system or equation fitted whole (list-fit.ts), as live Desmos (2026-10-25): the search
      // from the start 1 stands unless the multi-start search fits better beyond rounding, so
      // `[ab,a+b]\sim[6,5]` reaches a = 3, b = 2 and `(a-1)^2\sim16`, which stalls at 1, gives 5,
      // while `-n^6\sim264` keeps 1's −0.00645282 and `2^n\sim0` its −143.26663.
      const wide =
        input.multiStart === true
          ? fitMultiStart(model, y, k, input.gradient, { relative: TIE, slack: exact })
          : null;
      if (
        wide !== null &&
        Number.isFinite(wide.sse) &&
        wide.params.every(Number.isFinite) &&
        (best === null || wide.sse <= best.sse * (1 + TIE) + exact)
      ) {
        p = zeroed(model, y, wide.params);
      } else {
        if (best === null) return failure(available, on);
        p = best.params;
        approximate = !best.converged;
      }
    }
  }
  const predicted = Float64Array.from({ length: n }, (_, i) => model(p, i));
  if (!predicted.every(Number.isFinite) || !p.every(Number.isFinite)) return failure(available, on);
  const residuals = Array.from(y, (v, i) => v - predicted[i]);
  // RT section 1: exactly one of {RMSE}, {Rsquared}, {r, rsquared}.
  const plainLeft = input.plainLeft ?? true;
  let statistics: RegressionStatistics | null;
  if (on && logFit !== null && trans !== null) {
    const logY = logForm!.kind !== "logarithmic";
    statistics = regressionStatistics({
      observed: trans.v,
      predicted: logY ? Array.from(predicted, Math.log) : predicted,
      predictor: trans.u,
      plainLeft,
      forceR: true,
    });
  } else {
    statistics = regressionStatistics({
      observed: y,
      predicted,
      predictor: input.uniquePredictor === false ? null : x,
      plainLeft,
    });
  }
  if (statistics === null) return failure(available, on);
  const r2 =
    statistics.kind === "r"
      ? statistics.rsquared
      : statistics.kind === "Rsquared"
        ? statistics.Rsquared
        : null;
  const r = statistics.kind === "r" ? statistics.r : null;
  return {
    ok: true,
    error: null,
    params: params.map((name, j) => ({ name, value: p[j] })),
    r2,
    r,
    rmse: statistics.kind === "RMSE" ? statistics.RMSE : null,
    residuals,
    logMode: { available, on },
    approximate,
    isLinear,
    ...(exact === undefined ? {} : { exact }),
  };
}

// One regression fit (D-24 to D-34 as amended by appendix F): Desmos's error for undefined data,
// the direct SVD path for models affine in their parameters (tested numerically), Levenberg–
// Marquardt from the standard starts and the log-mode solution otherwise, log mode unchecked by
// default and offered only when its values are positive, R² always (RMSE in its place when it is
// undefined), and r for a linear model with a free intercept or a log-mode fit. Pure TypeScript.

import { fitNonlinear } from "./levenberg";
import { solveLeastSquares } from "./least-squares";

export const FIT_ERROR = "We couldn't find any region where this model is defined.";

/** D-27: a model log mode can linearise, with the indices of its parameters in `params`. */
export type LogFormMatch =
  | { kind: "exponential-base"; a: number; b: number } // a·b^x
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
}

const STARTS = [1, 0.1, -1, 0, 10]; // D-25
const AFFINE_TOLERANCE = 1e-9;

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

/** The model's columns when it is affine in its parameters (two random checks), else null. */
function affineColumns(model: FitInput["model"], n: number, k: number) {
  const zero = new Float64Array(k);
  const f0 = Float64Array.from({ length: n }, (_, i) => model(zero, i));
  const cols = Array.from({ length: k }, (_, j) => {
    const e = new Float64Array(k);
    e[j] = 1;
    return Float64Array.from({ length: n }, (_, i) => model(e, i) - f0[i]);
  });
  if (![...f0, ...cols.flatMap((c) => [...c])].every(Number.isFinite)) return null;
  for (const seed of [0.37, -1.91]) {
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
    linearFreeIntercept = false;
  const logFit = trans === null ? null : simple(trans.u, trans.v);
  if (on && logFit !== null) {
    p = logParams(logForm!, k, logFit);
  } else if (k > 0) {
    const affine = affineColumns(model, n, k);
    if (affine !== null) {
      const a = new Float64Array(n * k);
      for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) a[i * k + j] = affine.cols[j][i];
      p = solveLeastSquares(
        a,
        n,
        k,
        Float64Array.from(y, (v, i) => v - affine.f0[i])
      );
      linearFreeIntercept =
        k === 2 &&
        affine.f0.every((v) => v === 0) &&
        affine.cols.some((c) => c.every((v) => v === 1)) &&
        affine.cols.some((c) => c.every((v, i) => v === x[i]));
    } else {
      const starts = STARTS.map((v) => new Float64Array(k).fill(v));
      if (logFit !== null) starts.push(logParams(logForm!, k, logFit));
      let best: ReturnType<typeof fitNonlinear> | null = null;
      for (const start of starts) {
        const fit = fitNonlinear(model, y, start);
        if (Number.isFinite(fit.sse) && (best === null || fit.sse < best.sse)) best = fit;
      }
      if (best === null) return failure(available, on);
      p = best.params;
      approximate = !best.converged;
    }
  }
  const predicted = Float64Array.from({ length: n }, (_, i) => model(p, i));
  if (!predicted.every(Number.isFinite) || !p.every(Number.isFinite)) return failure(available, on);
  const residuals = Array.from(y, (v, i) => v - predicted[i]);
  const sse = residuals.reduce((s, e) => s + e * e, 0);
  let r2: number | null, r: number | null;
  if (on && logFit !== null && trans !== null) {
    r2 = logFit.r === null ? null : logFit.r * logFit.r;
    r = logFit.r;
  } else {
    const my = mean(y);
    const sst = y.reduce((s, v) => s + (v - my) ** 2, 0);
    r2 = n > k && sst > 0 ? 1 - sse / sst : null;
    r = linearFreeIntercept ? simple(x, y).r : null;
  }
  return {
    ok: true,
    error: null,
    params: params.map((name, j) => ({ name, value: p[j] })),
    r2,
    r,
    rmse: r2 === null ? Math.sqrt(sse / n) : null,
    residuals,
    logMode: { available, on },
    approximate,
  };
}

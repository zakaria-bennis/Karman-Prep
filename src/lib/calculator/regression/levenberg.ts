// Nonlinear least squares for regressions (D-25): Levenberg–Marquardt with Marquardt's diagonal
// scaling and central-difference Jacobians (step 6.06e-6·max(1, |p|)), each damped step solved as
// an augmented least-squares problem, at most 200 iterations, stopping when the relative SSE
// change is below 1e-12 or the relative step below 1e-10. Pure TypeScript: no DOM.

import { solveLeastSquares } from "./least-squares";

export interface NonlinearFit {
  params: Float64Array;
  sse: number;
  converged: boolean;
  iterations: number;
}
/** The model's prediction for observation i at parameters p. */
export type Model = (p: Float64Array, i: number) => number;

const STEP = 6.06e-6;
const SSE_TOLERANCE = 1e-12;
const STEP_TOLERANCE = 1e-10;
const MAX_ITERATIONS = 200;
const MAX_DAMPING_TRIES = 40;

function residualsOf(model: Model, p: Float64Array, y: Float64Array, out: Float64Array): number {
  let sse = 0;
  for (let i = 0; i < y.length; i++) {
    out[i] = y[i] - model(p, i);
    sse += out[i] * out[i];
  }
  return Number.isFinite(sse) ? sse : Infinity;
}

export function fitNonlinear(
  model: Model,
  y: Float64Array,
  start: Float64Array,
  opts: { maxIterations?: number } = {}
): NonlinearFit {
  const n = y.length,
    k = start.length,
    maxIterations = opts.maxIterations ?? MAX_ITERATIONS;
  let p = Float64Array.from(start);
  const r = new Float64Array(n),
    trial = new Float64Array(n);
  let sse = residualsOf(model, p, y, r);
  let lambda = -1; // set from the first Jacobian
  let converged = false,
    iterations = 0;
  const jac = new Float64Array(n * k);
  for (; iterations < maxIterations && Number.isFinite(sse); iterations++) {
    for (let j = 0; j < k; j++) {
      const h = STEP * Math.max(1, Math.abs(p[j]));
      const up = Float64Array.from(p),
        down = Float64Array.from(p);
      up[j] += h;
      down[j] -= h;
      for (let i = 0; i < n; i++) jac[i * k + j] = (model(up, i) - model(down, i)) / (2 * h);
    }
    const diag = new Float64Array(k);
    for (let j = 0; j < k; j++) {
      let s = 0;
      for (let i = 0; i < n; i++) s += jac[i * k + j] ** 2;
      diag[j] = Math.max(Math.sqrt(s), 1e-300);
    }
    if (lambda < 0) lambda = 1e-3;
    let accepted = false;
    for (let tries = 0; tries < MAX_DAMPING_TRIES; tries++) {
      const a = new Float64Array((n + k) * k),
        b = new Float64Array(n + k);
      a.set(jac);
      b.set(r);
      const root = Math.sqrt(lambda);
      for (let j = 0; j < k; j++) a[(n + j) * k + j] = root * diag[j];
      const delta = solveLeastSquares(a, n + k, k, b);
      const next = Float64Array.from(p, (v, j) => v + delta[j]);
      const nextSse = residualsOf(model, next, y, trial);
      if (nextSse <= sse) {
        let stepNorm = 0,
          pNorm = 0;
        for (let j = 0; j < k; j++) {
          stepNorm += delta[j] ** 2;
          pNorm += next[j] ** 2;
        }
        const sseChange = sse === 0 ? 0 : (sse - nextSse) / sse;
        p = next;
        r.set(trial);
        sse = nextSse;
        lambda = Math.max(lambda / 3, 1e-12);
        accepted = true;
        if (
          sseChange < SSE_TOLERANCE ||
          Math.sqrt(stepNorm) < STEP_TOLERANCE * (Math.sqrt(pNorm) + STEP_TOLERANCE)
        ) {
          converged = true;
        }
        break;
      }
      lambda *= 4;
    }
    if (!accepted || converged) {
      converged ||= !accepted && sse < Infinity && lambda > 1e10; // no step lowers SSE: a minimum
      iterations++;
      break;
    }
  }
  return { params: p, sse, converged, iterations };
}

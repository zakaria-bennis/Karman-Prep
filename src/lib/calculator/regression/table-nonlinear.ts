// Table models that are not linear in their parameters (RT-18, REG-MODELS-13, -14): exponential,
// power, logistic and sinusoidal, each fitted by variable projection. The parameters that enter
// linearly (a, and A, B, d of the sinusoid) are solved exactly for every trial value of the rest,
// so only b (exponential, power, sinusoid) or b and c (logistic) are searched, over a scan of the
// centred and scaled forms the reference fits, then refined. |p| < 1e-6 snaps to 0 when that does
// not raise the error. Pure TypeScript: no DOM.

import { solveColumnOrder } from "./linear-fit";
import { realPower, type TableModel } from "./table-models";

export interface NonlinearResult {
  params: number[];
  sse: number;
}

const GOLDEN = 0.3819660112501051;

/** Least squares of y on the basis columns; returns the coefficients and the SSE. */
function project(columns: Float64Array[], y: ArrayLike<number>): { c: Float64Array; sse: number } {
  const n = y.length,
    k = columns.length;
  const a = new Float64Array(n * k);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < k; j++) {
      const v = columns[j][i];
      if (!Number.isFinite(v)) return { c: new Float64Array(k).fill(NaN), sse: Infinity };
      a[i * k + j] = v;
    }
  }
  const c = solveColumnOrder(a, n, k, y);
  let sse = 0;
  for (let i = 0; i < n; i++) {
    let f = 0;
    for (let j = 0; j < k; j++) f += c[j] * columns[j][i];
    sse += (y[i] - f) ** 2;
  }
  return { c, sse: Number.isFinite(sse) && c.every(Number.isFinite) ? sse : Infinity };
}

/** Brent's minimiser of f on [lo, hi] (no derivatives). */
function brent(f: (t: number) => number, lo: number, hi: number, iterations = 200): number {
  let a = lo,
    b = hi,
    x = a + GOLDEN * (b - a),
    w = x,
    v = x,
    fx = f(x),
    fw = fx,
    fv = fx,
    d = 0,
    e = 0;
  for (let it = 0; it < iterations; it++) {
    const m = (a + b) / 2,
      tol = 1e-14 * Math.abs(x) + 1e-300,
      tol2 = 2 * tol;
    if (Math.abs(x - m) <= tol2 - (b - a) / 2) break;
    let u: number;
    if (Math.abs(e) > tol) {
      const r = (x - w) * (fx - fv);
      let q = (x - v) * (fx - fw),
        p = (x - v) * q - (x - w) * r;
      q = 2 * (q - r);
      if (q > 0) p = -p;
      else q = -q;
      const eOld = e;
      e = d;
      if (Math.abs(p) >= Math.abs(0.5 * q * eOld) || p <= q * (a - x) || p >= q * (b - x)) {
        e = x >= m ? a - x : b - x;
        d = GOLDEN * e;
      } else {
        d = p / q;
        u = x + d;
        if (u - a < tol2 || b - u < tol2) d = x < m ? tol : -tol;
      }
    } else {
      e = x >= m ? a - x : b - x;
      d = GOLDEN * e;
    }
    u = Math.abs(d) >= tol ? x + d : x + (d > 0 ? tol : -tol);
    const fu = f(u);
    if (fu <= fx) {
      if (u >= x) a = x;
      else b = x;
      v = w;
      fv = fw;
      w = x;
      fw = fx;
      x = u;
      fx = fu;
    } else {
      if (u < x) a = u;
      else b = u;
      if (fu <= fw || w === x) {
        v = w;
        fv = fw;
        w = u;
        fw = fu;
      } else if (fu <= fv || v === x || v === w) {
        v = u;
        fv = fu;
      }
    }
  }
  return x;
}

/** The grid point minimising f, refined by Brent between its neighbours. */
function scan1(f: (t: number) => number, grid: readonly number[]): { t: number; value: number } {
  let best = -1,
    bestValue = Infinity;
  grid.forEach((t, i) => {
    const value = f(t);
    if (value < bestValue) {
      bestValue = value;
      best = i;
    }
  });
  if (best < 0) return { t: NaN, value: Infinity };
  const lo = grid[Math.max(0, best - 1)],
    hi = grid[Math.min(grid.length - 1, best + 1)];
  const t = brent(f, lo, hi);
  const value = f(t);
  return value <= bestValue ? { t, value } : { t: grid[best], value: bestValue };
}

const span = (from: number, to: number, count: number) =>
  Array.from({ length: count }, (_, i) => from + ((to - from) * i) / (count - 1));

function centre(xs: readonly number[]) {
  const lo = Math.min(...xs),
    hi = Math.max(...xs);
  const range = hi - lo > 0 ? hi - lo : 1;
  return { mid: (lo + hi) / 2, range };
}

/** a·exp(β·u) with u = (t − mid)/range; returns a and β on the raw t scale (a·e^{βt}). */
function fitExpOf(ts: readonly number[], ys: readonly number[]) {
  const { mid, range } = centre(ts);
  const us = ts.map((t) => (t - mid) / range);
  const sse = (beta: number) => project([Float64Array.from(us, (u) => Math.exp(beta * u))], ys);
  const { t: beta } = scan1((b) => sse(b).sse, span(-80, 80, 641));
  const { c } = sse(beta);
  // a·e^{β(t−mid)/range} = (a·e^{−β·mid/range})·e^{(β/range)·t}
  return { a: c[0] * Math.exp((-beta * mid) / range), k: beta / range };
}

function fitExponential(xs: readonly number[], ys: readonly number[]): number[] {
  const { a, k } = fitExpOf(xs, ys);
  return [a, Math.exp(k)];
}

function fitPower(xs: readonly number[], ys: readonly number[]): number[] {
  if (xs.every((x) => x > 0)) {
    const { a, k } = fitExpOf(
      xs.map((x) => Math.log(x)),
      ys
    );
    return [a, k];
  }
  const sse = (b: number) => project([Float64Array.from(xs, (x) => realPower(x, b))], ys);
  if (xs.every((x) => x >= 0)) {
    const grid = span(-20, 20, 801);
    const { t: b } = scan1((t) => sse(t).sse, grid);
    let best = b;
    if (!(sse(0).sse > sse(b).sse)) best = 0; // 0^0 = 1: b = 0 can beat every b > 0
    return [sse(best).c[0], best];
  }
  // A negative x is real only at fractions of odd denominator: scan hundredths, no refinement.
  let best = 0,
    bestValue = sse(0).sse;
  for (let k = -2000; k <= 2000; k++) {
    const value = sse(k / 100).sse;
    if (value < bestValue) {
      bestValue = value;
      best = k / 100;
    }
  }
  return [sse(best).c[0], best];
}

/** Levenberg–Marquardt on the projected residual of a two-parameter search. */
function lm2(
  residual: (t: readonly number[]) => Float64Array | null,
  start: readonly number[],
  iterations: number
): { t: number[]; sse: number } {
  let t = [...start];
  const sseOf = (r: Float64Array | null) =>
    r === null ? Infinity : r.reduce((s, v) => s + v * v, 0);
  let r = residual(t),
    sse = sseOf(r),
    lambda = 1e-3;
  if (!Number.isFinite(sse)) return { t, sse };
  for (let it = 0; it < iterations; it++) {
    const n = r!.length;
    const jac = t.map((tj, j) => {
      const h = 1e-7 * Math.max(1, Math.abs(tj));
      const tp = [...t];
      tp[j] += h;
      const rp = residual(tp);
      return rp === null ? null : Float64Array.from(rp, (v, i) => (v - r![i]) / h);
    });
    if (jac.some((c) => c === null)) break;
    const J = jac as Float64Array[];
    const g = [0, 0],
      H = [
        [0, 0],
        [0, 0],
      ];
    for (let i = 0; i < n; i++) {
      for (let a = 0; a < 2; a++) {
        g[a] += J[a][i] * r![i];
        for (let b = 0; b < 2; b++) H[a][b] += J[a][i] * J[b][i];
      }
    }
    let accepted = false;
    for (let tries = 0; tries < 40 && !accepted; tries++) {
      const h00 = H[0][0] * (1 + lambda) + 1e-300,
        h11 = H[1][1] * (1 + lambda) + 1e-300,
        det = h00 * h11 - H[0][1] * H[1][0];
      const d0 = (-(h11 * g[0]) + H[0][1] * g[1]) / det,
        d1 = (-(h00 * g[1]) + H[1][0] * g[0]) / det;
      const next = [t[0] + d0, t[1] + d1];
      const rn = residual(next),
        sn = sseOf(rn);
      if (Number.isFinite(sn) && sn <= sse) {
        const done = sse - sn <= 1e-15 * sse;
        t = next;
        r = rn;
        sse = sn;
        lambda = Math.max(lambda * 0.1, 1e-64);
        accepted = true;
        if (done) return { t, sse };
      } else lambda *= 2;
    }
    if (!accepted) break;
  }
  return { t, sse };
}

function fitLogistic(xs: readonly number[], ys: readonly number[]): number[] {
  const { mid, range } = centre(xs);
  const us = xs.map((x) => (x - mid) / range);
  const solve = ([bu, cu]: readonly number[]) =>
    project([Float64Array.from(us, (u) => 1 / (1 + Math.exp(-(bu * u + cu))))], ys);
  const residual = (t: readonly number[]) => {
    const { c, sse } = solve(t);
    if (!Number.isFinite(sse)) return null;
    return Float64Array.from(ys, (y, i) => y - c[0] / (1 + Math.exp(-(t[0] * us[i] + t[1]))));
  };
  const starts: { t: number[]; sse: number }[] = [];
  for (const bu of span(-40, 40, 33)) {
    for (const cu of span(-20, 20, 21)) starts.push({ t: [bu, cu], sse: solve([bu, cu]).sse });
  }
  starts.sort((p, q) => p.sse - q.sse);
  let best = { t: [1, 0], sse: Infinity };
  for (const s of starts.slice(0, 6)) {
    const fit = lm2(residual, s.t, 300);
    if (fit.sse < best.sse) best = fit;
  }
  const [bu, cu] = best.t;
  const a = solve(best.t).c[0];
  return [a, bu / range, cu - (bu * mid) / range];
}

function fitSinusoidal(xs: readonly number[], ys: readonly number[]): number[] {
  const { range } = centre(xs);
  const sorted = [...new Set(xs)].sort((p, q) => p - q);
  let gap = Infinity;
  for (let i = 1; i < sorted.length; i++) gap = Math.min(gap, sorted[i] - sorted[i - 1]);
  if (!Number.isFinite(gap) || gap <= 0) gap = range;
  const solve = (b: number) =>
    project(
      [
        Float64Array.from(xs, (x) => Math.sin(b * x)),
        Float64Array.from(xs, (x) => Math.cos(b * x)),
        Float64Array.from(xs, () => 1),
      ],
      ys
    );
  let b = 1;
  // With no more points than linear parameters every b fits exactly: keep the start value 1.
  if (xs.length > 3) {
    const step = Math.PI / range / 16,
      top = Math.PI / gap;
    const count = Math.min(20000, Math.max(64, Math.ceil(top / step)));
    const grid = span(top / count / 64, top, count);
    const best = scan1((t) => solve(t).sse, grid);
    // The search starts from b = 1 (REG-MODELS-13): it stays there when nothing fits better.
    const scale = ys.reduce((s, y) => s + y * y, 0);
    if (!(solve(1).sse <= best.value * (1 + 1e-9) + 1e-24 * scale)) b = best.t;
  }
  // The projected coefficients get the same tiny-value clean-up before A, B map to a and c.
  const [A, B, d] = [...solve(b).c].map((v) => (Math.abs(v) < 1e-6 ? 0 : v));
  return [Math.hypot(A, B), b, Math.atan2(B, A), d];
}

/** The parameters of a nonlinear table model fitted to (xs, ys), all finite, or null. */
export function fitNonlinearTable(
  type: Extract<TableModel, "exponential" | "power" | "logistic" | "sinusoidal">,
  xs: readonly number[],
  ys: readonly number[],
  evaluate: (p: ArrayLike<number>, x: number) => number
): NonlinearResult | null {
  const params =
    type === "exponential"
      ? fitExponential(xs, ys)
      : type === "power"
        ? fitPower(xs, ys)
        : type === "logistic"
          ? fitLogistic(xs, ys)
          : fitSinusoidal(xs, ys);
  const cleaned = snapTinyParameters(params, xs, ys, evaluate);
  if (cleaned === null) return null;
  return cleaned;
}

/**
 * REG-MODELS-13: every |p| < 1e-6 set to 0 together, kept when the mean squared error rises by no
 * more than a rounding allowance (1e-15 of each observation); null when the fit is not finite.
 */
export function snapTinyParameters(
  params: readonly number[],
  xs: readonly number[],
  ys: readonly number[],
  evaluate: (p: ArrayLike<number>, x: number) => number
): NonlinearResult | null {
  const mse = (p: readonly number[]) =>
    xs.reduce((s, x, i) => s + (ys[i] - evaluate(p, x)) ** 2, 0) / xs.length;
  const before = mse(params);
  if (!params.every(Number.isFinite) || !Number.isFinite(before)) return null;
  const snapped = params.map((p) => (Math.abs(p) < 1e-6 ? 0 : p));
  const after = mse(snapped);
  let allowance = 0;
  xs.forEach((x, i) => {
    const c = Math.abs(ys[i]) * 1e-15;
    allowance += Math.abs((ys[i] - evaluate(snapped, x)) * c) + c * c;
  });
  allowance /= xs.length;
  if (!Number.isFinite(allowance)) allowance = 0;
  const keep = Number.isFinite(after) && after <= before + allowance;
  const chosen = keep ? snapped : [...params];
  return { params: chosen, sse: (keep ? after : before) * xs.length };
}

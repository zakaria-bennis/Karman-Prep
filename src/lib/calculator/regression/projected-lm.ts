// The multi-start Levenberg–Marquardt search of RT-18 (REG-MODELS-13, REGRESSION-10), with variable
// projection: the parameters marked linear are re-solved by least squares after every step, and
// the damped Gauss–Newton step moves only the others, along the residual and Jacobian projected
// off the linear columns. 31 start rows from the fixed constant table, 3 iterations each, the best
// 5 run 60, the best 1 runs 250, plus 100 from the preferred start. Damping starts at 1e-3, ×0.1
// on an accepted step, ×2 (floored at 1e-64) on a rejected one; a run stops when a step leaves the
// parameters unchanged or the error is not finite. Pure TypeScript: no DOM.

const START_CONSTANTS = [
  18.9, 0.105, 0.0113, 0.089, 4.414, 0.373, 0.06, 0.149, 1.84, 9.26, 5, 0.7, 0.2, 1.13, 2.61, 1,
  0.007, 30, 120, 1500, 4e-4, 7.23, -1, -0.0081, -0.03, -28.6, -1.71, -0.4, -6.94, -0.777, -500,
];

export interface ProjectedProblem {
  n: number; // observations
  y: ArrayLike<number>;
  linear: readonly boolean[]; // per parameter: enters the model linearly
  model(p: readonly number[], i: number): number;
  gradient(p: readonly number[], i: number): number[]; // ∂model/∂p at observation i
}
export interface ProjectedFit {
  params: number[];
  mse: number;
}

/** The 31 start rows for `count` parameters: all 0, all 1, then the constant table's walk. */
export function startRows(count: number): number[][] {
  const k = START_CONSTANTS.length;
  return Array.from({ length: k }, (_, r) =>
    Array.from({ length: count }, (_, j) =>
      count > 1 && r < 2 ? r : START_CONSTANTS[((r * count + j) * 503) % k]
    )
  );
}

/** Gaussian elimination with partial pivoting; NaN entries when `a` is singular. */
function solve(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let pivot = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[pivot][c])) pivot = r;
    [m[c], m[pivot]] = [m[pivot], m[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}

/** Normal equations of the columns `cols` (each length n) against `v`. */
function normal(cols: number[][], v: ArrayLike<number>): { a: number[][]; b: number[] } {
  const k = cols.length,
    n = v.length;
  const a = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const b = new Array<number>(k).fill(0);
  for (let i = 0; i < n; i++) {
    for (let p = 0; p < k; p++) {
      b[p] += cols[p][i] * v[i];
      for (let q = 0; q < k; q++) a[p][q] += cols[p][i] * cols[q][i];
    }
  }
  return { a, b };
}

/** One LM run of at most `iterations` steps from `start`. */
export function projectedLm(
  problem: ProjectedProblem,
  start: readonly number[],
  iterations: number
): ProjectedFit {
  const { n, y, linear } = problem;
  const lin = linear.flatMap((l, j) => (l ? [j] : []));
  const non = linear.flatMap((l, j) => (l ? [] : [j]));
  const residual = (p: readonly number[]) =>
    Array.from({ length: n }, (_, i) => problem.model(p, i) - y[i]);
  const mse = (p: readonly number[]) => residual(p).reduce((s, r) => s + r * r, 0) / n;
  const columns = (p: readonly number[], which: number[]) => {
    const g = Array.from({ length: n }, (_, i) => problem.gradient(p, i));
    return which.map((j) => g.map((row) => row[j]));
  };
  // The linear parameters' least-squares correction at p.
  const relinearise = (p: readonly number[]): number[] => {
    if (lin.length === 0) return [...p];
    const { a, b } = normal(columns(p, lin), residual(p));
    const d = solve(a, b);
    const q = [...p];
    lin.forEach((j, k) => (q[j] -= d[k]));
    return q;
  };
  let p = relinearise(start),
    error = mse(p),
    damping = 1e-3,
    steps = 0,
    still = false;
  while (steps < iterations && !still && Number.isFinite(error)) {
    const r = residual(p);
    const jn = columns(p, non),
      jl = lin.length === 0 ? [] : columns(p, lin);
    const project = (v: number[]): number[] => {
      if (jl.length === 0) return v;
      const { a, b } = normal(jl, v);
      const c = solve(a, b);
      return v.map((x, i) => x - jl.reduce((s, col, k) => s + col[i] * c[k], 0));
    };
    const pr = project(r),
      pj = jn.map(project);
    const g = jn.map((col) => col.reduce((s, v, i) => s + v * pr[i], 0));
    const h = jn.map((col) => pj.map((q) => col.reduce((s, v, i) => s + v * q[i], 0)));
    let accepted = false;
    while (steps < iterations && !still && !accepted) {
      steps++;
      const damped = h.map((row, a) => row.map((v, b) => (a === b ? v + damping : v)));
      const step = solve(damped, g);
      let next = [...p];
      non.forEach((j, k) => (next[j] -= step[k]));
      still = next.every((v, j) => v === p[j]);
      next = relinearise(next);
      const e = mse(next);
      accepted = e < error;
      if (accepted) {
        p = next;
        error = e;
        damping *= 0.1;
      } else damping = Math.max(damping, 1e-64) * 2;
    }
  }
  return { params: p, mse: error };
}

/** The whole multi-start schedule, with `preferred` as the extra start. */
export function multiStartLm(
  problem: ProjectedProblem,
  preferred: readonly number[]
): ProjectedFit {
  const best = (rows: number[][], iterations: number, keep: number) =>
    rows
      .map((row) => ({ row, fit: projectedLm(problem, row, iterations) }))
      .sort((a, b) =>
        Number.isNaN(a.fit.mse) ? 1 : Number.isNaN(b.fit.mse) ? -1 : a.fit.mse - b.fit.mse
      )
      .slice(0, keep)
      .map(({ row }) => row);
  const five = best(startRows(problem.linear.length), 3, 5);
  const one = best(five, 60, 1);
  const searched = projectedLm(problem, one[0], 250);
  const fromPreferred = projectedLm(problem, preferred, 100);
  return Number.isFinite(fromPreferred.mse) && !(fromPreferred.mse > searched.mse)
    ? fromPreferred
    : searched;
}

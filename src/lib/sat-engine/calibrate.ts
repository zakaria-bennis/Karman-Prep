/*
 * Item calibration from student answers: marginal maximum likelihood with an EM algorithm
 * (Bock-Aitkin), with priors on every parameter (Bayes modal, as in BILOG-MG). Works on sparse
 * data: each student may have answered any subset of items, in any kind of Karman session.
 *
 * - Items marked `fixed` keep their parameters and anchor the scale (fixed-parameter
 *   calibration). New or pretest items calibrated alongside them land on the same scale.
 * - With no fixed items, the student population defines the scale: mean 0, SD 1.
 * - With fixed items, the population mean and SD are estimated too.
 */
import { D, normalGrid, pCorrect, type Grid, type ItemParams } from "./irt";

export type Answer = { person: string; item: string; correct: boolean };

export type CalibrationItem = {
  id: string;
  /** Starting values, and the centre of the prior (cold-start or previous calibration). */
  start: ItemParams;
  fixed?: boolean;
  /** Keep c at its starting value (grid-in questions). */
  fixC?: boolean;
};

export type Priors = {
  /** SD of log(a) around log(start.a). */
  logASd: number;
  /** SD of b around start.b. */
  bSd: number;
  /** Beta prior strength on c (alpha + beta), centred on start.c. */
  cStrength: number;
};

export const DEFAULT_PRIORS: Priors = { logASd: 0.4, bSd: 1.2, cStrength: 20 };

export type CalibratedItem = {
  id: string;
  params: ItemParams;
  responses: number;
  /** Approximate standard error of b. */
  bSe: number;
};

export type CalibrationResult = {
  items: Map<string, CalibratedItem>;
  population: { mean: number; sd: number };
  iterations: number;
};

type Counts = { n: Float64Array; r: Float64Array };

function eStep(
  answers: readonly Answer[],
  params: Map<string, ItemParams>,
  grid: Grid
): { counts: Map<string, Counts>; mean: number; sd: number } {
  const byPerson = new Map<string, Answer[]>();
  for (const a of answers) {
    if (!params.has(a.item)) continue;
    const list = byPerson.get(a.person);
    if (list) list.push(a);
    else byPerson.set(a.person, [a]);
  }
  const K = grid.nodes.length;
  const counts = new Map<string, Counts>();
  for (const id of params.keys())
    counts.set(id, { n: new Float64Array(K), r: new Float64Array(K) });
  // P at every node, once per item.
  const table = new Map<string, Float64Array>();
  for (const [id, p] of params)
    table.set(
      id,
      Float64Array.from(grid.nodes, (t) => pCorrect(p, t))
    );
  let m1 = 0;
  let m2 = 0;
  let persons = 0;
  const log = new Float64Array(K);
  for (const list of byPerson.values()) {
    for (let k = 0; k < K; k++) log[k] = Math.log(grid.weights[k] + 1e-300);
    for (const a of list) {
      const row = table.get(a.item)!;
      for (let k = 0; k < K; k++) {
        const p = Math.min(1 - 1e-10, Math.max(1e-10, row[k]));
        log[k] += a.correct ? Math.log(p) : Math.log(1 - p);
      }
    }
    let top = -Infinity;
    for (let k = 0; k < K; k++) top = Math.max(top, log[k]);
    let total = 0;
    const post = new Float64Array(K);
    for (let k = 0; k < K; k++) total += post[k] = Math.exp(log[k] - top);
    let mean = 0;
    let sq = 0;
    for (let k = 0; k < K; k++) {
      post[k] /= total;
      mean += post[k] * grid.nodes[k];
      sq += post[k] * grid.nodes[k] ** 2;
    }
    m1 += mean;
    m2 += sq;
    persons++;
    for (const a of list) {
      const c = counts.get(a.item)!;
      for (let k = 0; k < K; k++) {
        c.n[k] += post[k];
        if (a.correct) c.r[k] += post[k];
      }
    }
  }
  const mean = persons ? m1 / persons : 0;
  const sd = persons ? Math.sqrt(Math.max(0.05, m2 / persons - mean * mean)) : 1;
  return { counts, mean, sd };
}

/** Penalised log-likelihood of one item in (log a, b, logit c) and its gradient. */
function objective(
  x: readonly number[],
  counts: Counts,
  grid: Grid,
  start: ItemParams,
  priors: Priors,
  fixC: boolean
): { value: number; grad: number[] } {
  const a = Math.exp(x[0]);
  const b = x[1];
  const c = fixC ? start.c : 1 / (1 + Math.exp(-x[2]));
  let value = 0;
  const grad = [0, 0, 0];
  for (let k = 0; k < grid.nodes.length; k++) {
    const n = counts.n[k];
    if (n < 1e-9) continue;
    const r = counts.r[k];
    const z = D * a * (grid.nodes[k] - b);
    const L = 1 / (1 + Math.exp(-z));
    const P = Math.min(1 - 1e-10, Math.max(1e-10, c + (1 - c) * L));
    value += r * Math.log(P) + (n - r) * Math.log(1 - P);
    const dP = r / P - (n - r) / (1 - P);
    const slope = (1 - c) * L * (1 - L) * D;
    grad[0] += dP * slope * (grid.nodes[k] - b) * a;
    grad[1] += dP * -slope * a;
    if (!fixC) grad[2] += dP * (1 - L) * c * (1 - c);
  }
  // Priors: log a ~ N, b ~ N, c ~ Beta centred on the start.
  const la0 = Math.log(start.a);
  value -= (x[0] - la0) ** 2 / (2 * priors.logASd ** 2);
  grad[0] -= (x[0] - la0) / priors.logASd ** 2;
  value -= (b - start.b) ** 2 / (2 * priors.bSd ** 2);
  grad[1] -= (b - start.b) / priors.bSd ** 2;
  if (!fixC) {
    const alpha = Math.max(1.01, start.c * priors.cStrength);
    const beta = Math.max(1.01, (1 - start.c) * priors.cStrength);
    value += (alpha - 1) * Math.log(c) + (beta - 1) * Math.log(1 - c);
    grad[2] += (alpha - 1) * (1 - c) - (beta - 1) * c;
  }
  return { value, grad };
}

/** A few damped Newton steps (finite-difference Hessian), falling back to gradient ascent. */
function maximise(
  f: (x: number[]) => { value: number; grad: number[] },
  x0: number[],
  dims: number
) {
  let x = [...x0];
  let cur = f(x);
  for (let it = 0; it < 25; it++) {
    const h = 1e-4;
    const H = Array.from({ length: dims }, (_, i) => {
      const xp = [...x];
      xp[i] += h;
      const g = f(xp).grad;
      return Array.from({ length: dims }, (_, j) => (g[j] - cur.grad[j]) / h);
    });
    let step = solve(
      H,
      cur.grad.slice(0, dims).map((g) => -g)
    );
    if (!step || step.some((s) => !Number.isFinite(s)) || dot(step, cur.grad) <= 0)
      step = cur.grad.slice(0, dims).map((g) => 0.01 * g);
    let t = 1;
    let moved = false;
    while (t > 1e-4) {
      const trial = x.map((v, i) => (i < dims ? v + t * Math.max(-1, Math.min(1, step![i])) : v));
      const next = f(trial);
      if (next.value > cur.value) {
        x = trial;
        cur = next;
        moved = true;
        break;
      }
      t /= 2;
    }
    if (!moved || Math.hypot(...cur.grad.slice(0, dims)) < 1e-5) break;
  }
  return { x, hessianDiag: hessianDiag(f, x, dims) };
}

function hessianDiag(f: (x: number[]) => { grad: number[] }, x: number[], dims: number) {
  const g0 = f(x).grad;
  return Array.from({ length: dims }, (_, i) => {
    const xp = [...x];
    xp[i] += 1e-4;
    return (f(xp).grad[i] - g0[i]) / 1e-4;
  });
}

const dot = (p: number[], q: number[]) => p.reduce((s, v, i) => s + v * q[i], 0);

/** Solves H s = g for a small dense system (Gaussian elimination); null when singular. */
function solve(H: number[][], g: number[]): number[] | null {
  const n = g.length;
  const m = H.map((row, i) => [...row.slice(0, n), g[i]]);
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(m[r][i]) > Math.abs(m[p][i])) p = r;
    if (Math.abs(m[p][i]) < 1e-12) return null;
    [m[i], m[p]] = [m[p], m[i]];
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = m[r][i] / m[i][i];
      for (let c = i; c <= n; c++) m[r][c] -= f * m[i][c];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}

export function calibrate(
  items: readonly CalibrationItem[],
  answers: readonly Answer[],
  options: { iterations?: number; priors?: Priors; tolerance?: number } = {}
): CalibrationResult {
  const priors = options.priors ?? DEFAULT_PRIORS;
  const params = new Map(items.map((i) => [i.id, { ...i.start }]));
  const anchored = items.some((i) => i.fixed);
  let population = { mean: 0, sd: 1 };
  let grid = normalGrid(0, 1, -4.5, 4.5, 61);
  const responses = new Map<string, number>();
  for (const a of answers) responses.set(a.item, (responses.get(a.item) ?? 0) + 1);
  let iterations = 0;
  let bSe = new Map<string, number>();
  for (; iterations < (options.iterations ?? 60); iterations++) {
    const { counts, mean, sd } = eStep(answers, params, grid);
    let change = 0;
    bSe = new Map();
    for (const item of items) {
      if (item.fixed || !(responses.get(item.id) ?? 0)) continue;
      const p = params.get(item.id)!;
      const fixC = item.fixC ?? false;
      const dims = fixC ? 2 : 3;
      const x0 = [Math.log(p.a), p.b, Math.log(p.c / (1 - p.c))];
      const { x, hessianDiag: hd } = maximise(
        (x) => objective(x, counts.get(item.id)!, grid, item.start, priors, fixC),
        x0,
        dims
      );
      const next = {
        a: Math.exp(x[0]),
        b: x[1],
        c: fixC ? item.start.c : 1 / (1 + Math.exp(-x[2])),
      };
      change = Math.max(change, Math.abs(next.b - p.b), Math.abs(next.a - p.a));
      params.set(item.id, next);
      bSe.set(item.id, Math.sqrt(1 / Math.max(1e-6, -hd[1])));
    }
    if (anchored) {
      population = { mean, sd };
      grid = normalGrid(mean, sd, mean - 4.5 * sd, mean + 4.5 * sd, 61);
    }
    if (change < (options.tolerance ?? 1e-3)) {
      iterations++;
      break;
    }
  }
  return {
    items: new Map(
      items.map((i) => [
        i.id,
        {
          id: i.id,
          params: params.get(i.id)!,
          responses: responses.get(i.id) ?? 0,
          bSe: bSe.get(i.id) ?? Infinity,
        },
      ])
    ),
    population,
    iterations,
  };
}

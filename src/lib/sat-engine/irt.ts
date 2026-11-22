/*
 * Item response theory core for the SAT engine: the three-parameter logistic model (3PL), item
 * and test information, ability estimates (maximum likelihood for the final score, EAP for
 * routing, both as in College Board's Digital SAT Technical Manual), and the Lord-Wingersky
 * recursion for number-correct score distributions. Pure functions, no I/O.
 *
 * Ability (theta) is on a standard scale: about mean 0, SD 1 for the population that defines the
 * scale. Section scores (200-800) come from theta through `scale.ts`.
 */

/** Logistic scaling constant. The Digital SAT is calibrated with D = 1 (Technical Manual). */
export const D = 1;

export type ItemParams = {
  /** Discrimination: how sharply the item separates students just below and above `b`. */
  a: number;
  /** Difficulty: the theta where a student is halfway between the guessing floor and 1. */
  b: number;
  /** Lower asymptote: the chance a very weak student still gets it right (guessing). */
  c: number;
};

export type Response = { item: ItemParams; correct: boolean };

/** Chance of a right answer at `theta`. */
export function pCorrect(item: ItemParams, theta: number): number {
  return item.c + (1 - item.c) / (1 + Math.exp(-D * item.a * (theta - item.b)));
}

/** Fisher information an item gives at `theta` (3PL). */
export function itemInformation(item: ItemParams, theta: number): number {
  const p = pCorrect(item, theta);
  const q = 1 - p;
  if (p <= 0 || q <= 0) return 0;
  const ratio = (p - item.c) / (1 - item.c);
  return (D * item.a) ** 2 * (q / p) * ratio * ratio;
}

export function testInformation(items: readonly ItemParams[], theta: number): number {
  return items.reduce((sum, item) => sum + itemInformation(item, theta), 0);
}

/** Expected number right at `theta`: the test characteristic curve. */
export function expectedScore(items: readonly ItemParams[], theta: number): number {
  return items.reduce((sum, item) => sum + pCorrect(item, theta), 0);
}

export type Grid = { nodes: number[]; weights: number[] };

export type Estimate = { theta: number; se: number };

/** Equally spaced nodes from `low` to `high` with normal prior weights (mean, sd), summing to 1. */
export function normalGrid(mean = 0, sd = 1, low = -5, high = 5, count = 101): Grid {
  const nodes: number[] = [];
  const raw: number[] = [];
  for (let k = 0; k < count; k++) {
    const x = low + ((high - low) * k) / (count - 1);
    nodes.push(x);
    raw.push(Math.exp(-0.5 * ((x - mean) / sd) ** 2));
  }
  const total = raw.reduce((s, w) => s + w, 0);
  return { nodes, weights: raw.map((w) => w / total) };
}

export const STANDARD_GRID = normalGrid();

/** Flat prior on [-5, 5] with 101 nodes: what the Digital SAT uses for its routing EAP. */
export const UNIFORM_GRID: Grid = {
  nodes: STANDARD_GRID.nodes,
  weights: STANDARD_GRID.nodes.map(() => 1 / STANDARD_GRID.nodes.length),
};

/** Ability limits for the final score: all right maps to the top, all wrong to the bottom. */
export const THETA_MIN = -5;
export const THETA_MAX = 5;
/** Largest standard error reported (Technical Manual caps it at 1.75). */
export const SE_CAP = 1.75;

function logLikelihood(responses: readonly Response[], theta: number): number {
  let log = 0;
  for (const r of responses) {
    const p = Math.min(1 - 1e-12, Math.max(1e-12, pCorrect(r.item, theta)));
    log += r.correct ? Math.log(p) : Math.log(1 - p);
  }
  return log;
}

/**
 * Maximum-likelihood ability, the Digital SAT's final-score estimator. A grid search finds the
 * highest peak (3PL likelihoods can have more than one), then Newton steps refine it inside
 * [THETA_MIN, THETA_MAX]. All right or all wrong gives the limit. The standard error is
 * 1 / sqrt(test information), capped at SE_CAP.
 */
export function mle(responses: readonly Response[]): Estimate {
  const items = responses.map((r) => r.item);
  const seAt = (theta: number) =>
    Math.min(SE_CAP, 1 / Math.sqrt(Math.max(1e-9, testInformation(items, theta))));
  if (responses.length === 0) return { theta: 0, se: SE_CAP };
  if (responses.every((r) => r.correct)) return { theta: THETA_MAX, se: seAt(THETA_MAX) };
  if (responses.every((r) => !r.correct)) return { theta: THETA_MIN, se: seAt(THETA_MIN) };
  let theta = THETA_MIN;
  let best = -Infinity;
  for (let k = 0; k <= 200; k++) {
    const x = THETA_MIN + ((THETA_MAX - THETA_MIN) * k) / 200;
    const value = logLikelihood(responses, x);
    if (value > best) [best, theta] = [value, x];
  }
  for (let i = 0; i < 30; i++) {
    const h = 1e-4;
    const g = (logLikelihood(responses, theta + h) - logLikelihood(responses, theta - h)) / (2 * h);
    const g2 =
      (logLikelihood(responses, theta + h) -
        2 * logLikelihood(responses, theta) +
        logLikelihood(responses, theta - h)) /
      (h * h);
    if (!(g2 < 0)) break;
    const next = Math.min(THETA_MAX, Math.max(THETA_MIN, theta - g / g2));
    if (Math.abs(next - theta) < 1e-6) break;
    theta = next;
  }
  return { theta, se: seAt(theta) };
}

/** Posterior weights over the grid after the responses (log-space for stability). */
export function posterior(responses: readonly Response[], grid: Grid = STANDARD_GRID): number[] {
  const logs = grid.nodes.map((theta, k) => {
    let log = Math.log(grid.weights[k]);
    for (const r of responses) {
      const p = Math.min(1 - 1e-12, Math.max(1e-12, pCorrect(r.item, theta)));
      log += r.correct ? Math.log(p) : Math.log(1 - p);
    }
    return log;
  });
  const top = Math.max(...logs);
  const un = logs.map((l) => Math.exp(l - top));
  const total = un.reduce((s, w) => s + w, 0);
  return un.map((w) => w / total);
}

/** Expected a posteriori ability and its posterior SD. */
export function eap(responses: readonly Response[], grid: Grid = STANDARD_GRID): Estimate {
  const post = posterior(responses, grid);
  const mean = post.reduce((s, w, k) => s + w * grid.nodes[k], 0);
  const variance = post.reduce((s, w, k) => s + w * (grid.nodes[k] - mean) ** 2, 0);
  return { theta: mean, se: Math.sqrt(variance) };
}

/**
 * Lord-Wingersky: for each grid node, the probability of each number-right score 0..n. Row k is
 * the distribution at `grid.nodes[k]`.
 */
export function numberRightDistribution(
  items: readonly ItemParams[],
  grid: Grid = STANDARD_GRID
): number[][] {
  return grid.nodes.map((theta) => {
    let dist = [1];
    for (const item of items) {
      const p = pCorrect(item, theta);
      const next = new Array(dist.length + 1).fill(0);
      dist.forEach((w, s) => {
        next[s] += w * (1 - p);
        next[s + 1] += w * p;
      });
      dist = next;
    }
    return dist;
  });
}

/**
 * EAP for each number-right score (summed-score scoring): what a raw-score conversion table
 * implies when only the count right is known. Index = raw score.
 */
export function summedScoreEap(
  items: readonly ItemParams[],
  grid: Grid = STANDARD_GRID
): Estimate[] {
  const dist = numberRightDistribution(items, grid);
  return Array.from({ length: items.length + 1 }, (_, raw) => {
    const joint = grid.nodes.map((_, k) => grid.weights[k] * dist[k][raw]);
    const total = joint.reduce((s, w) => s + w, 0) || 1e-300;
    const mean = joint.reduce((s, w, k) => s + w * grid.nodes[k], 0) / total;
    const variance = joint.reduce((s, w, k) => s + w * (grid.nodes[k] - mean) ** 2, 0) / total;
    return { theta: mean, se: Math.sqrt(variance) };
  });
}

/** The theta where the expected number right equals `raw` (inverse test characteristic curve). */
export function thetaForExpectedScore(items: readonly ItemParams[], raw: number): number {
  let low = -6;
  let high = 6;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (expectedScore(items, mid) < raw) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

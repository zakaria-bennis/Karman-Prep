// The multi-start search (REGRESSION-10) for a typed regression fitted whole (list-fit.ts): systems
// and equations such as `[ab,a+b]\sim[6,5]`, where the five equal-valued starts of levenberg.ts sit
// on the symmetric line a = b and stall (live Desmos gives a = 3, b = 2, 2026-10-22). Parameters are
// taken as linear greedily, in order, while the model stays affine in all of them together, so
// `ab` searches b with a solved exactly, as Desmos's variable projection does. Gradients are the
// model's own derivatives when the caller has them (list-fit.ts differentiates the rows: live
// Desmos's `-n^4\sim264` is −6.31202×10^-5, which central differences miss in the third digit),
// else central differences. Pure TypeScript.

import { multiStartLm } from "./projected-lm";

export type IndexedModel = (p: Float64Array, i: number) => number;
/** ∂model/∂p at observation i, one entry per parameter. */
export type IndexedGradient = (p: Float64Array, i: number) => number[];

const TOLERANCE = 1e-9;
const BASES = [0.37, -1.91]; // other parameters' values for the affinity checks
// where the checked parameters are tried: far ones find a kink, so `\left|2n+7\right|+4\sim1` is
// searched (live Desmos −3.5, 2026-10-25), not solved as the line 2n + 11 from n = 1 (−5)
const SEEDS = [1.7, -2.3, -7.9, 13.1, -41.3];

/** Whether `model` is affine in the parameters `set` jointly, at two settings of the others. */
function affineIn(model: IndexedModel, n: number, k: number, set: number[]): boolean {
  for (const base of BASES) {
    const at = (values: Map<number, number>) => {
      const p = Float64Array.from({ length: k }, (_, j) => values.get(j) ?? base * (j + 1.3));
      return Array.from({ length: n }, (_, i) => model(p, i));
    };
    const f0 = at(new Map(set.map((j) => [j, 0])));
    const cols = set.map((j) => {
      const f = at(new Map(set.map((q) => [q, q === j ? 1 : 0])));
      return f.map((v, i) => v - f0[i]);
    });
    if (![...f0, ...cols.flat()].every(Number.isFinite)) return false;
    for (const seed of SEEDS) {
      const point = set.map((_, s) => seed * (s + 0.9));
      const got = at(new Map(set.map((j, s) => [j, point[s]])));
      for (let i = 0; i < n; i++) {
        const lin = f0[i] + cols.reduce((acc, col, s) => acc + col[i] * point[s], 0);
        if (!(Math.abs(got[i] - lin) <= TOLERANCE * Math.max(1, Math.abs(got[i]), Math.abs(lin))))
          return false;
      }
    }
  }
  return true;
}

/** The best parameters the multi-start search finds for y ≈ model, and their sum of squares. */
export function fitMultiStart(
  model: IndexedModel,
  y: ArrayLike<number>,
  k: number,
  derivative?: IndexedGradient,
  tie?: { relative: number; slack: number }
): { params: Float64Array; sse: number } {
  const n = y.length;
  const linearSet: number[] = [];
  for (let j = 0; j < k; j++) if (affineIn(model, n, k, [...linearSet, j])) linearSet.push(j);
  const value = (p: readonly number[], i: number) => model(Float64Array.from(p), i);
  const fit = multiStartLm(
    {
      n,
      y,
      linear: Array.from({ length: k }, (_, j) => linearSet.includes(j)),
      model: value,
      gradient: (p, i) =>
        derivative?.(Float64Array.from(p), i) ??
        p.map((v, j) => {
          const h = 6.06e-6 * Math.max(1, Math.abs(v));
          const up = [...p],
            down = [...p];
          up[j] += h;
          down[j] -= h;
          return (value(up, i) - value(down, i)) / (2 * h);
        }),
    },
    new Array<number>(k).fill(1),
    tie && { relative: tie.relative, slack: tie.slack / n }
  );
  return { params: Float64Array.from(fit.params), sse: fit.mse * n };
}

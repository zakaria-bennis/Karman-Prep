// Exact least squares for a model affine in its parameters whose values are exact fractions
// (MATHS-CORE-1 through RT-17), as live Desmos solves them (captured 2026-10-25): the normal
// equations in unbounded fractions over the columns the double solve kept, so
// `\frac{a+5}{3}\sim\frac{a+5}{13}` gives a = −5 exactly (a + 5 shows 0, not −5.3×10^-15),
// `\left[-9a+b,9a+b\right]\sim\left[17,17\right]` gives a = 0 and y₁ ~ m·x₁ + b on (0.18, 9),
// (0.26, 13), (0.38, 19) gives b = 0. Pure TypeScript: no DOM.

import type { Fraction } from "../core/lib/rational";

interface Q {
  n: bigint;
  d: bigint; // > 0
}
// BigInt() calls, not literals: the build targets ES2017.
const [ZERO, ONE] = [BigInt(0), BigInt(1)];
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
/** Observations past this many are solved in doubles only. */
export const MAX_EXACT_ROWS = 2000;

const gcd = (a: bigint, b: bigint): bigint => {
  a = a < ZERO ? -a : a;
  while (b !== ZERO) [a, b] = [b, a % b];
  return a === ZERO ? ONE : a;
};
const q = (n: bigint, d: bigint): Q => {
  if (d < ZERO) [n, d] = [-n, -d];
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
};
const of = (f: Fraction): Q => ({ n: BigInt(f.n), d: BigInt(f.d) });
const add = (a: Q, b: Q) => q(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a: Q, b: Q) => q(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a: Q, b: Q) => q(a.n * b.n, a.d * b.d);
const div = (a: Q, b: Q) => q(a.n * b.d, a.d * b.n);
const isZero = (a: Q) => a.n === ZERO;

/** The double nearest a/b within an ulp or two, for any size of parts. */
function toDouble(a: Q): number {
  const bits = (v: bigint) => (v < ZERO ? -v : v).toString(2).length;
  const shift = Math.max(0, Math.max(bits(a.n), bits(a.d)) - 1000);
  if (shift === 0) return Number(a.n) / Number(a.d);
  const s = BigInt(shift);
  return Number(a.n >> s) / Number(a.d >> s);
}

export interface ExactSolution {
  values: number[];
  fractions: (Fraction | null)[]; // each value as a Fraction when its parts fit 2^53 − 1
}

/**
 * min ‖A·p − y‖ exactly, A given by the offset `f0` and the columns `cols` (each p_j's change to
 * the model), over the parameters in `pivots` (the others 0); null when a system the double solve
 * thought regular is singular.
 */
export function solveExact(
  f0: readonly Fraction[],
  cols: readonly (readonly Fraction[])[],
  y: readonly Fraction[],
  pivots: readonly number[]
): ExactSolution | null {
  const k = cols.length,
    m = pivots.length;
  const a = pivots.map((j) => cols[j].map(of));
  const r = y.map((v, i) => sub(of(v), of(f0[i])));
  // The normal equations over the pivot columns, augmented by Aᵀr.
  const rows = a.map((cj) => [
    ...a.map((ck) => cj.reduce((s, v, i) => add(s, mul(v, ck[i])), { n: ZERO, d: ONE })),
    cj.reduce((s, v, i) => add(s, mul(v, r[i])), { n: ZERO, d: ONE }),
  ]);
  for (let c = 0; c < m; c++) {
    const pivot = rows.findIndex((row, i) => i >= c && !isZero(row[c]));
    if (pivot < 0) return null;
    [rows[c], rows[pivot]] = [rows[pivot], rows[c]];
    for (let i = 0; i < m; i++) {
      if (i === c || isZero(rows[i][c])) continue;
      const f = div(rows[i][c], rows[c][c]);
      for (let j = c; j <= m; j++) rows[i][j] = sub(rows[i][j], mul(f, rows[c][j]));
    }
  }
  const values = new Array<number>(k).fill(0);
  const fractions: (Fraction | null)[] = new Array<Fraction | null>(k).fill({ n: 0, d: 1 });
  pivots.forEach((j, c) => {
    const v = div(rows[c][m], rows[c][c]);
    values[j] = toDouble(v) + 0;
    const fits = v.d <= MAX_SAFE && v.n <= MAX_SAFE && -v.n <= MAX_SAFE;
    fractions[j] = fits ? { n: Number(v.n) + 0, d: Number(v.d) } : null;
  });
  return values.every(Number.isFinite) ? { values, fractions } : null;
}

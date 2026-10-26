// The chi-square distribution on plain numbers, for the chi-square tests (FN-56, FN-57) and the
// null-distribution plot of an inference row (FN-59): the density, both tails and the quantile.
// The tails are the regularized incomplete gamma functions P(a, x) and Q(a, x) with a = k/2 and
// x = χ²/2, by the series below a + 1 and the Legendre continued fraction above it, each
// carrying full relative precision on its own side. NaN means undefined. Pure TypeScript: no DOM
// (AR-44).

import { logAbsGamma } from "./gamma";

const EPSILON = 1e-16;
const MAX_TERMS = 1000;
const TINY = 1e-300;

/** xᵃ·e^{−x}/Γ(a), the factor both expansions share, in logs so a large a does not overflow. */
function front(a: number, x: number): number {
  return Math.exp(a * Math.log(x) - x - logAbsGamma(a).log);
}

/** P(a, x) by its series Σ xⁿ/(a·(a+1)·…·(a+n)), for x < a + 1. */
function lowerSeries(a: number, x: number): number {
  let term = 1 / a,
    sum = term;
  for (let n = 1; n < MAX_TERMS; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * EPSILON) break;
  }
  return sum * front(a, x);
}

/** Q(a, x) by the modified Lentz method on its continued fraction, for x ≥ a + 1. */
function upperFraction(a: number, x: number): number {
  let b = x + 1 - a,
    c = 1 / TINY,
    d = 1 / b,
    f = d;
  for (let n = 1; n < MAX_TERMS; n++) {
    const an = -n * (n - a);
    b += 2;
    d = an * d + b;
    d = Math.abs(d) < TINY ? TINY : d;
    c = b + an / c;
    c = Math.abs(c) < TINY ? TINY : c;
    d = 1 / d;
    const delta = d * c;
    f *= delta;
    if (Math.abs(delta - 1) < EPSILON) break;
  }
  return f * front(a, x);
}

/** P(χ² ≤ x) and P(χ² > x) for k > 0 degrees of freedom, each to full relative precision. */
function tails(x: number, k: number): [number, number] {
  if (!(k > 0) || Number.isNaN(x)) return [NaN, NaN];
  if (x <= 0) return [0, 1];
  if (x === Infinity) return [1, 0];
  const a = k / 2,
    h = x / 2;
  if (h < a + 1) {
    const lower = lowerSeries(a, h);
    return [lower, 1 - lower];
  }
  const upper = upperFraction(a, h);
  return [1 - upper, upper];
}

/** P(χ² ≤ x) with k degrees of freedom. */
export function chiSquareCdf(x: number, k: number): number {
  return tails(x, k)[0];
}

/** P(χ² > x) with k degrees of freedom, the p-value of a chi-square score. */
export function chiSquareUpper(x: number, k: number): number {
  return tails(x, k)[1];
}

/** The chi-square density with k degrees of freedom: 0 below 0, ∞ at 0 when k < 2. */
export function chiSquarePdf(x: number, k: number): number {
  if (!(k > 0) || Number.isNaN(x)) return NaN;
  if (x < 0) return 0;
  if (x === 0) return k < 2 ? Infinity : k === 2 ? 0.5 : 0;
  const a = k / 2;
  return Math.exp((a - 1) * Math.log(x) - x / 2 - a * Math.LN2 - logAbsGamma(a).log);
}

/** The x with P(χ² ≤ x) = p, by bisection on the cdf's monotone tails; NaN outside [0, 1). */
export function chiSquareQuantile(p: number, k: number): number {
  if (!(k > 0) || !(p >= 0 && p < 1)) return NaN;
  if (p === 0) return 0;
  let hi = Math.max(1, k);
  while (chiSquareCdf(hi, k) < p) hi *= 2;
  let lo = 0;
  for (let n = 0; n < 200 && hi - lo > 1e-14 * hi; n++) {
    const mid = (lo + hi) / 2;
    if (chiSquareCdf(mid, k) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

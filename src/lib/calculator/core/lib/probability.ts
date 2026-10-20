// The error function and the normal, Student t and binomial distributions on plain numbers, as
// Desmos computes them (FN-45 to FN-51 and the legacy names; function catalogue, distributions,
// captured live 2026-10-19). Number level: NaN means undefined, and ±Infinity is a quantile at p = 0 or 1 that
// the value layer shows as undefined. Pure TypeScript: no DOM (AR-44).

import type { Complex } from "../eval/values";
import type { Rule } from "./builtins";
import { gamma, logAbsGamma } from "./gamma";
import { nCr } from "./number-theory";

const TWO_OVER_SQRT_PI = 2 / Math.sqrt(Math.PI);
const ONE_OVER_SQRT_PI = 1 / Math.sqrt(Math.PI);
const ONE_OVER_SQRT_TWO_PI = 1 / Math.sqrt(2 * Math.PI);
const SQRT_TWO_PI = Math.sqrt(2 * Math.PI);
const EPSILON = 1e-17;
const MAX_TERMS = 1000;
/** erfc switches from 1 − erf to its continued fraction here, where 1 − erf starts losing digits. */
const FRACTION_FROM = 2;

/**
 * erf(x) for |x| < FRACTION_FROM by the series e^{−x²}·Σ 2ⁿx^{2n+1}/(1·3·…·(2n+1)), whose terms are
 * all positive, so no digits cancel; beyond, 1 − erfc(x).
 */
export function erf(x: number): number {
  if (Number.isNaN(x)) return NaN;
  if (x === 0) return x;
  const a = Math.abs(x);
  if (a >= FRACTION_FROM) return Math.sign(x) * (1 - erfcFraction(a));
  return Math.sign(x) * erfSeries(a);
}

function erfSeries(a: number): number {
  const x2 = a * a;
  let term = a,
    sum = a;
  for (let n = 0; n < MAX_TERMS; n++) {
    term *= (2 * x2) / (2 * n + 3);
    sum += term;
    if (term <= EPSILON * sum) break;
  }
  return TWO_OVER_SQRT_PI * Math.exp(-x2) * sum;
}

/** erfc(x) = 1 − erf(x), with full relative precision in the right tail. */
export function erfc(x: number): number {
  if (Number.isNaN(x)) return NaN;
  if (x >= FRACTION_FROM) return erfcFraction(x);
  if (x <= -FRACTION_FROM) return 2 - erfcFraction(-x);
  return 1 - erf(x);
}

/**
 * erfc(x) for x ≥ FRACTION_FROM: e^{−x²}/√π times the continued fraction
 * 1/(x + (1/2)/(x + 1/(x + (3/2)/(x + …)))), evaluated by the modified Lentz method.
 */
function erfcFraction(x: number): number {
  if (x === Infinity) return 0;
  const tiny = 1e-300;
  let f = x,
    c = x,
    d = 0;
  for (let k = 1; k < MAX_TERMS; k++) {
    const a = k / 2;
    d = x + a * d;
    d = d === 0 ? tiny : d;
    c = x + a / c;
    c = c === 0 ? tiny : c;
    d = 1 / d;
    const delta = c * d;
    f *= delta;
    if (Math.abs(delta - 1) <= EPSILON) break;
  }
  return (ONE_OVER_SQRT_PI * Math.exp(-x * x)) / f;
}

/** Φ(z), the standard normal cdf, with full relative precision in the left tail. */
export function normalCdf(z: number): number {
  return 0.5 * erfc(-z / Math.SQRT2);
}

/** 1 − Φ(z), with full relative precision in the right tail. */
function normalUpper(z: number): number {
  return 0.5 * erfc(z / Math.SQRT2);
}

/** The probability between two standard scores, in either order: Φ(hi) − Φ(lo), tail-safe. */
export function normalBetween(a: number, b: number): number {
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  if (Number.isNaN(lo) || Number.isNaN(hi)) return NaN;
  return lo > 0 ? normalUpper(lo) - normalUpper(hi) : normalCdf(hi) - normalCdf(lo);
}

/** The standard normal density. */
export function normalPdf(z: number): number {
  return ONE_OVER_SQRT_TWO_PI * Math.exp(-(z * z) / 2);
}

// Acklam's rational approximation to the normal quantile, a start that Halley steps refine.
const A = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239]; // prettier-ignore
const B = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572]; // prettier-ignore
const C = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]; // prettier-ignore
const D = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
const P_LOW = 0.02425;

/** Acklam's start for Φ⁻¹(p), 0 < p < 1, good to about 1e-9. */
function quantileStart(p: number): number {
  if (p < P_LOW) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) /
      ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1)
    );
  }
  const q = p - 0.5,
    r = q * q;
  return (
    ((((((A[0] * r + A[1]) * r + A[2]) * r + A[3]) * r + A[4]) * r + A[5]) * q) /
    (((((B[0] * r + B[1]) * r + B[2]) * r + B[3]) * r + B[4]) * r + 1)
  );
}

/**
 * Φ⁻¹(p), Desmos's invNorm: −∞ at 0, +∞ at 1, NaN outside [0, 1], exactly 0 at ½. The upper half
 * is solved as −Φ⁻¹(1 − p), 1 − p being exact there, so the left tail's relative precision holds
 * for p near 1 (`invNorm(0.9999999999)` = 6.361340889697422).
 */
export function normalQuantile(p: number): number {
  if (!(p >= 0 && p <= 1)) return NaN;
  if (p === 0) return -Infinity;
  if (p === 1) return Infinity;
  if (p === 0.5) return 0;
  if (p > 0.5) return -lowerQuantile(1 - p);
  return lowerQuantile(p);
}

/** Φ⁻¹(p) for 0 < p < ½ by Halley steps on Φ from Acklam's start. */
function lowerQuantile(p: number): number {
  let x = quantileStart(p);
  for (let k = 0; k < 4; k++) {
    const e = normalCdf(x) - p,
      u = e * SQRT_TWO_PI * Math.exp((x * x) / 2),
      step = u / (1 + (x * u) / 2);
    x -= step;
    if (Math.abs(step) <= 1e-16 * Math.abs(x)) break;
  }
  return x;
}

/** ln B(a, b) = ln Γ(a) + ln Γ(b) − ln Γ(a + b), for a, b > 0. */
function logBeta(a: number, b: number): number {
  return logAbsGamma(a).log + logAbsGamma(b).log - logAbsGamma(a + b).log;
}

/**
 * The regularized incomplete beta I_x(a, b), with `y` = 1 − x given separately so that x near 1
 * keeps its digits; the continued fraction runs on whichever side converges.
 */
function incompleteBeta(x: number, y: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (y <= 0) return 1;
  if (x > (a + 1) / (a + b + 2)) return 1 - incompleteBeta(y, x, b, a);
  const front = Math.exp(a * Math.log(x) + b * Math.log(y) - logBeta(a, b)) / a;
  return front * betaFraction(x, a, b);
}

/** The incomplete beta's continued fraction by the modified Lentz method. */
function betaFraction(x: number, a: number, b: number): number {
  const tiny = 1e-300;
  let c = 1,
    d = 1 - ((a + b) * x) / (a + 1);
  d = 1 / (Math.abs(d) < tiny ? tiny : d);
  let f = d;
  for (let m = 1; m < MAX_TERMS; m++) {
    const even = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + even * d;
    d = 1 / (Math.abs(d) < tiny ? tiny : d);
    c = 1 + even / c;
    c = Math.abs(c) < tiny ? tiny : c;
    f *= c * d;
    const odd = -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + odd * d;
    d = 1 / (Math.abs(d) < tiny ? tiny : d);
    c = 1 + odd / c;
    c = Math.abs(c) < tiny ? tiny : c;
    const delta = c * d;
    f *= delta;
    if (Math.abs(delta - 1) <= EPSILON) break;
  }
  return f;
}

/** The density of Student's t with ν > 0 degrees of freedom at the standard score t. */
export function tPdf(t: number, nu: number): number {
  if (!(nu > 0) || Number.isNaN(t)) return NaN;
  if (nu === Infinity) return normalPdf(t);
  const half = (nu + 1) / 2;
  const scale =
    nu < 300
      ? gamma(half) / (Math.sqrt(nu * Math.PI) * gamma(nu / 2))
      : Math.exp(logAbsGamma(half).log - logAbsGamma(nu / 2).log) / Math.sqrt(nu * Math.PI);
  return scale * Math.pow(1 + (t * t) / nu, -half);
}

/** P(T > t) for t ≥ 0: ½·I_{ν/(ν+t²)}(ν/2, ½). */
function tUpper(t: number, nu: number): number {
  const t2 = t * t;
  return 0.5 * incompleteBeta(nu / (nu + t2), t2 / (nu + t2), nu / 2, 0.5);
}

/** The cdf of Student's t with ν > 0 degrees of freedom at the standard score t. */
export function tCdf(t: number, nu: number): number {
  if (!(nu > 0) || Number.isNaN(t)) return NaN;
  if (nu === Infinity) return normalCdf(t);
  if (t === Infinity) return 1;
  if (t === -Infinity) return 0;
  return t > 0 ? 1 - tUpper(t, nu) : tUpper(-t, nu);
}

/**
 * The quantile of Student's t: ±∞ at 0 and 1, NaN outside [0, 1] or for ν ≤ 0. The tail
 * probability min(p, 1 − p) is solved on [0, ∞) by Newton steps kept inside a shrinking bracket.
 */
export function tQuantile(p: number, nu: number): number {
  if (!(nu > 0) || !(p >= 0 && p <= 1)) return NaN;
  if (nu === Infinity) return normalQuantile(p);
  if (p === 0) return -Infinity;
  if (p === 1) return Infinity;
  if (p === 0.5) return 0;
  const tail = Math.min(p, 1 - p);
  let lo = 0,
    hi = Math.max(1, -normalQuantile(tail));
  while (tUpper(hi, nu) > tail) {
    lo = hi;
    hi *= 2;
    if (!Number.isFinite(hi)) return p < 0.5 ? -Infinity : Infinity;
  }
  let t = (lo + hi) / 2;
  for (let k = 0; k < 200; k++) {
    const e = tUpper(t, nu) - tail;
    if (e > 0) lo = t;
    else hi = t;
    const newton = t + e / tPdf(t, nu);
    const next = newton > lo && newton < hi ? newton : (lo + hi) / 2;
    if (Math.abs(next - t) <= 1e-16 * t || hi - lo <= 1e-16 * hi) {
      t = next;
      break;
    }
    t = next;
  }
  return p < 0.5 ? -t : t;
}

/** A binomial's trial count as Desmos reads it: rounded half up, and 0 below 0. */
export function binomialTrials(n: number): number {
  return Math.max(0, Math.round(n));
}

/** Whether p is a usable success probability; outside [0, 1] every probability is 0. */
const validProbability = (p: number) => p >= 0 && p <= 1;

/** P(X = k) for a whole k of a binomial with `n` (already rounded) trials. */
function binomialMass(k: number, n: number, p: number): number {
  if (k < 0 || k > n) return 0;
  return nCr(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

/** The binomial pdf at x, rounded half up to a whole number (`pdf(5.5)` is pdf(6)). */
export function binomialPdf(x: number, n: number, p: number): number {
  if ([x, n, p].some(Number.isNaN)) return NaN;
  if (!validProbability(p)) return 0;
  return binomialMass(Math.round(x), binomialTrials(n), p);
}

/**
 * P(lo ≤ X ≤ hi) for a binomial, the bounds in either order: the whole numbers from ⌈lo⌉ to ⌊hi⌋,
 * exactly 1 when they cover every outcome.
 */
export function binomialBetween(a: number, b: number, n: number, p: number): number {
  if ([a, b, n, p].some(Number.isNaN)) return NaN;
  if (!validProbability(p)) return 0;
  const trials = binomialTrials(n),
    from = Math.max(0, Math.ceil(Math.min(a, b))),
    to = Math.min(trials, Math.floor(Math.max(a, b)));
  if (from > to) return 0;
  if (from === 0 && to === trials) return 1;
  let sum = 0;
  for (let k = from; k <= to; k++) sum += binomialMass(k, trials, p);
  return sum;
}

/** P(X ≤ x) for a binomial: the whole numbers up to ⌊x⌋. */
export function binomialCdf(x: number, n: number, p: number): number {
  return binomialBetween(-Infinity, x, n, p);
}

/**
 * The smallest whole k whose cdf reaches p: 0 at p = 0, the trial count at p = 1, NaN outside
 * [0, 1] or for a probability outside [0, 1].
 */
export function binomialQuantile(q: number, n: number, p: number): number {
  if (!(q >= 0 && q <= 1) || !validProbability(p) || Number.isNaN(n)) return NaN;
  const trials = binomialTrials(n);
  if (q === 1) return trials;
  let sum = 0;
  for (let k = 0; k < trials; k++) {
    sum += binomialMass(k, trials, p);
    if (sum >= q) return k;
  }
  return trials;
}

/** A normal distribution's spread as Desmos reads it: |σ|, and NaN for σ = 0 (FN-45). */
export function normalSpread(sigma: number): number {
  return sigma === 0 ? NaN : Math.abs(sigma);
}

const NAN: Complex = Object.freeze({ re: NaN, im: NaN });

/** A real-only rule in no angle unit: a complex argument is undefined. */
function realRule(real: (args: readonly number[]) => number): Rule {
  return { angle: "none", extendsToComplex: false, real, complex: () => NAN };
}

/**
 * erf and the hidden legacy names only pasted latex reaches, each in Desmos's slot
 * order with its defaults: normalcdf(lo, hi, μ = 0, σ = 1), normalpdf(x, μ = 0, σ = 1),
 * binomcdf(lo, hi, n, p = ½) (so `binomcdf(10,0.5,5)` is the bounds 10 and 0.5 with 5 trials),
 * binompdf(x, n, p = ½) and invNorm(p).
 */
export const PROBABILITY_RULES: readonly (readonly [string, Rule])[] = [
  ["erf", realRule(([x]) => erf(x))],
  [
    "normalcdf",
    realRule(([lo, hi, mu = 0, sigma = 1]) => {
      const s = normalSpread(sigma);
      return normalBetween((lo - mu) / s, (hi - mu) / s);
    }),
  ],
  [
    "normalpdf",
    realRule(([x, mu = 0, sigma = 1]) => {
      const s = normalSpread(sigma);
      return normalPdf((x - mu) / s) / s;
    }),
  ],
  ["binomcdf", realRule(([lo, hi, n, p = 0.5]) => binomialBetween(lo, hi, n, p))],
  ["binompdf", realRule(([x, n, p = 0.5]) => binomialPdf(x, n, p))],
  ["invNorm", realRule(([p]) => normalQuantile(p))],
];

// The error function and the normal, Student t and binomial distributions on plain numbers, as
// Desmos computes them (FN-45 to FN-51 and the legacy names; function catalogue, distributions,
// captured live 2026-10-19). Number level: NaN means undefined, and ±Infinity is a quantile at p = 0 or 1 that
// the value layer shows as undefined. Pure TypeScript: no DOM (AR-44).

import type { Complex } from "../eval/values";
import type { Rule } from "./builtins";
import { gamma, logAbsGamma } from "./gamma";

const TWO_OVER_SQRT_PI = 2 / Math.sqrt(Math.PI);
const ONE_OVER_SQRT_PI = 1 / Math.sqrt(Math.PI);
const ONE_OVER_SQRT_TWO_PI = 1 / Math.sqrt(2 * Math.PI);
const SQRT_TWO_PI = Math.sqrt(2 * Math.PI);
const LN_SQRT_TWO_PI = Math.log(SQRT_TWO_PI);
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

/**
 * Loader's Stirling error δ(x) = ln Γ(x + 1) − (x + ½)·ln x + x − ln √(2π), for x > 0: by its
 * asymptotic series from 15 on, where five terms are exact to 2e-16, and from ln Γ below.
 */
function stirlingError(x: number): number {
  if (x >= 15) {
    const r = 1 / x,
      r2 = r * r;
    return r * (1 / 12 - r2 * (1 / 360 - r2 * (1 / 1260 - r2 * (1 / 1680 - r2 / 1188))));
  }
  return logAbsGamma(x + 1).log - (x + 0.5) * Math.log(x) + x - LN_SQRT_TWO_PI;
}

/**
 * Loader's deviance x·ln(x/m) + m − x for x, m > 0, with `d` = x − m passed in when the caller
 * knows it better than x − m: near x = m by the series in v = d/(x + m), whose terms are all
 * positive, so the small result keeps its digits.
 */
function deviance(x: number, m: number, d = x - m): number {
  if (Math.abs(d) < 0.1 * (x + m)) {
    const v = d / (x + m),
      v2 = v * v;
    let sum = d * v,
      term = 2 * x * v;
    for (let j = 1; j < 100; j++) {
      term *= v2;
      const next = sum + term / (2 * j + 1);
      if (next === sum) break;
      sum = next;
    }
    return sum;
  }
  return x * Math.log(x / m) + m - x;
}

/**
 * xᵃ·yᵇ/B(a, b) for a, b > 0 and x + y = 1, in Loader's saddle point form: Stirling errors and
 * deviances in place of ln Γ, which would cancel every digit for large a or b (ν = 10¹⁴ in a t
 * cdf). n·x − a is taken from the smaller of x and y, which carries the digits.
 */
function betaFront(x: number, y: number, a: number, b: number): number {
  const n = a + b,
    d = x <= y ? n * x - a : b - n * y;
  const log =
    stirlingError(n) -
    stirlingError(a) -
    stirlingError(b) -
    deviance(a, n * x, -d) -
    deviance(b, n * y, d);
  return Math.exp(log) * Math.sqrt((a * b) / (2 * Math.PI * n));
}

/**
 * The regularized incomplete beta I_x(a, b), with `y` = 1 − x given separately so that x near 1
 * keeps its digits; the continued fraction runs on whichever side converges.
 */
function incompleteBeta(x: number, y: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (y <= 0) return 1;
  if (x > (a + 1) / (a + b + 2)) return 1 - incompleteBeta(y, x, b, a);
  return (betaFront(x, y, a, b) * betaFraction(x, a, b)) / a;
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

/**
 * Γ((ν + 1)/2)/(√(νπ)·Γ(ν/2)), the t density at 0: from Γ below 300, and past it from Stirling
 * errors, as ln Γ's difference would lose its digits (`tdist(10^{14}).pdf(0)`).
 */
function tPeak(nu: number): number {
  if (nu < 300) return gamma((nu + 1) / 2) / (Math.sqrt(nu * Math.PI) * gamma(nu / 2));
  const z = nu / 2,
    log = z * Math.log1p(1 / (2 * z)) - 0.5 + stirlingError(z + 0.5) - stirlingError(z);
  return Math.exp(log) / SQRT_TWO_PI;
}

/** The density of Student's t with ν > 0 degrees of freedom at the standard score t. */
export function tPdf(t: number, nu: number): number {
  if (!(nu > 0) || Number.isNaN(t)) return NaN;
  if (nu === Infinity) return normalPdf(t);
  return tPeak(nu) * Math.exp(-((nu + 1) / 2) * Math.log1p((t * t) / nu));
}

/** Past this many degrees of freedom the t cdf near its centre comes from tNormalTail. */
const LARGE_NU = 1000;

/**
 * P(T > t) for t ≥ 0: ½·I_{ν/(ν+t²)}(ν/2, ½), except for ν past LARGE_NU with ln(1 + t²/ν) ≤ 1,
 * where that continued fraction cancels away its digits (x is within 1/ν of 1) and tNormalTail
 * takes over.
 */
function tUpper(t: number, nu: number): number {
  const t2 = t * t;
  if (nu > LARGE_NU && Math.log1p(t2 / nu) <= 1) return tNormalTail(t, nu);
  return 0.5 * incompleteBeta(nu / (nu + t2), t2 / (nu + t2), nu / 2, 0.5);
}

/**
 * P(T > t) for t ≥ 0 and large ν through the normal score w = √(ν·ln(1 + t²/ν)), which maps the t
 * density onto e^{−w²/2}·c·K(w²/ν) with c the density at 0 and K(q) = √(q/(1 − e^{−q})): the tail
 * is Φ(−w) plus the integral from w to ∞ of e^{−u²/2}·(c·K(u²/ν) − 1/√(2π)), a correction of
 * order 1/ν that Gauss–Legendre nodes give to far more digits than it needs.
 */
function tNormalTail(t: number, nu: number): number {
  const w = Math.sqrt(nu * Math.log1p((t * t) / nu)),
    c = tPeak(nu),
    span = Math.sqrt(w * w + 83) - w; // e^{−(w·u + u²/2)} is below 1e-18 past it
  const { nodes, weights } = legendre();
  let correction = 0;
  for (let k = 0; k < nodes.length; k++) {
    const u = w + ((nodes[k] + 1) / 2) * span,
      q = (u * u) / nu,
      shape = q === 0 ? 1 : Math.sqrt(q / -Math.expm1(-q));
    correction += weights[k] * Math.exp((-u * u) / 2) * (c * shape - ONE_OVER_SQRT_TWO_PI);
  }
  return normalUpper(w) + (correction * span) / 2;
}

let LEGENDRE: { nodes: number[]; weights: number[] } | null = null;
const LEGENDRE_POINTS = 40;

/** The 40-point Gauss–Legendre nodes and weights on [−1, 1], by Newton steps on P₄₀. */
function legendre(): { nodes: number[]; weights: number[] } {
  if (LEGENDRE !== null) return LEGENDRE;
  const n = LEGENDRE_POINTS,
    nodes: number[] = [],
    weights: number[] = [];
  for (let i = 1; i <= n; i++) {
    let x = Math.cos((Math.PI * (i - 0.25)) / (n + 0.5)),
      slope = 1;
    for (let step = 0; step < 100; step++) {
      let p0 = 1,
        p1 = x;
      for (let k = 2; k <= n; k++) [p0, p1] = [p1, ((2 * k - 1) * x * p1 - (k - 1) * p0) / k];
      slope = (n * (x * p1 - p0)) / (x * x - 1);
      const dx = p1 / slope;
      x -= dx;
      if (Math.abs(dx) <= 1e-16) break;
    }
    nodes.push(x);
    weights.push(2 / ((1 - x * x) * slope * slope));
  }
  LEGENDRE = { nodes, weights };
  return LEGENDRE;
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
 * Desmos's tcdf(lo, hi, ν, location, scale), the bounds in either order: NaN for ν ≤ 0 or a
 * location or scale that is not finite, a point mass at the location for scale 0 (1 when the
 * bounds hold it, else 0), and otherwise the t cdf's difference at the standard scores, taken
 * from the upper tail when both are positive.
 */
export function tBetween(a: number, b: number, nu: number, loc: number, scale: number): number {
  const lo = Math.min(a, b),
    hi = Math.max(a, b);
  if (!(nu > 0) || !Number.isFinite(loc) || !Number.isFinite(scale)) return NaN;
  if (scale === 0) return lo <= loc && loc <= hi ? 1 : 0;
  const s = Math.abs(scale),
    low = (lo - loc) / s,
    high = (hi - loc) / s;
  if (low === -Infinity) return tCdf(high, nu);
  return low > 0 ? tCdf(-low, nu) - tCdf(-high, nu) : tCdf(high, nu) - tCdf(low, nu);
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

/**
 * A binomial's trial count as Desmos reads it: rounded half up and 0 below 0, and NaN when it is
 * infinite.
 */
export function binomialTrials(n: number): number {
  const trials = Math.max(0, Math.round(n));
  return trials === Infinity ? NaN : trials;
}

/** A success probability as Desmos's binompdf and binomcdf read it: clamped into [0, 1]. */
const clampProbability = (p: number) => Math.max(0, Math.min(1, p));

/**
 * P(X = k) for a whole k of a binomial with `n` whole trials and 0 ≤ p ≤ 1, by Loader's saddle
 * point form, which neither overflows nor underflows on the way (`binomialdist(2000).pdf(1000)`).
 */
function binomialMass(k: number, n: number, p: number): number {
  if (k < 0 || k > n) return 0;
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  if (k === 0) return Math.exp(n * Math.log1p(-p));
  if (k === n) return Math.pow(p, n);
  const log =
    stirlingError(n) -
    stirlingError(k) -
    stirlingError(n - k) -
    deviance(k, n * p) -
    deviance(n - k, n * (1 - p), n * p - k);
  return Math.exp(log) * Math.sqrt(n / (2 * Math.PI * k * (n - k)));
}

/** Desmos's binompdf: P(X = x) with x rounded half up to a whole number (`pdf(5.5)` is pdf(6)). */
export function binomialPdf(x: number, n: number, p: number): number {
  if ([x, n, p].some(Number.isNaN)) return NaN;
  return binomialMass(Math.round(x), binomialTrials(n), clampProbability(p));
}

/**
 * The most terms a binomial cdf sums. Its terms fall below the sum's last digit about 8.6
 * standard deviations from where it starts, so this covers n·p·(1 − p) up to about 10¹⁰; past
 * that the cdf is NaN rather than a sum the worker's watchdog would stop. Past 2⁵³ trials the
 * whole numbers are no longer one apart, so the cdf is NaN there too (`binomialdist(10^{300})`).
 */
const MAX_BINOMIAL_TERMS = 1_000_000;

/**
 * P(X ≤ k) for a whole k, as Desmos sums it: from the mass at k down, each term by the ratio of
 * neighbouring masses, until a term no longer changes the sum; from the complement's side when k
 * is past the mode, so the terms always shrink.
 */
function binomialLower(k: number, n: number, p: number): number {
  if (k >= n) return 1;
  if (k < 0) return 0;
  if (n > Number.MAX_SAFE_INTEGER) return NaN;
  return k < Math.floor((n + 1) * p) ? lowerTail(k, n, p) : 1 - lowerTail(n - k - 1, n, 1 - p);
}

function lowerTail(k: number, n: number, p: number): number {
  const ratio = (1 - p) / p;
  let term = binomialMass(k, n, p),
    sum = term;
  for (let j = k, terms = 1; j > 0; j--, terms++) {
    if (terms > MAX_BINOMIAL_TERMS) return NaN;
    term *= (j / (n - j + 1)) * ratio;
    if (sum + term === sum) break;
    sum += term;
  }
  return sum;
}

/**
 * Desmos's binomcdf: P(lo ≤ X ≤ hi), the bounds in either order, over the whole numbers from ⌈lo⌉
 * to ⌊hi⌋, as the difference of two cdfs.
 */
export function binomialBetween(a: number, b: number, n: number, p: number): number {
  if ([a, b, n, p].some(Number.isNaN)) return NaN;
  const trials = binomialTrials(n),
    q = clampProbability(p),
    from = Math.ceil(Math.min(a, b)),
    to = Math.floor(Math.max(a, b));
  if (Number.isNaN(trials)) return NaN;
  const upper = binomialLower(to, trials, q);
  return from === -Infinity ? upper : upper - binomialLower(from - 1, trials, q);
}

/** P(X ≤ x) for a binomial: the whole numbers up to ⌊x⌋. */
export function binomialCdf(x: number, n: number, p: number): number {
  return binomialBetween(-Infinity, x, n, p);
}

/**
 * Desmos's invBinom: the smallest whole k whose cdf reaches q, by bisection on the cdf; 0 at
 * q = 0, the trial count at q = 1, NaN for q or p outside [0, 1] (p is not clamped here).
 */
export function binomialQuantile(q: number, n: number, p: number): number {
  const trials = binomialTrials(n);
  if (!(q >= 0 && q <= 1) || !(p >= 0 && p <= 1) || Number.isNaN(trials)) return NaN;
  if (q === 0 || trials === 0 || p === 0) return 0;
  if (q === 1 || p === 1) return trials;
  let lo = -1,
    hi = trials;
  for (let mid = Math.floor(lo + (hi - lo) / 2); lo < mid && mid < hi; ) {
    const reached = binomialLower(mid, trials, p);
    if (Number.isNaN(reached)) return NaN;
    if (reached < q) lo = mid;
    else hi = mid;
    mid = Math.floor(lo + (hi - lo) / 2);
  }
  return hi;
}

/**
 * Desmos's normalcdf(lo, hi, μ, σ), the bounds in either order: NaN for a σ that is not finite or
 * a NaN μ, a point mass at μ for σ = 0 (1 when the bounds hold it, else 0).
 */
export function normalCdfBetween(a: number, b: number, mu: number, sigma: number): number {
  const lo = Math.min(a, b),
    hi = Math.max(a, b);
  if (!Number.isFinite(sigma) || Number.isNaN(mu)) return NaN;
  if (sigma === 0) return lo <= mu && mu <= hi ? 1 : 0;
  const s = Math.abs(sigma);
  return normalBetween((lo - mu) / s, (hi - mu) / s);
}

/** Desmos's normalpdf(x, μ, σ): NaN at σ = 0, 0 for an infinite σ. */
export function normalDensity(x: number, mu: number, sigma: number): number {
  const s = Math.abs(sigma);
  return normalPdf((x - mu) / s) / s;
}

/** Desmos's tpdf at x for a t with location and scale: the standard density over |scale|. */
export function tDensity(x: number, nu: number, loc: number, scale: number): number {
  const s = Math.abs(scale);
  return tPdf((x - loc) / s, nu) / s;
}

const NAN: Complex = Object.freeze({ re: NaN, im: NaN });

/** A real-only rule in no angle unit: a complex argument is undefined. */
function realRule(real: (args: readonly number[]) => number): Rule {
  return { angle: "none", extendsToComplex: false, real, complex: () => NAN };
}

/**
 * erf and the hidden legacy names only pasted latex reaches, each in Desmos's slot order with its
 * defaults: normalcdf(lo, hi, μ = 0, σ = 1), normalpdf(x, μ = 0, σ = 1), binomcdf(lo, hi, n,
 * p = ½) (so `binomcdf(10,0.5,5)` is the bounds 10 and 0.5 with 5 trials), binompdf(x, n, p = ½),
 * invNorm(p), tpdf(x, ν), tcdf(lo, hi, ν, location, scale), invT(p, ν) and invBinom(q, n, p).
 */
export const PROBABILITY_RULES: readonly (readonly [string, Rule])[] = [
  ["erf", realRule(([x]) => erf(x))],
  ["normalcdf", realRule(([lo, hi, mu = 0, sigma = 1]) => normalCdfBetween(lo, hi, mu, sigma))],
  ["normalpdf", realRule(([x, mu = 0, sigma = 1]) => normalDensity(x, mu, sigma))],
  ["binomcdf", realRule(([lo, hi, n, p = 0.5]) => binomialBetween(lo, hi, n, p))],
  ["binompdf", realRule(([x, n, p = 0.5]) => binomialPdf(x, n, p))],
  ["invNorm", realRule(([p]) => normalQuantile(p))],
  ["tpdf", realRule(([x, nu]) => tPdf(x, nu))],
  ["tcdf", realRule(([lo, hi, nu, loc, scale]) => tBetween(lo, hi, nu, loc, scale))],
  ["invT", realRule(([p, nu]) => tQuantile(p, nu))],
  ["invBinom", realRule(([q, n, p]) => binomialQuantile(q, n, p))],
];

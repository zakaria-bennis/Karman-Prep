// Rounding and number theory built-ins (FN-76 to FN-78, plus abs), following the behaviour
// captured from Desmos on 2026-10-19 (appendix F decision 2). Scalar rules only: lists broadcast
// over them element by element once FN-3 ships. A complex argument is undefined, except for abs,
// which gives the modulus. Every result is returned as `v + 0`, so -0 never leaves this file. Pure
// TypeScript: no DOM (AR-44).

import type { Complex } from "../eval/values";
import type { Rule } from "./builtins";
import { gamma, reciprocalGamma } from "./gamma";

/** Integer r up to this uses the exact multiplicative product for any n; past it, Γ. */
const PRODUCT_LIMIT = 1000;
const NAN: Complex = Object.freeze({ re: NaN, im: NaN });

/**
 * FN-77: round(x) is Math.round (halves toward +∞, so round(−2.5) = −2); round(x, n) is
 * Math.round(x·10^n)/10^n with n rounded to a whole number and allowed to be negative
 * (round(1234, −2) = 1200, round(2.5, 1.5) = 2.5). A scaled value already past 2^52 is whole, so
 * x is returned as it is.
 */
export function roundTo(x: number, n = 0): number {
  const digits = Math.round(n);
  if (digits === 0) return Math.round(x) + 0;
  if (digits > 0) {
    const scale = 10 ** digits;
    const scaled = x * scale;
    if (!(Math.abs(scaled) < 2 ** 52)) return x;
    return Math.round(scaled) / scale + 0;
  }
  const scale = 10 ** -digits;
  if (!Number.isFinite(scale)) return 0;
  return Math.round(x / scale) * scale + 0;
}

/** FN-76: a − b·⌊a/b⌋ through the exact fmod, so the result has the sign of b; mod(a, 0) is undefined. */
export function mod(a: number, b: number): number {
  if (b === 0) return NaN;
  const r = a % b;
  return (r !== 0 && r < 0 !== b < 0 ? r + b : r) + 0;
}

/**
 * The falling product n(n−1)…(n−r+1), divided by r! when `choose` is set. Dividing at each step
 * keeps every partial binomial a whole number, so integer results below 2^53 are exact. The loop
 * stops early once the product is 0 or not finite.
 */
function fallingProduct(n: number, r: number, choose: boolean): number {
  let result = 1;
  for (let k = 0; k < r && result !== 0 && Number.isFinite(result); k++) {
    result = choose ? (result * (n - k)) / (k + 1) : result * (n - k);
  }
  return result;
}

/** Whether nCr or nPr can use the exact product: a whole r ≥ 0, short or with a whole n ≥ 0. */
function productApplies(n: number, r: number): boolean {
  return Number.isInteger(r) && r >= 0 && (r <= PRODUCT_LIMIT || (Number.isInteger(n) && n >= 0));
}

/**
 * FN-78: nCr(n, r) = Γ(n+1)/(Γ(r+1)·Γ(n−r+1)), where a pole in the denominator gives 0
 * (nCr(5, −1) = 0, nCr(2, 5) = 0). A whole r ≥ 0 uses the generalised binomial product, which is
 * exact below 2^53 and defined for every n (nCr(−1, 2) = 1).
 */
export function nCr(n: number, r: number): number {
  if (productApplies(n, r)) {
    const k = Number.isInteger(n) && n >= 0 ? (r > n ? -1 : Math.min(r, n - r)) : r;
    return k < 0 ? 0 : fallingProduct(n, k, true) + 0;
  }
  return gamma(n + 1) * reciprocalGamma(r + 1) * reciprocalGamma(n - r + 1) + 0;
}

/** FN-78: nPr(n, r) = Γ(n+1)/Γ(n−r+1); a whole r ≥ 0 uses the falling product (nPr(5, 6) = 0). */
export function nPr(n: number, r: number): number {
  if (productApplies(n, r)) return fallingProduct(n, r, false) + 0;
  return gamma(n + 1) * reciprocalGamma(n - r + 1) + 0;
}

/** A one-argument rule whose complex values are undefined. */
function realOnly(fn: (x: number) => number): Rule {
  return {
    angle: "none",
    extendsToComplex: false,
    real: (args) => fn(args[0]),
    complex: () => NAN,
  };
}

/** A two-argument rule whose complex values are undefined. */
function realOnly2(fn: (a: number, b: number) => number): Rule {
  return {
    angle: "none",
    extendsToComplex: false,
    real: (args) => fn(args[0], args[1]),
    complex: () => NAN,
  };
}

export const NUMBER_THEORY_RULES: readonly (readonly [string, Rule])[] = [
  ["floor", realOnly((x) => Math.floor(x) + 0)],
  ["ceil", realOnly((x) => Math.ceil(x) + 0)],
  [
    "round",
    {
      angle: "none",
      extendsToComplex: false,
      real: (args) => roundTo(args[0], args.length === 2 ? args[1] : 0),
      complex: () => NAN,
    },
  ],
  ["sign", realOnly((x) => Math.sign(x) + 0)], // sign(0) = 0
  ["mod", realOnly2(mod)],
  ["nCr", realOnly2(nCr)],
  ["nPr", realOnly2(nPr)],
  [
    "abs",
    {
      angle: "none",
      extendsToComplex: false,
      real: (args) => Math.abs(args[0]),
      complex: (args) => ({ re: Math.hypot(args[0].re, args[0].im), im: 0 }),
    },
  ],
];

// Rounding and number theory built-ins (FN-76 to FN-78, plus abs), following the behaviour
// captured from Desmos on 2026-10-19 (appendix F decision 2). Scalar rules only: lists broadcast
// over them element by element once FN-3 ships. A complex argument is undefined, except for abs,
// which gives the modulus. Every result is returned as `v + 0`, so -0 never leaves this file. Pure
// TypeScript: no DOM (AR-44).

import type { Complex } from "../eval/values";
import type { Rule } from "./builtins";
import { gamma, logAbsGamma, reciprocalGamma } from "./gamma";

/**
 * A whole r up to this uses the exact multiplicative product for any n. Past it, a whole n uses the
 * product (shortened by symmetry or reflection) and any other n uses Γ in log form, since the
 * product need not reach 0 or overflow and so would not stop early.
 */
const PRODUCT_LIMIT = 1000;
const NAN: Complex = Object.freeze({ re: NaN, im: NaN });

/**
 * Desmos's complex rules for the rounding functions (captured 2026-10-20): floor is McDonnell's
 * complex floor (the floors of the parts, moved up one in the larger fractional part when the
 * fractional parts add to 1 or more: floor(1.5+2.7i) = 1+3i, floor(1.7+2.5i) = 2+2i) and ceil(z)
 * is −floor(−z); round acts on each part; sign is z/|z|; and mod(z, n) is the remainder
 * z − n·floor(z/n) (`\operatorname{mod}(5+7i,3)` = −1+i, `\operatorname{mod}(i,2)` = i).
 */
function gaussianFloor(z: Complex): Complex {
  const [a, b] = [Math.floor(z.re), Math.floor(z.im)];
  const [x, y] = [z.re - a, z.im - b];
  if (x + y < 1) return { re: a + 0, im: b + 0 };
  return x >= y ? { re: a + 1, im: b + 0 } : { re: a + 0, im: b + 1 };
}
function negate(z: Complex): Complex {
  return { re: -z.re + 0, im: -z.im + 0 };
}
function unit(z: Complex): Complex {
  const r = Math.hypot(z.re, z.im);
  return r === 0 ? { re: 0, im: 0 } : { re: z.re / r, im: z.im / r };
}
function complexMod(args: readonly Complex[]): Complex {
  const [z, n] = args;
  const d = n.re * n.re + n.im * n.im;
  if (d === 0) return NAN;
  const q = { re: (z.re * n.re + z.im * n.im) / d, im: (z.im * n.re - z.re * n.im) / d };
  const k = gaussianFloor(q);
  return { re: z.re - (n.re * k.re - n.im * k.im), im: z.im - (n.re * k.im + n.im * k.re) };
}

/**
 * FN-77: round(x) is Math.round (halves toward +∞, so round(−2.5) = −2). round(x, n) rounds n to a
 * whole number (it may be negative: round(1234, −2) = 1200, round(2.5, 1.5) = 2.5) and shifts x by
 * n decimal places through its decimal text, as Desmos does, so round(1.005, 2) = 1.01 although
 * 1.005·100 is 100.4999… in binary. As in Desmos, the result is undefined when 10^n or the shifted
 * value is not finite or 10^n underflows to 0 (round(5, 308), round(5, −400)); a shifted value
 * already past 2^52 is whole, so x is returned as it is (round(5, 300) = 5).
 */
export function roundTo(x: number, n = 0): number {
  const digits = Math.round(n);
  if (digits === 0) return Math.round(x) + 0;
  const scale = 10 ** digits;
  const scaled = shiftDecimal(x, digits);
  if (scale === 0 || !Number.isFinite(scale) || !Number.isFinite(scaled)) return NaN;
  if (Math.abs(scaled) >= 2 ** 52) return x;
  return shiftDecimal(Math.round(scaled), -digits) + 0;
}

/** `v`·10^k computed on the decimal text of `v` ("1.005" → "1.005e2" = 100.5), not in binary. */
function shiftDecimal(v: number, k: number): number {
  const [mantissa, exponent = "0"] = String(v).split("e");
  return Number(`${mantissa}e${Number(exponent) + k}`);
}

/** A quotient this close to a whole number (relative to its size) is that whole number in mod. */
const QUOTIENT_SNAP = 8 * Number.EPSILON;

/**
 * FN-76: a − b·⌊a/b⌋ with the sign of b; mod(a, 0) is undefined. Whole a and b use the exact fmod
 * (mod(10^17, 3) = 1). Otherwise, as in Desmos, a quotient a/b within rounding error of a whole
 * number gives 0, so a decimal divisor leaves no binary remainder: mod(1, 0.1), mod(0.3, 0.1) and
 * mod(5.1, 1.7) are 0 where the fmod gives 0.0999…, 0.0999… and 1.6999…. Past 2^52 every quotient
 * is whole, so the fmod is kept.
 */
export function mod(a: number, b: number): number {
  if (b === 0) return NaN;
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    const q = a / b;
    if (Math.abs(q) < 2 ** 52 && Math.abs(q - Math.round(q)) <= QUOTIENT_SNAP * Math.abs(q)) {
      return 0;
    }
  }
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

/**
 * FN-78: nCr(n, r) = Γ(n+1)/(Γ(r+1)·Γ(n−r+1)), where a pole in the denominator gives 0
 * (nCr(5, −1) = 0, nCr(2, 5) = 0). A whole r ≥ 0 uses the generalised binomial product, which is
 * exact below 2^53 and defined for every n (nCr(−1, 2) = 1); a whole negative n first takes the
 * reflection nCr(n, r) = (−1)^r·nCr(r − n − 1, r), so the product stays short for any r
 * (nCr(−2, 1001) = −1002). A whole negative n with a whole negative r takes the symmetric form
 * (nCr(−1, −1) = 1). Past PRODUCT_LIMIT, any other n uses Γ in log form, which does not overflow.
 */
export function nCr(n: number, r: number): number {
  const wholeN = Number.isInteger(n);
  if (wholeN && n < 0 && Number.isInteger(r) && r < 0) {
    // Both whole and negative: Γ(n+1) has a pole, so take Desmos's limit through the symmetry
    // nCr(n, r) = nCr(n, n − r), which is 0 for r > n (nCr(−2, −1) = 0, nCr(−3, −5) = 6).
    return r > n ? 0 : nCr(n, n - r);
  }
  if (Number.isInteger(r) && r >= 0) {
    if (wholeN && n < 0) return (r % 2 === 0 ? 1 : -1) * nCr(r - n - 1, r) + 0;
    if (wholeN) return r > n ? 0 : fallingProduct(n, Math.min(r, n - r), true) + 0;
    if (r <= PRODUCT_LIMIT) return fallingProduct(n, r, true) + 0;
    return logGammaRatio(n, r);
  }
  return gamma(n + 1) * reciprocalGamma(r + 1) * reciprocalGamma(n - r + 1) + 0;
}

/** Γ(n+1)/(Γ(r+1)·Γ(n−r+1)) through ln|Γ|, for arguments off the poles. */
function logGammaRatio(n: number, r: number): number {
  const top = logAbsGamma(n + 1);
  const left = logAbsGamma(r + 1);
  const right = logAbsGamma(n - r + 1);
  const v = top.sign * left.sign * right.sign * Math.exp(top.log - left.log - right.log);
  return Number.isFinite(v) ? v + 0 : NaN;
}

/**
 * FN-78: nPr(n, r) = Γ(n+1)/Γ(n−r+1); a whole r ≥ 0 uses the falling product (nPr(5, 6) = 0),
 * which for any r stops at a 0 factor or overflows within a few hundred factors. When
 * both Γ(n+1) and Γ(n−r+1) are at poles, n+1 = −a and n−r+1 = −b, Desmos takes the limit, the
 * ratio of the residues (−1)^a/a! and (−1)^b/b!: (−1)^(a−b)·b!/a! (nPr(−2, −1) = −1,
 * nPr(−4, −1) = −1/3). A pole in the numerator alone stays undefined (nPr(−1, −1)).
 */
export function nPr(n: number, r: number): number {
  if (Number.isInteger(r) && r >= 0) return fallingProduct(n, r, false) + 0;
  const top = n + 1;
  const bottom = n - r + 1;
  if (Number.isInteger(top) && top <= 0 && Number.isInteger(bottom) && bottom <= 0) {
    return residueRatio(-top, -bottom) + 0;
  }
  return gamma(n + 1) * reciprocalGamma(n - r + 1) + 0;
}

/** (−1)^(a−b)·b!/a! for whole a, b ≥ 0, as a running product that stops at 0 or ∞. */
function residueRatio(a: number, b: number): number {
  let ratio = (a - b) % 2 === 0 ? 1 : -1;
  for (let k = Math.min(a, b) + 1; k <= Math.max(a, b); k++) {
    ratio = a > b ? ratio / k : ratio * k;
    if (ratio === 0 || !Number.isFinite(ratio)) break;
  }
  return ratio;
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
  ["floor", { ...realOnly((x) => Math.floor(x) + 0), complex: (args) => gaussianFloor(args[0]) }],
  [
    "ceil",
    {
      ...realOnly((x) => Math.ceil(x) + 0),
      complex: (args) => negate(gaussianFloor(negate(args[0]))),
    },
  ],
  [
    "round",
    {
      angle: "none",
      extendsToComplex: false,
      real: (args) => roundTo(args[0], args.length === 2 ? args[1] : 0),
      // Desmos rounds each part of a complex number (captured 2026-10-20)
      complex: (args) =>
        args.length === 2 ? NAN : { re: roundTo(args[0].re, 0), im: roundTo(args[0].im, 0) },
    },
  ],
  ["sign", { ...realOnly((x) => Math.sign(x) + 0), complex: (args) => unit(args[0]) }], // sign(0) = 0
  ["mod", { ...realOnly2(mod), complex: complexMod }],
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

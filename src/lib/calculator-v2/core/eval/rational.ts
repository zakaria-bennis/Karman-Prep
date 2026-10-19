// Exact rational constants (MATHS-CORE-1, maths-core spec section 3; appendix F decision 2).
// Decimal and integer literals are n/d with |n| and d up to 2^53−1, and stay exact through +, −, ×,
// ÷, integer powers, exact roots, sqrt, mod and abs. Whenever a result cannot be held exactly, the
// operation returns the plain double instead, and a double never turns back into a rational except
// through fromDouble. Standalone for now: nothing in the evaluator calls it yet. Pure TypeScript: no
// DOM (AR-44).
//
// The double fallback of +, −, × and ÷ matches the reference calculator: it is the cross-multiplied
// numerator over the denominator, formed as doubles and divided once, not the sum or product of the
// two operands' rounded doubles. Deliberate deviation (spec section 3): every intermediate product
// must fit, not only the final numerator and denominator. The reference keeps a rational when big
// cross-products cancel down to a numerator within 2^53−1, but that rational is built from rounded
// intermediates and so is not exact; this module returns the double instead.

import { realPow } from "./real-pow";
import { mod as doubleMod } from "../lib/number-theory";

/** A reduced fraction: integers with gcd(|n|, d) = 1, d > 0, |n| and d ≤ MAX_EXACT, never -0. */
export interface ExactRational {
  n: number;
  d: number;
}

/** A constant on the exact path: a rational when exact, otherwise its double value. */
export type ExactNumber = ExactRational | number;

/** The largest integer a double holds together with all its neighbours: 2^53−1. */
export const MAX_EXACT = Number.MAX_SAFE_INTEGER;

const DECIMAL = /^(-)?(\d*)(?:\.(\d*))?$/;

export function isExactRational(x: ExactNumber): x is ExactRational {
  return typeof x === "object";
}

/** The double value of `x`: n/d, correctly rounded, for a rational. */
export function toNumber(x: ExactNumber): number {
  return isExactRational(x) ? x.n / x.d : x;
}

/** An integer-valued double re-enters the exact path as x/1; any other double stays as it is. */
export function fromDouble(x: number): ExactNumber {
  return Number.isInteger(x) ? rational(x, 1) : x;
}

/** Whether `v` is an integer within ±MAX_EXACT, so arithmetic on it is still exact. */
function fits(v: number): boolean {
  return Number.isInteger(v) && Math.abs(v) <= MAX_EXACT;
}

/** The greatest common divisor of two integers, always ≥ 0; gcd(0, b) is |b|. */
function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

/**
 * n/d in lowest terms with d > 0. A non-integer or oversized part, or d = 0, gives the double n/d
 * (so 1/0 is Infinity and 0/0 is NaN).
 */
export function rational(n: number, d: number): ExactNumber {
  if (!fits(n) || !fits(d) || d === 0) return n / d;
  const divisor = gcd(n, d);
  const sign = d < 0 ? -1 : 1;
  return { n: (sign * n) / divisor + 0, d: Math.abs(d) / divisor };
}

/**
 * MATHS-CORE-1: a decimal string such as "1.005" or "-.5". With integer part I and fraction digits F
 * (trailing zeros dropped, k of them), the value is (I·10^k + F)/10^k, reduced. A numerator or
 * denominator past MAX_EXACT gives parseFloat's double; a string that is not a decimal gives NaN.
 */
export function exactParse(text: string): ExactNumber {
  const match = DECIMAL.exec(text);
  if (match === null) return NaN;
  const [, minus, whole = "", fraction = ""] = match;
  if (whole === "" && fraction === "") return NaN;
  const digits = fraction.replace(/0+$/, "");
  const denominator = 10 ** digits.length;
  const numerator = Number(whole || "0") * denominator + Number(digits || "0");
  if (numerator > MAX_EXACT || denominator > MAX_EXACT) return parseFloat(text);
  return rational(minus ? -numerator : numerator, denominator);
}

/** The exact result built from integer parts, or the double fallback when any part is too big. */
function exactOr(
  parts: readonly number[],
  build: () => ExactNumber,
  fallback: () => number
): ExactNumber {
  return parts.every(fits) ? build() : fallback();
}

export function neg(a: ExactNumber): ExactNumber {
  return isExactRational(a) ? { n: -a.n + 0, d: a.d } : -a;
}

export function abs(a: ExactNumber): ExactNumber {
  return isExactRational(a) ? { n: Math.abs(a.n), d: a.d } : Math.abs(a);
}

/** a + b over the least common denominator; every product and the sum must fit, else doubles. */
export function add(a: ExactNumber, b: ExactNumber): ExactNumber {
  if (!isExactRational(a) || !isExactRational(b)) return toNumber(a) + toNumber(b);
  const g = gcd(a.d, b.d);
  const left = a.n * (b.d / g);
  const right = b.n * (a.d / g);
  const d = (a.d / g) * b.d;
  return exactOr(
    [left, right, left + right, d],
    () => rational(left + right, d),
    () => (left + right) / d
  );
}

export function sub(a: ExactNumber, b: ExactNumber): ExactNumber {
  if (!isExactRational(a) || !isExactRational(b)) return toNumber(a) - toNumber(b);
  return add(a, neg(b));
}

/** a·b, cross-reducing each numerator against the other denominator first. */
export function mul(a: ExactNumber, b: ExactNumber): ExactNumber {
  if (!isExactRational(a) || !isExactRational(b)) return toNumber(a) * toNumber(b);
  const g1 = gcd(a.n, b.d); // ≥ 1, since b.d ≥ 1
  const g2 = gcd(b.n, a.d);
  const n = (a.n / g1) * (b.n / g2);
  const d = (a.d / g2) * (b.d / g1);
  return exactOr(
    [n, d],
    () => rational(n, d),
    () => n / d
  );
}

/** 1/a; an exact zero gives the double 1/0. */
function reciprocal(a: ExactRational): ExactNumber {
  if (a.n === 0) return a.d / a.n;
  return { n: a.n < 0 ? -a.d : a.d, d: Math.abs(a.n) };
}

/** a/b; dividing by an exact zero gives the double quotient (±Infinity, or NaN for 0/0). */
export function div(a: ExactNumber, b: ExactNumber): ExactNumber {
  if (!isExactRational(a) || !isExactRational(b) || b.n === 0) return toNumber(a) / toNumber(b);
  return mul(a, reciprocal(b));
}

/** The exact q-th root of the integer v ≥ 0, or null when v is not a perfect q-th power. */
function exactRoot(v: number, q: number): number | null {
  const root = Math.round(v ** (1 / q));
  return root ** q === v ? root : null;
}

/** The double power, with V2's real-mode rule for a negative base (NM-10, realPow). */
function doublePow(a: ExactNumber, b: ExactNumber): number {
  const exponent = isExactRational(b) ? { p: b.n, q: b.d } : null;
  return realPow(toNumber(a), toNumber(b), exponent);
}

/**
 * a^b. An integer b is exact whenever n^|b| and d^|b| fit (a negative b inverts a first). For
 * b = p/q in lowest terms the result is exact only when |n| and d both have exact q-th roots, and a
 * negative base needs an odd q. Anything else is the double power.
 */
export function pow(a: ExactNumber, b: ExactNumber): ExactNumber {
  if (!isExactRational(a) || !isExactRational(b)) return doublePow(a, b);
  const base = b.n < 0 ? reciprocal(a) : a;
  if (!isExactRational(base)) return doublePow(a, b);
  const p = Math.abs(b.n);
  if (b.d === 1) {
    return exactOr(
      [base.n ** p, base.d ** p],
      () => rational(base.n ** p, base.d ** p),
      () => doublePow(a, b)
    );
  }
  const negative = base.n < 0;
  if (negative && b.d % 2 === 0) return doublePow(a, b);
  const top = exactRoot(Math.abs(base.n), b.d);
  const bottom = exactRoot(base.d, b.d);
  if (top === null || bottom === null) return doublePow(a, b);
  const signedTop = negative ? -top : top;
  return exactOr(
    [signedTop ** p, bottom ** p],
    () => rational(signedTop ** p, bottom ** p),
    () => doublePow(a, b)
  );
}

/** √a, exact when the numerator and denominator are both perfect squares. */
export function sqrt(a: ExactNumber): ExactNumber {
  if (!isExactRational(a) || a.n < 0) return Math.sqrt(toNumber(a));
  const top = exactRoot(a.n, 2);
  const bottom = exactRoot(a.d, 2);
  return top === null || bottom === null ? Math.sqrt(toNumber(a)) : rational(top, bottom);
}

/** ⌊n/d⌋ for integers n and d > 0, computed without rounding n/d to a double. */
function floorDiv(n: number, d: number): number {
  const remainder = ((n % d) + d) % d;
  return (n - remainder) / d;
}

/**
 * a − b·⌊a/b⌋, so the result has the sign of b (FN-76). ⌊a/b⌋ is taken on integers when a/b is a
 * rational, and from the double quotient otherwise; either way a − b·⌊a/b⌋ is still tried exactly.
 * mod(a, 0) and an inexact final step give the double mod.
 */
export function mod(a: ExactNumber, b: ExactNumber): ExactNumber {
  const fallback = () => doubleMod(toNumber(a), toNumber(b));
  if (!isExactRational(a) || !isExactRational(b) || b.n === 0) return fallback();
  const quotient = div(a, b);
  const floor = isExactRational(quotient) ? floorDiv(quotient.n, quotient.d) : Math.floor(quotient);
  const multiple = fromDouble(floor);
  if (!isExactRational(multiple)) return fallback();
  const result = sub(a, mul(b, multiple));
  return isExactRational(result) ? result : fallback();
}

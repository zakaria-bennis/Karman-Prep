// Real powers and roots (NM-10, NM-11, NM-13, NM-14; FN-12 to FN-14). Number-level functions:
// NaN means undefined, and the Value layer (ops.ts) maps it to UNDEFINED. Pure TypeScript: no DOM
// (AR-44).

import type { Node } from "../latex/ast";

export type Rational = { p: number; q: number };

/** NM-10: a negative base has a real power only when the exponent is p/q with odd q up to this. */
const MAX_ODD_DENOMINATOR = 99;
/** NM-10: a value matches p/q when it lies within this many units in the last place of it. */
const RATIONAL_ULPS = 4;

const bits = new DataView(new ArrayBuffer(8));

/**
 * The spacing of doubles at `v`, read from the exponent field: 2^(e − 1075) for a biased exponent
 * e ≥ 1, and Number.MIN_VALUE for 0 and subnormals. Non-finite input gives NaN, so a comparison
 * against a multiple of it never matches.
 */
export function ulp(v: number): number {
  if (!Number.isFinite(v)) return NaN;
  bits.setFloat64(0, v);
  const exponent = (bits.getUint16(0) >> 4) & 0x7ff;
  return exponent === 0 ? Number.MIN_VALUE : 2 ** (exponent - 1075);
}

/** NM-10's value path: the smallest q ≤ 99 with |b − p/q| ≤ 4·ulp(b), p = round(b·q), else null. */
export function rationalFromValue(b: number): Rational | null {
  if (!Number.isFinite(b)) return null;
  const tolerance = RATIONAL_ULPS * ulp(b);
  for (let q = 1; q <= MAX_ODD_DENOMINATOR; q++) {
    const p = Math.round(b * q);
    if (Math.abs(b - p / q) <= tolerance) return { p: p + 0, q }; // + 0 turns -0 into 0
  }
  return null;
}

/**
 * NM-10's tree path: an exponent written as a fraction of integer literals, under any number of
 * `neg` wrappers (each flips the sign) and with either literal itself negated, in lowest terms with
 * q > 0. Any other shape, a zero denominator or a reduced q above 99 gives null.
 */
export function exponentRational(node: Node): Rational | null {
  let sign = 1;
  let current = node;
  while (current.kind === "neg") {
    sign = -sign;
    current = current.arg;
  }
  if (current.kind !== "div") return null;
  const top = integerLiteral(current.left);
  const bottom = integerLiteral(current.right);
  if (top === null || bottom === null || bottom === 0) return null;
  const divisor = gcd(Math.abs(top), Math.abs(bottom));
  const p = (sign * Math.sign(bottom) * top) / divisor;
  const q = Math.abs(bottom) / divisor;
  return q > MAX_ODD_DENOMINATOR ? null : { p: p + 0, q };
}

/** The value of an integer literal, or of a `neg` of one; null for any other node. */
function integerLiteral(node: Node): number | null {
  const negated = node.kind === "neg";
  const literal = negated ? node.arg : node;
  if (literal.kind !== "num" || !Number.isSafeInteger(literal.value)) return null;
  return negated ? -literal.value : literal.value;
}

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

/**
 * a^b in real mode (NM-10, NM-13, NM-14). A negative base with a non-integer exponent is real only
 * for p/q with odd q ≤ 99, taken from `rational` (the tree) or else from the value, and is then
 * (−1)^p·|a|^b. 0^0 is 1, underflow is 0, and overflow or any other non-finite result is NaN.
 */
export function realPow(a: number, b: number, rational: Rational | null): number {
  if (Number.isNaN(a) || Number.isNaN(b)) return NaN;
  let result: number;
  if (a < 0 && !Number.isInteger(b)) {
    const r = rational ?? rationalFromValue(b);
    if (r === null || r.q > MAX_ODD_DENOMINATOR || r.q % 2 === 0) return NaN;
    result = (Math.abs(r.p) % 2 === 1 ? -1 : 1) * Math.pow(-a, b);
  } else {
    result = Math.pow(a, b);
  }
  return Number.isFinite(result) ? result : NaN;
}

/**
 * The real nth root of x (NM-11, FN-13). A zero or non-finite n is NaN; an integer n gives the real
 * root, NaN for a negative x with even n and −(root of −x) with odd n; a non-integer n is
 * x^{1/n} under NM-10. A non-finite result is NaN.
 */
export function realRoot(x: number, n: number): number {
  if (n === 0 || !Number.isFinite(n)) return NaN;
  if (!Number.isInteger(n)) return realPow(x, 1 / n, null);
  if (x < 0 && Math.abs(n) % 2 === 0) return NaN;
  const result = x < 0 ? -positiveRoot(-x, n) : positiveRoot(x, n);
  return Number.isFinite(result) ? result : NaN;
}

function positiveRoot(x: number, n: number): number {
  if (n === 3) return Math.cbrt(x);
  if (n === 2) return Math.sqrt(x);
  return Math.pow(x, 1 / n);
}

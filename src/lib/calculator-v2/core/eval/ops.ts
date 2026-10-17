// Value-level arithmetic (NM-10 to NM-14, NM-18, NM-19; FN-12 to FN-14), plot numbers (NM-21) and
// relations (NM-22). Two numbers use the real rules; a non-real operand uses the complex
// functions; a point, list or undefined operand gives UNDEFINED (decision 7). Every result passes
// through numberValue or complexValue, so a non-finite result is UNDEFINED. Pure TypeScript: no
// DOM (AR-44).

import type { RelOp } from "../latex/ast";
import { cadd, cdiv, cmul, cpow, csqrt, csub } from "./complex";
import { realPow, realRoot, type Rational } from "./real-pow";
import { complexValue, numberValue, UNDEFINED, type Complex, type Value } from "./values";

/** NM-21: an imaginary part at most this times max(1, |Re|) is negligible for plotting. */
const PLOT_IMAGINARY_TOLERANCE = 1e-12;

/** A number or complex operand as a Complex; null for a point, list or undefined. */
function scalar(v: Value): Complex | null {
  if (v.type === "number") return { re: v.value, im: 0 };
  return v.type === "complex" ? v.value : null;
}

function fromComplex(z: Complex): Value {
  return complexValue(z.re, z.im);
}

/** Applies `real` to two numbers and `complex` to any other pair of scalars. */
function binary(
  a: Value,
  b: Value,
  real: (x: number, y: number) => number,
  complex: (x: Complex, y: Complex) => Complex
): Value {
  if (a.type === "number" && b.type === "number") return numberValue(real(a.value, b.value));
  const x = scalar(a);
  const y = scalar(b);
  return x && y ? fromComplex(complex(x, y)) : UNDEFINED;
}

export function addV(a: Value, b: Value): Value {
  return binary(a, b, (x, y) => x + y, cadd);
}

export function subV(a: Value, b: Value): Value {
  return binary(a, b, (x, y) => x - y, csub);
}

export function mulV(a: Value, b: Value): Value {
  return binary(a, b, (x, y) => x * y, cmul);
}

/** a / b; ÷ 0 is UNDEFINED (NM-12, FN-14) because the quotient is not finite. */
export function divV(a: Value, b: Value): Value {
  return binary(a, b, (x, y) => x / y, cdiv);
}

export function negV(a: Value): Value {
  if (a.type === "number") return numberValue(-a.value);
  return a.type === "complex" ? complexValue(-a.value.re, -a.value.im) : UNDEFINED;
}

/** a% is a / 100. */
export function pctV(a: Value): Value {
  if (a.type === "number") return numberValue(a.value / 100);
  return a.type === "complex" ? complexValue(a.value.re / 100, a.value.im / 100) : UNDEFINED;
}

/** |a|, the modulus for a complex value. */
export function absV(a: Value): Value {
  if (a.type === "number") return numberValue(Math.abs(a.value));
  return a.type === "complex" ? numberValue(Math.hypot(a.value.re, a.value.im)) : UNDEFINED;
}

/** a° in the angle mode's unit: (a·π)/180 in radians, a itself in degrees. */
export function degV(a: Value, angleMode: "radians" | "degrees"): Value {
  if (a.type !== "number" && a.type !== "complex") return UNDEFINED;
  if (angleMode === "degrees") return a;
  if (a.type === "number") return numberValue((a.value * Math.PI) / 180);
  return complexValue((a.value.re * Math.PI) / 180, (a.value.im * Math.PI) / 180);
}

/**
 * a^b. Two numbers follow realPow (NM-10, NM-13, NM-14) with `rational` from the tree; in complex
 * mode a NaN from a negative base falls back to cpow, so a value real mode defines never changes
 * (NM-19). A non-real operand always uses cpow. Overflow and 0 to a negative power stay UNDEFINED.
 */
export function powV(a: Value, b: Value, rational: Rational | null, complex: boolean): Value {
  if (a.type === "number" && b.type === "number") {
    const r = realPow(a.value, b.value, rational);
    if (Number.isNaN(r) && complex && a.value < 0) {
      return fromComplex(cpow({ re: a.value, im: 0 }, { re: b.value, im: 0 }));
    }
    return numberValue(r);
  }
  const z = scalar(a);
  const w = scalar(b);
  return z && w ? fromComplex(cpow(z, w)) : UNDEFINED;
}

/**
 * The nth root of x, or the square root when n is null (NM-11, FN-13). Numbers follow realRoot; in
 * complex mode a NaN from a negative radicand falls back to csqrt or cpow(x, 1/n) (NM-19). A
 * non-real operand always uses the complex function.
 */
export function rootV(x: Value, n: Value | null, complex: boolean): Value {
  if (x.type === "number" && (n === null || n.type === "number")) {
    const r = realRoot(x.value, n === null ? 2 : n.value);
    if (Number.isNaN(r) && complex && x.value < 0) return complexRoot({ re: x.value, im: 0 }, n);
    return numberValue(r);
  }
  const z = scalar(x);
  return z ? complexRoot(z, n) : UNDEFINED;
}

/** csqrt(z) when `n` is null, else cpow(z, 1/n); a point, list or undefined index is UNDEFINED. */
function complexRoot(z: Complex, n: Value | null): Value {
  if (n === null) return fromComplex(csqrt(z));
  const index = scalar(n);
  return index ? fromComplex(cpow(z, cdiv({ re: 1, im: 0 }, index))) : UNDEFINED;
}

/**
 * NM-21, FN-17: the number a curve plots for a value. A number is itself (-0 kept); a complex
 * value is its real part when |Im| ≤ 1e-12·max(1, |Re|), else NaN; anything else is NaN.
 */
export function toPlotNumber(v: Value): number {
  if (v.type === "number") return v.value;
  if (v.type !== "complex") return NaN;
  const { re, im } = v.value;
  return Math.abs(im) <= PLOT_IMAGINARY_TOLERANCE * Math.max(1, Math.abs(re)) ? re : NaN;
}

/** One link `a op b` of a relation, compared on the full doubles (NM-9). */
export function linkHolds(a: number, op: RelOp, b: number): boolean {
  switch (op) {
    case "=":
      return a === b;
    case "<":
      return a < b;
    case ">":
      return a > b;
    case "<=":
      return a <= b;
    case ">=":
      return a >= b;
  }
}

/**
 * NM-22, 04 decision 6: a relation holds when every operand is a finite number and every link
 * holds. A non-real, undefined, point or list operand makes it false.
 */
export function relationHolds(values: readonly Value[], ops: readonly RelOp[]): boolean {
  if (values.length !== ops.length + 1) return false;
  let previous = NaN;
  for (let k = 0; k < values.length; k++) {
    const v = values[k];
    if (v.type !== "number" || !Number.isFinite(v.value)) return false;
    if (k > 0 && !linkHolds(previous, ops[k - 1], v.value)) return false;
    previous = v.value;
  }
  return true;
}

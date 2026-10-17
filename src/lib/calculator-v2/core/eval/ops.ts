// Value-level arithmetic (NM-10 to NM-14, NM-18, NM-19; FN-12 to FN-14). Two numbers use the real
// rules; a non-real operand uses the complex functions; a point, list or undefined operand gives
// UNDEFINED (decision 7). Every result passes through numberValue or complexValue, so a
// non-finite result is UNDEFINED. Pure TypeScript: no DOM (AR-44).

import { cadd, cdiv, cmul, cpow, csqrt, csub } from "./complex";
import { realPow, realRoot, type Rational } from "./real-pow";
import { complexValue, numberValue, UNDEFINED, type Complex, type Value } from "./values";

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

// Hyperbolic trig and its typed inverses (FN-68), real and complex. None depends on the angle unit.
// arccosh, arctanh, arcsech and arccoth extend to complex values outside their real domains
// (NM-19): arccosh on the principal branch, where a zero imaginary part on the cut reads as +0 as
// in complex.ts, and arctanh and arccoth by Desmos's own formulas and branches. Pure TypeScript:
// no DOM (AR-44).

import { cadd, casin, ccosh, cdiv, cln, cmul, csinh, csqrt, csub, ctanh } from "../eval/complex";
import type { Complex } from "../eval/values";
import type { Rule } from "./builtins";

const ONE: Complex = Object.freeze({ re: 1, im: 0 });
const HALF_PI = Math.PI / 2;

const reciprocal = (z: Complex): Complex => cdiv(ONE, z);

/** asinh z = −i·asin(iz). */
function casinh(z: Complex): Complex {
  const w = casin({ re: -z.im, im: z.re });
  return { re: w.im, im: -w.re };
}

/** acosh z = Ln(z + √(z + 1)·√(z − 1)), with Re ≥ 0; acosh(0.5) = (π/3)i. */
function cacosh(z: Complex): Complex {
  return cln(cadd(z, cmul(csqrt(cadd(z, ONE)), csqrt(csub(z, ONE)))));
}

/** Beyond this a part of z is large enough that atanh z and acoth z are 1/z (to the real part). */
const LARGE = Math.sqrt(Number.MAX_VALUE) / 4;

/**
 * atanh z as Desmos computes it, odd in z: for re ≥ 0, re = ¼·ln(1 + 4x/((1 − x)² + y²)) and
 * im = −½·arg(−2y + ((1 − x)(1 + x) − y²)i), with signed zeros read as +0. On the real axis past 1
 * the imaginary part is −π/2 (`\operatorname{arctanh}(2)`) and before −1 it is π/2; atanh 1 has
 * an infinite, so undefined, real part.
 */
function catanh(z: Complex): Complex {
  if (z.re >= 0) return atanhRight(z.re, z.im);
  const w = atanhRight(-z.re, -z.im);
  return { re: -w.re, im: -w.im };
}

function atanhRight(x: number, y: number): Complex {
  if (x > LARGE || Math.abs(y) > LARGE) {
    return { re: reciprocal({ re: x, im: y }).re, im: y <= 0 ? -HALF_PI : HALF_PI };
  }
  if (x === 1) {
    if (y === 0) return { re: Infinity, im: 0 };
    const a = Math.abs(y),
      im = (HALF_PI + Math.atan(a / 2)) / 2;
    const re = a >= 1 ? Math.log1p(4 / (a * a)) / 4 : Math.log(4 + a * a) / 4 - Math.log(a) / 2;
    return { re, im: y < 0 ? -im : im };
  }
  const re = Math.log1p((4 * x) / ((1 - x) ** 2 + y * y)) / 4;
  return { re, im: -Math.atan2(-2 * y + 0, (1 - x) * (1 + x) - y * y + 0) / 2 };
}

/**
 * acoth z as Desmos computes it, odd in the real part: ¼·ln(1 + 4x/((1 − x)² + y²)) for x = |re|
 * and y = |im|, and an imaginary part of ½·arg((y² − (1 − x)(1 + x)) + 2yi), negated when im > 0;
 * so `\operatorname{arccoth}(0.5)` has imaginary part π/2 and acoth ±1 an infinite real part.
 */
function cacoth(z: Complex): Complex {
  if (Math.abs(z.re) > LARGE || Math.abs(z.im) > LARGE) return reciprocal(z);
  const sign = z.re < 0 ? -1 : 1,
    x = Math.abs(z.re),
    y = Math.abs(z.im);
  if (x === 1 && y === 0) return { re: sign * Infinity, im: 0 };
  const d = 1 - x;
  const re =
    x === 1 && y < 1
      ? Math.log(4 + y * y) / 4 - Math.log(y) / 2
      : Math.log1p((4 * x) / (d * d + y * y)) / 4;
  const a = Math.atan2(2 * y, y * y - d * (1 + x)) / 2;
  return { re: sign * re, im: z.im > 0 ? -a : a };
}

/** A hyperbolic rule: `real` on numbers, `complex` on complex values, angle unit `none`. */
function rule(
  real: (x: number) => number,
  complex: (z: Complex) => Complex,
  extendsToComplex = false
): Rule {
  return {
    angle: "none",
    extendsToComplex,
    real: (args) => real(args[0]),
    complex: (args) => complex(args[0]),
  };
}

/**
 * FN-68: sinh, cosh and tanh by Math; csch = 1/sinh, sech = 1/cosh and coth = 1/tanh (csch(0) and
 * coth(0) undefined). arcsinh for all reals, arccosh for x ≥ 1, arctanh for |x| < 1;
 * arccsch(x) = arcsinh(1/x), arcsech(x) = arccosh(1/x) for 0 < x ≤ 1 and arccoth(x) =
 * arctanh(1/x) for |x| > 1. A real result outside the domain is NaN, so undefined.
 */
export const HYPERBOLIC_RULES: readonly (readonly [string, Rule])[] = [
  ["sinh", rule(Math.sinh, csinh)],
  ["cosh", rule(Math.cosh, ccosh)],
  ["tanh", rule(Math.tanh, ctanh)],
  [
    "csch",
    rule(
      (x) => 1 / Math.sinh(x),
      (z) => reciprocal(csinh(z))
    ),
  ],
  [
    "sech",
    rule(
      (x) => 1 / Math.cosh(x),
      (z) => reciprocal(ccosh(z))
    ),
  ],
  [
    "coth",
    rule(
      (x) => 1 / Math.tanh(x),
      (z) => reciprocal(ctanh(z))
    ),
  ],
  ["arcsinh", rule(Math.asinh, casinh)],
  ["arccosh", rule(Math.acosh, cacosh, true)],
  ["arctanh", rule(Math.atanh, catanh, true)],
  [
    "arccsch",
    rule(
      (x) => Math.asinh(1 / x),
      (z) => casinh(reciprocal(z))
    ),
  ],
  [
    "arcsech",
    rule(
      (x) => Math.acosh(1 / x),
      (z) => cacosh(reciprocal(z)),
      true
    ),
  ],
  ["arccoth", rule((x) => Math.atanh(1 / x), cacoth, true)],
];

// Hyperbolic trig and its typed inverses (FN-68), real and complex. None depends on the angle unit.
// arccosh, arctanh, arcsech and arccoth extend to complex values outside their real domains
// (NM-19), on the principal branch; on a branch cut a zero imaginary part reads as +0, as in C99
// and complex.ts. Pure TypeScript: no DOM (AR-44).

import { cadd, casin, cdiv, cln, cmul, csqrt, csub } from "../eval/complex";
import type { Complex } from "../eval/values";
import type { Rule } from "./builtins";

const ONE: Complex = Object.freeze({ re: 1, im: 0 });
const HALF_PI = Math.PI / 2;

function csinh(z: Complex): Complex {
  return { re: Math.sinh(z.re) * Math.cos(z.im), im: Math.cosh(z.re) * Math.sin(z.im) };
}

function ccosh(z: Complex): Complex {
  return { re: Math.cosh(z.re) * Math.cos(z.im), im: Math.sinh(z.re) * Math.sin(z.im) };
}

function ctanh(z: Complex): Complex {
  return cdiv(csinh(z), ccosh(z));
}

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

/**
 * atanh z = ½(Ln(1 + z) − Ln(1 − z)). On the cut (im zero, read as +0, and |re| > 1) the C99
 * value is (atanh(1/re), π/2); at ±1 a logarithm of 0 makes it NaN.
 */
function catanh(z: Complex): Complex {
  if (z.im === 0 && Math.abs(z.re) > 1) return { re: Math.atanh(1 / z.re), im: HALF_PI };
  const d = csub(cln(cadd(ONE, z)), cln(csub(ONE, z)));
  return { re: d.re / 2, im: d.im / 2 };
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
  [
    "arccoth",
    rule(
      (x) => Math.atanh(1 / x),
      (z) => catanh(reciprocal(z)),
      true
    ),
  ],
];

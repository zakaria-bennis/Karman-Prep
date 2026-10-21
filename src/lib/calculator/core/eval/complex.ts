// Complex arithmetic with principal branches (NM-18). Results are raw Complex values: NaN or an
// infinite part means undefined, and the Value layer maps it to UNDEFINED through complexValue.
// On a branch cut a zero part reads as +0, as in C99. Pure TypeScript: no DOM (AR-44).

import { exactCos, exactSin, exactTan } from "../lib/trig";
import type { Complex } from "./values";

export const C_I: Complex = Object.freeze({ re: 0, im: 1 });

const HALF_PI = Math.PI / 2;
const NAN: Complex = Object.freeze({ re: NaN, im: NaN });
const ONE: Complex = Object.freeze({ re: 1, im: 0 });

export function cadd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

export function csub(a: Complex, b: Complex): Complex {
  return { re: a.re - b.re, im: a.im - b.im };
}

export function cmul(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

/** a / b by Smith's method (exact for a real divisor); ÷ 0 gives NaN parts. */
export function cdiv(a: Complex, b: Complex): Complex {
  if (b.re === 0 && b.im === 0) return { ...NAN };
  if (Math.abs(b.re) >= Math.abs(b.im)) {
    const r = b.im / b.re;
    const d = b.re + b.im * r;
    return { re: (a.re + a.im * r) / d, im: (a.im - a.re * r) / d };
  }
  const r = b.re / b.im;
  const d = b.re * r + b.im;
  return { re: (a.re * r + a.im) / d, im: (a.im * r - a.re) / d };
}

/**
 * e^z = e^re·(cos im + i·sin im), with sin exactly 0 at a double that is exactly k·π and cos
 * exactly 0 at one that is exactly (2k + 1)·π/2, as in Desmos, so `\ln(-1)^{2}` is −π² + 0i.
 */
export function cexp(z: Complex): Complex {
  const m = Math.exp(z.re);
  return { re: m * exactCos(z.im), im: m * exactSin(z.im) };
}

/** Ln z = ln|z| + i·Arg z with Arg in (−π, π]: an Arg of −π (from re < 0, im = −0) is π. Ln 0 is NaN. */
export function cln(z: Complex): Complex {
  if (z.re === 0 && z.im === 0) return { ...NAN };
  const arg = Math.atan2(z.im, z.re);
  return { re: Math.log(Math.hypot(z.re, z.im)), im: arg === -Math.PI ? Math.PI : arg };
}

/**
 * √z with a non-negative real part (Kahan): t = √((|re| + |z|)/2); re ≥ 0 gives (t, im/2t), else
 * (|im|/2t, ±t) with the sign of im, + for ±0. The halves are added separately so a large |z|
 * cannot overflow, and √0 is 0.
 */
export function csqrt(z: Complex): Complex {
  const t = Math.sqrt(Math.abs(z.re) / 2 + Math.hypot(z.re, z.im) / 2);
  if (t === 0) return { re: 0, im: z.im };
  if (z.re >= 0) return { re: t, im: z.im / (2 * t) };
  return { re: Math.abs(z.im) / (2 * t), im: z.im < 0 ? -t : t };
}

// The complex trig and hyperbolic functions build their parts from the quarter-turn-exact sin,
// cos and tan of trig.ts (NM-4), as Desmos does, so `\cosh(\frac{\pi}{2}i)` is exactly 0 and
// `\sin(\pi+i)` real; tanh, and tan through it, use Desmos's formula in tan and tanh.

/** sin(a + bi) = sin a·cosh b + i·cos a·sinh b. */
export function csin(z: Complex): Complex {
  return { re: exactSin(z.re) * Math.cosh(z.im), im: exactCos(z.re) * Math.sinh(z.im) };
}

/** cos(a + bi) = cos a·cosh b − i·sin a·sinh b. */
export function ccos(z: Complex): Complex {
  return { re: exactCos(z.re) * Math.cosh(z.im), im: -exactSin(z.re) * Math.sinh(z.im) };
}

/** tan z = −i·tanh(iz). */
export function ctan(z: Complex): Complex {
  const w = ctanh({ re: -z.im, im: z.re });
  return { re: w.im, im: -w.re };
}

/** sinh(a + bi) = sinh a·cos b + i·cosh a·sin b. */
export function csinh(z: Complex): Complex {
  return { re: Math.sinh(z.re) * exactCos(z.im), im: Math.cosh(z.re) * exactSin(z.im) };
}

/** cosh(a + bi) = cosh a·cos b + i·sinh a·sin b. */
export function ccosh(z: Complex): Complex {
  return { re: Math.cosh(z.re) * exactCos(z.im), im: Math.sinh(z.re) * exactSin(z.im) };
}

/**
 * tanh(a + bi) from t = tan b and h = tanh a: ((1 + t²)·h / (1 + t²h²), t / (1 + (1 + t²)·sinh²a)),
 * and (1/h, 0) where tan b is infinite (b an odd quarter turn), so `\tanh(\frac{\pi}{2}i)` has an
 * undefined real part and `\coth(\frac{\pi}{2}i)` is 0.
 */
export function ctanh(z: Complex): Complex {
  const t = exactTan(z.im),
    h = Math.tanh(z.re);
  if (!Number.isFinite(t)) return { re: 1 / h, im: 1 / t };
  const t2 = t * t,
    s = Math.sinh(z.re);
  return { re: ((1 + t2) * h) / (1 + t2 * h * h), im: t / (1 + (1 + t2) * s * s) };
}

/**
 * casin(z) = −i·Ln(iz + √(1 − z²)) with the principal Ln and √, as Desmos computes it (captured
 * 2026-10-20): on the cut (im zero and |re| > 1) that is (sign(re)·π/2, −sign(re)·acosh|re|), so
 * arcsin(2) = π/2 − 1.317i and arcsin(−2) = −π/2 + 1.317i (C99's casin gives +1.317i for both).
 */
export function casin(z: Complex): Complex {
  if (z.im === 0 && Math.abs(z.re) > 1) {
    const s = Math.sign(z.re);
    return { re: s * HALF_PI, im: -s * Math.acosh(Math.abs(z.re)) };
  }
  const iz = cmul(C_I, z);
  const w = cln(cadd(iz, csqrt(csub(ONE, cmul(z, z)))));
  return { re: w.im, im: -w.re }; // −i·(a + bi) = b − ai
}

/** cacos(z) = π/2 − casin(z), so the cut values follow casin's. */
export function cacos(z: Complex): Complex {
  return csub({ re: HALF_PI, im: 0 }, casin(z));
}

/**
 * catan(z) = (i/2)(Ln(1 − iz) − Ln(1 + iz)). On the cut (re zero, read as +0, and |im| > 1) the
 * C99 value is (π/2, atanh(1/im)). At ±i a logarithm of 0 makes it NaN.
 */
export function catan(z: Complex): Complex {
  if (z.re === 0 && Math.abs(z.im) > 1) return { re: HALF_PI, im: Math.atanh(1 / z.im) };
  const iz = cmul(C_I, z);
  const d = csub(cln(csub(ONE, iz)), cln(cadd(ONE, iz)));
  return { re: -d.im / 2, im: d.re / 2 }; // (i/2)·(a + bi) = −b/2 + (a/2)i
}

/** z^w = e^{w·Ln z}. For z = 0: w = 0 gives 1, Re w > 0 gives 0 and anything else NaN. */
export function cpow(z: Complex, w: Complex): Complex {
  if (z.re === 0 && z.im === 0) {
    if (w.re === 0 && w.im === 0) return { ...ONE };
    return w.re > 0 ? { re: 0, im: 0 } : { ...NAN };
  }
  return cexp(cmul(w, cln(z)));
}

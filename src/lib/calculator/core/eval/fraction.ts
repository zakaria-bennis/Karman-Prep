// The decimal-to-fraction rule of a row's value (NM-7, captured from Desmos 2026-10-21).
// A number has a fraction form when the best rational approximation p/q with q at most
// 10^6/√|x| differs from x by less than what x can hold: adding an eighth of the difference to x
// leaves x unchanged. The approximation is the last continued-fraction convergent (floor terms,
// worked in doubles on the signed value, so a negative value can differ from its positive) whose
// denominator fits the limit. No limit below 1 (|x| > 10^12) or above 10^12 (|x| < 10^-12), and no
// whole numbers: those show no toggle. The fraction is improper, never mixed: 2.5 is 5/2.
// So 0.3 is 3/10, 1/3's double is 1/3, 355/113's double is 355/113, but a typed 0.666666666667 or
// 3.14159292035 is too far from 2/3 or 355/113 and has none; π, √2 and e have none. Pure
// TypeScript: no DOM (AR-44).

/** A value's fraction form: n/d with d ≥ 2 and the sign on n. */
export interface DisplayFraction {
  readonly n: number;
  readonly d: number;
}

const LIMIT_SCALE = 1e6; // NM-7: the denominator limit is 10^6/√|x|
const LIMIT_MAX = 1e12;
const CLOSENESS = 0.125; // NM-7: x + |p/q − x|/8 must round back to x

/** The last convergent of `x`'s continued fraction (floor terms) whose denominator is ≤ `limit`. */
function convergent(x: number, limit: number): DisplayFraction {
  let [n, prevN, d, prevD] = [1, 0, 0, 1];
  let rest = x;
  for (;;) {
    const a = Math.floor(rest);
    const nextD = a * d + prevD;
    if (nextD > limit) break;
    [n, prevN] = [a * n + prevN, n];
    [d, prevD] = [nextD, d];
    if (rest === a) break;
    rest = 1 / (rest - a);
  }
  return { n, d };
}

/** NM-7: `x` as a fraction, or null when it has no fraction form (and shows no toggle). */
export function displayFraction(x: number): DisplayFraction | null {
  if (!Number.isFinite(x)) return null;
  const limit = LIMIT_SCALE / Math.sqrt(Math.abs(x));
  if (!(limit >= 1 && limit <= LIMIT_MAX)) return null;
  const f = convergent(x, limit);
  if (f.d === 1) return null;
  return x === x + CLOSENESS * Math.abs(f.n / f.d - x) ? f : null;
}

/** NM-7: `-\frac{1}{8}`, the sign in front of the fraction bar. */
export function fractionLatex(f: DisplayFraction): string {
  return `${f.n < 0 ? "-" : ""}\\frac{${Math.abs(f.n)}}{${f.d}}`;
}

/** NM-7: `-1/8`, the plain-text form. */
export function fractionText(f: DisplayFraction): string {
  return `${f.n}/${f.d}`;
}

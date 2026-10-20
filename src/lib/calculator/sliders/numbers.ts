// Number helpers for sliders (SLIDERS-22 to SLIDERS-24): the plain-decimal text a slider writes
// back into its row, the near-integer-millionth rounding snaps use, and the shortest number inside
// an interval that drags and playback write. Pure TypeScript: no DOM (AR-44).

/**
 * SLIDERS-23: `n` as a plain decimal with no exponent, the shortest text that reads back as `n`
 * (`1e-7` is `0.0000001`, `-0` is `0`). Non-finite values come back as "NaN" or "±Infinity".
 */
export function plainDecimal(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (n === 0) return "0";
  const text = String(n);
  const match = /^(-?)(\d)(?:\.(\d+))?e([+-]\d+)$/.exec(text);
  if (match === null) return text;
  const [, sign, lead, rest = "", exp] = match;
  const digits = lead + rest;
  const point = 1 + Number(exp); // where the decimal point falls in `digits`
  if (point <= 0) return `${sign}0.${"0".repeat(-point)}${digits}`;
  if (point >= digits.length) return `${sign}${digits}${"0".repeat(point - digits.length)}`;
  return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`;
}

/** A snap's float clean-up: `x` rounded to millionths when that moves it by less than `tolerance`. */
export function roundNear(x: number, tolerance: number): number {
  const r = Math.round(1e6 * x) / 1e6;
  return Math.abs(r - x) < tolerance ? r : x;
}

/**
 * SLIDERS-24: a short number inside [lo, hi]. 0 when the interval touches or crosses 0; ±10^k for
 * the larger decimal exponent when the ends' exponents differ; otherwise the centre rounded to one
 * more significant digit than the ends' mantissas share (one digit when even the first differs).
 */
export function shortestBetween(lo: number, hi: number): number {
  if (!Number.isFinite(lo)) return lo;
  if (!Number.isFinite(hi)) return hi;
  const centre = (lo + hi) / 2;
  if (lo > 0 !== hi > 0 || lo === 0 || hi === 0) return 0;
  const sign = lo > 0 ? 1 : -1;
  const [a, ea] = Math.abs(lo).toExponential().split("e");
  const [b, eb] = Math.abs(hi).toExponential().split("e");
  if (ea !== eb) return sign * Math.pow(10, Math.max(Number(ea), Number(eb)));
  if (a[0] !== b[0]) return Number(centre.toPrecision(1));
  let digits = 1;
  for (let i = 2; i < Math.min(a.length, b.length); i++) {
    digits++;
    if (a[i] !== b[i]) break;
  }
  return Number(centre.toPrecision(digits));
}

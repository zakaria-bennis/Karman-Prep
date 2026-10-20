// The simplest decimal inside an interval (POI-TRACE-23): the trace moves its independent
// coordinate to the shortest decimal within half a pixel of the pointer. Pure TypeScript.

/** Mantissa digits ("1414") and decimal exponent of |v|, v ≠ 0. */
function decompose(v: number): { digits: string; exponent: number } {
  const [m, e] = Math.abs(v).toExponential().split("e");
  return { digits: m.replace(".", ""), exponent: Number(e) };
}

/**
 * The simplest decimal in [a, b]: 0 when the interval reaches 0, a power of ten when its ends
 * differ in magnitude, else the midpoint to one more significant figure than the ends share.
 */
export function simplestDecimal(a: number, b: number): number {
  if (!Number.isFinite(a)) return a;
  if (!Number.isFinite(b)) return b;
  if (a === 0 || b === 0 || a > 0 !== b > 0) return 0;
  const sign = a > 0 ? 1 : -1,
    da = decompose(a),
    db = decompose(b);
  if (da.exponent !== db.exponent) return sign * 10 ** Math.max(da.exponent, db.exponent);
  let shared = 0;
  const n = Math.min(da.digits.length, db.digits.length);
  while (shared < n && da.digits[shared] === db.digits[shared]) shared++;
  // One more figure than the ends share; when one end's digits prefix the other's, that many.
  const figures = Math.min(100, Math.max(1, shared === n ? n : shared + 1));
  return Number(((a + b) / 2).toPrecision(figures));
}

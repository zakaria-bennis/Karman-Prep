// RT-7, REG-TABLES-FROM-EQUATIONS-20: Enter on the last filled row of a table's first column
// continues an arithmetic sequence. The step is an exact fraction from the first two values (each
// read as a fraction of denominator at most 10^6, to rounding); every value down to the row must
// follow it; the next term is a decimal when both of the first two values' plain strings are
// shorter than 8 characters, else an unsimplified \frac{p}{q}. Pure TypeScript: no DOM.

const MAX_DENOMINATOR = 1_000_000;
const TOLERANCE = 4 * Number.EPSILON; // the value is the fraction, to rounding

/** v as p/q with q ≤ MAX_DENOMINATOR (continued fractions), or null. */
function toFraction(v: number): [number, number] | null {
  if (!Number.isFinite(v)) return null;
  const sign = v < 0 ? -1 : 1;
  const x = Math.abs(v);
  let [h0, h1, k0, k1] = [0, 1, 1, 0];
  let rest = x;
  for (let i = 0; i < 40; i++) {
    const a = Math.floor(rest);
    [h0, h1] = [h1, a * h1 + h0];
    [k0, k1] = [k1, a * k1 + k0];
    if (k1 > MAX_DENOMINATOR) return null;
    if (Math.abs(h1 / k1 - x) <= TOLERANCE * Math.max(1, x)) return [sign * h1, k1];
    const frac = rest - a;
    if (frac === 0) return null;
    rest = 1 / frac;
  }
  return null;
}

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

/** The latex of the term after `values` (the first column down to the row), or null. */
export function nextSequenceTerm(values: readonly (number | null)[]): string | null {
  if (values.length < 2 || values.some((v) => v === null || !Number.isFinite(v))) return null;
  const nums = values as number[];
  const f0 = toFraction(nums[0]),
    f1 = toFraction(nums[1]);
  if (f0 === null || f1 === null) return null;
  const q = (f0[1] * f1[1]) / gcd(f0[1], f1[1]);
  const p0 = f0[0] * (q / f0[1]),
    p1 = f1[0] * (q / f1[1]);
  const step = p1 - p0;
  const term = (k: number) => (p0 + k * step) / q;
  const ok = nums.every(
    (v, k) => Math.abs(v - term(k)) <= 1e-9 * Math.max(1, Math.abs(v), Math.abs(term(k)))
  );
  if (!ok) return null;
  const n = nums.length;
  const plain = String(nums[0]).length < 8 && String(nums[1]).length < 8;
  if (plain) {
    const next = Number(term(n).toPrecision(12));
    return String(Object.is(next, -0) ? 0 : next);
  }
  const numerator = p0 + n * step;
  return numerator < 0 ? `-\\frac{${-numerator}}{${q}}` : `\\frac{${numerator}}{${q}}`;
}

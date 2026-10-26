// Exact fractions for range arithmetic (NM-36). Desmos folds a range of constants in exact
// rational arithmetic, so `[0,0.1,...,1]` holds 0.3 and not 0.1 + 0.2's 0.30000000000000004. The
// engine's numbers are doubles, so a double is read back as the simplest fraction that rounds to
// it (0.1 is 1/10, 1/3's double is 1/3). Numerators and denominators stay within 2^53 − 1, as in
// Desmos; anything larger has no fraction and the caller works in doubles. Pure TypeScript: no
// DOM (AR-44).

/** A reduced fraction n/d with d > 0 and |n|, d at most MAX_PART. */
export interface Fraction {
  readonly n: number;
  readonly d: number;
}

const MAX_PART = Number.MAX_SAFE_INTEGER;
const BIG_MAX = BigInt(MAX_PART);
// BigInt() calls, not literals: the build targets ES2017.
const [ZERO, ONE, TWO] = [BigInt(0), BigInt(1), BigInt(2)];

/**
 * The fraction with the smallest denominator among the continued-fraction convergents of `x`
 * that rounds back to `x` exactly, or null for a value that is not finite or has none within
 * MAX_PART.
 */
export function fractionOf(x: number): Fraction | null {
  if (!Number.isFinite(x)) return null;
  if (Number.isInteger(x)) return Math.abs(x) <= MAX_PART ? { n: x + 0, d: 1 } : null;
  const target = Math.abs(x);
  let [num, den] = exactParts(target);
  let [p0, q0, p1, q1] = [ZERO, ONE, ONE, ZERO];
  while (den !== ZERO) {
    const a = num / den;
    [num, den] = [den, num - a * den];
    const [p, q] = [a * p1 + p0, a * q1 + q0];
    if (p > BIG_MAX || q > BIG_MAX) return null;
    if (Number(p) / Number(q) === target)
      return { n: x < 0 ? -Number(p) : Number(p), d: Number(q) };
    [p0, q0, p1, q1] = [p1, q1, p, q];
  }
  return null;
}

/**
 * A typed number literal as Desmos reads it: the decimal it is written as (`0.333333333333333`
 * is 333333333333333/10^15, live 2026-10-25), else when that does not fit the simplest fraction
 * that rounds to it (fractionOf). The literal's digits are its double's shortest decimal.
 */
export function literalFraction(x: number): Fraction | null {
  const m = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]\d+))?$/.exec(String(x));
  if (m !== null) {
    const digits = m[3] ?? "",
      scale = digits.length - Number(m[4] ?? 0);
    const n = BigInt(m[1] + m[2] + digits) * BigInt(10) ** BigInt(Math.max(0, -scale));
    const f = reduced(n, BigInt(10) ** BigInt(Math.max(0, scale)));
    if (f !== null) return f;
  }
  return fractionOf(x);
}

/** A non-integer double as the exact fraction num/den, den a power of 2. */
function exactParts(x: number): [bigint, bigint] {
  let den = ONE;
  let v = x;
  while (!Number.isInteger(v)) {
    v *= 2; // exact: a double that is not an integer is below 2^52
    den *= TWO;
  }
  return [BigInt(v), den];
}

/** a + b, or null when the result does not fit. */
export function addFractions(a: Fraction, b: Fraction): Fraction | null {
  const [an, ad, bn, bd] = [a.n, a.d, b.n, b.d].map(BigInt);
  return reduced(an * bd + bn * ad, ad * bd);
}

/** a − b, or null when the result does not fit. */
export function subFractions(a: Fraction, b: Fraction): Fraction | null {
  return addFractions(a, { n: -b.n, d: b.d });
}

/** a / b, or null when b is 0 or the result does not fit. */
export function divFractions(a: Fraction, b: Fraction): Fraction | null {
  if (b.n === 0) return null;
  return reduced(BigInt(a.n) * BigInt(b.d), BigInt(a.d) * BigInt(b.n));
}

function reduced(n: bigint, d: bigint): Fraction | null {
  if (d < ZERO) [n, d] = [-n, -d];
  const g = gcd(n < ZERO ? -n : n, d);
  const [rn, rd] = [n / g, d / g];
  if (rd > BIG_MAX || rn > BIG_MAX || -rn > BIG_MAX) return null;
  return { n: Number(rn) + 0, d: Number(rd) };
}

function gcd(a: bigint, b: bigint): bigint {
  while (b !== ZERO) [a, b] = [b, a % b];
  return a === ZERO ? ONE : a;
}

/** a · b, or null when the result does not fit. */
export function mulFractions(a: Fraction, b: Fraction): Fraction | null {
  return reduced(BigInt(a.n) * BigInt(b.n), BigInt(a.d) * BigInt(b.d));
}

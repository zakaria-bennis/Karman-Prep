// The gamma function and its reciprocal for real arguments (NM-15, NM-44, FN-78, FN-79). Number
// level: NaN means undefined (a pole or an overflow). Pure TypeScript: no DOM (AR-44).

/** Lanczos g = 607/128 with 15 coefficients (Godfrey), relative error near 1e-15. */
const LANCZOS_G = 607 / 128;
const LANCZOS: readonly number[] = Object.freeze([
  0.99999999999999709182, 57.156235665862923517, -59.597960355475491248, 14.136097974741747174,
  -0.49191381609762019978, 0.33994649984811888699e-4, 0.46523628927048575665e-4,
  -0.98374475304879564677e-4, 0.15808870322491248884e-3, -0.21026444172410488319e-3,
  0.2174396181152126432e-3, -0.16431810653676389022e-3, 0.84418223983852743293e-4,
  -0.2619083840158140867e-4, 0.36899182659531622704e-5,
]);
const SQRT_TWO_PI = Math.sqrt(2 * Math.PI);
/** 170! is the largest factorial below the largest double; Γ(x) overflows for x > 171.62. */
export const MAX_FACTORIAL = 170;

let factorials: number[] | null = null;

/**
 * n! for an integer 0 ≤ n ≤ 170, correctly rounded: the exact product is formed as a BigInt once
 * and each entry is its nearest double, so 170! is 7.257415615307999e306 exactly as in Desmos.
 */
export function factorialOf(n: number): number {
  if (factorials === null) {
    const table = [1];
    let product = BigInt(1);
    for (let k = 1; k <= MAX_FACTORIAL; k++) {
      product *= BigInt(k);
      table.push(Number(product));
    }
    factorials = table;
  }
  return factorials[n];
}

/** sin(πx) with x reduced exactly modulo 2, so whole numbers give exactly 0. */
function sinPi(x: number): number {
  const r = x % 2; // fmod is exact
  if (r === 0 || r === 1 || r === -1) return 0;
  return Math.sin(Math.PI * r);
}

/** Lanczos for x ≥ 0.5; the power is split in two halves so Γ(171.5) does not overflow early. */
function lanczos(x: number): number {
  const z = x - 1;
  let sum = LANCZOS[0];
  for (let k = 1; k < LANCZOS.length; k++) sum += LANCZOS[k] / (z + k);
  const t = z + LANCZOS_G + 0.5;
  const half = Math.pow(t, (z + 0.5) / 2);
  return SQRT_TWO_PI * sum * (half * Math.exp(-t)) * half;
}

/**
 * Γ(x): undefined (NaN) at 0, −1, −2, … and when the result is not a finite double. Whole x up to
 * 171 reads the correctly rounded factorial table; x < 0.5 uses the reflection
 * Γ(x) = π / (sin(πx)·Γ(1 − x)). As in Desmos, the reflection is 0 once Γ(1 − x) is past the
 * factorial table (1 − x > 171): (−171.5)! = Γ(−170.5) is 0 although it is 3.3e−308 in exact
 * arithmetic, while (−170.5)! is 5.648e−306.
 */
export function gamma(x: number): number {
  if (Number.isNaN(x)) return NaN;
  if (Number.isInteger(x)) {
    if (x <= 0 || x > MAX_FACTORIAL + 1) return NaN;
    return factorialOf(x - 1);
  }
  if (x < 0.5 && 1 - x > MAX_FACTORIAL + 1) return 0;
  const v = x < 0.5 ? Math.PI / (sinPi(x) * lanczos(1 - x)) : lanczos(x);
  return Number.isFinite(v) && v !== 0 ? v : NaN;
}

/** 1/Γ(x), which is 0 at the poles 0, −1, −2, …; NaN when Γ(x) is 0 or underflows past 1/MAX_VALUE. */
export function reciprocalGamma(x: number): number {
  if (Number.isInteger(x) && x <= 0) return 0;
  const g = gamma(x);
  return Number.isNaN(g) || g === 0 ? NaN : 1 / g;
}

/** x! = Γ(x + 1) (NM-15, FN-79): 0! = 1, 170! is finite, 171! and (−1)! are undefined. */
export function factorial(x: number): number {
  return gamma(x + 1);
}

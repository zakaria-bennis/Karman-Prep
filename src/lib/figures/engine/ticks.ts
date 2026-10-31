/**
 * Automatic axis steps for the figure engine: the smallest 1, 2 or 5 × 10^k
 * step whose ticks sit at least MIN_TICK_PX apart. The engine's own copy, so
 * figures never load the calculator. Tick values come from integer indices,
 * never a running sum, so labels stay exact.
 */

/** Smallest spacing between automatic ticks, in px. */
export const MIN_TICK_PX = 80;

const MANTISSAS = [1, 2, 5] as const;
const TOLERANCE = 1e-9;

/** m · 10^k as one correctly rounded operation (a division for k < 0). */
function scaled(m: number, k: number): number {
  if (m === 0) return 0; // never -0
  return k >= 0 ? m * 10 ** k : m / 10 ** -k;
}

/**
 * The automatic step for [min, max] drawn `lengthPx` long: the smallest
 * 1, 2 or 5 × 10^k at least `minPx` apart. 0 for an empty or non-finite
 * range or length.
 */
export function niceStep(min: number, max: number, lengthPx: number, minPx = MIN_TICK_PX): number {
  if (![min, max, lengthPx, minPx].every(Number.isFinite) || max <= min || lengthPx <= 0) return 0;
  const raw = ((max - min) * minPx) / lengthPx;
  if (!(raw > 0) || !Number.isFinite(raw)) return 0;
  const e = Math.floor(Math.log10(raw));
  for (let k = e - 1; k <= e + 1; k++) {
    const m = MANTISSAS.find((c) => scaled(c, k) >= raw * (1 - TOLERANCE));
    if (m !== undefined) return scaled(m, k);
  }
  return 0;
}

/** The fewest decimals (up to 12) that write `step` exactly, or null if none do. */
function decimalsOf(step: number): number | null {
  for (let d = 0; d <= 12; d++) {
    const s = step * 10 ** d;
    if (Math.abs(s - Math.round(s)) < TOLERANCE * Math.max(1, Math.abs(s))) return d;
  }
  return null;
}

/**
 * Multiples of `step` within [min, max] (with a 1e-9 tolerance), from integer
 * indices. A decimal step such as 0.1 is applied as n·1/10, so 3 steps give
 * 0.3 and not 0.30000000000000004.
 */
export function tickValues(min: number, max: number, step: number): number[] {
  if (!(step > 0) || !Number.isFinite(step) || !(max >= min)) return [];
  const lo = Math.ceil(min / step - TOLERANCE);
  const hi = Math.floor(max / step + TOLERANCE);
  const d = decimalsOf(step);
  const at = (n: number) => {
    if (n === 0) return 0;
    if (d === null || d === 0) return n * step;
    return (n * Math.round(step * 10 ** d)) / 10 ** d;
  };
  const out: number[] = [];
  for (let n = lo; n <= hi; n++) out.push(at(n));
  return out;
}

/** The automatic step for an axis and its ticks; step 0 and no ticks for an unusable axis. */
export function axisTicks(
  min: number,
  max: number,
  lengthPx: number
): { step: number; major: number[] } {
  const step = niceStep(min, max, lengthPx);
  return { step, major: step ? tickValues(min, max, step) : [] };
}

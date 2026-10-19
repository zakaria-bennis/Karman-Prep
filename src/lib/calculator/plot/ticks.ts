// Axis tick positions (NM-8). Values come from integer indices, never a running sum, so labels
// stay exact; the graph labels each major tick with formatAxisLabel(value, step).

export interface AxisTicks {
  step: number;
  major: number[];
  minor: number[];
} // labels: formatAxisLabel(value, step) per major tick (section 4), drawn by 08
export const MIN_MAJOR_TICK_PX = 80; // smallest 1, 2 or 5 x 10^k step at least this many px apart

const MANTISSAS = [1, 2, 5] as const;
const TOLERANCE = 1e-9;

/** (n·m)·10^k, written (n·m)/10^−k for k < 0 so each value is one correctly rounded operation. */
function scaled(n: number, m: number, k: number): number {
  const nm = n * m;
  if (nm === 0) return 0; // never −0
  return k >= 0 ? nm * 10 ** k : nm / 10 ** -k;
}

/** Index range of the multiples of `step` within [min, max], with a 1e-9 tolerance. */
function indexRange(min: number, max: number, step: number): [number, number] {
  return [Math.ceil(min / step - TOLERANCE), Math.floor(max / step + TOLERANCE)];
}

/**
 * Major ticks every `step`, the smallest 1, 2 or 5 × 10^k whose ticks lie at least
 * MIN_MAJOR_TICK_PX apart over `lengthPx`; minor ticks every step/5 (m 1 and 5) or step/4 (m 2),
 * skipping majors. Non-finite input, max ≤ min or lengthPx ≤ 0 gives no ticks and step 0.
 */
export function axisTicks(min: number, max: number, lengthPx: number): AxisTicks {
  const none: AxisTicks = { step: 0, major: [], minor: [] };
  if (![min, max, lengthPx].every(Number.isFinite) || max <= min || lengthPx <= 0) return none;
  const raw = ((max - min) * MIN_MAJOR_TICK_PX) / lengthPx;
  if (!Number.isFinite(raw) || raw <= 0) return none;
  const e = Math.floor(Math.log10(raw));
  let pick: { m: number; k: number } | null = null;
  for (let k = e - 1; k <= e + 1 && pick === null; k++) {
    const m = MANTISSAS.find((c) => scaled(1, c, k) >= raw * (1 - TOLERANCE));
    if (m !== undefined) pick = { m, k };
  }
  if (pick === null) return none;
  const { m, k } = pick;
  const step = scaled(1, m, k);
  const major: number[] = [];
  const [lo, hi] = indexRange(min, max, step);
  for (let n = lo; n <= hi; n++) major.push(scaled(n, m, k));
  // step/5 for 1 and 5, step/4 for 2, as m'·10^k': 1·10^k → 2·10^(k−1), 2·10^k → 5·10^(k−1),
  // 5·10^k → 1·10^k; every `ratio`-th minor index is a major.
  const [mm, kk] = m === 1 ? [2, k - 1] : m === 2 ? [5, k - 1] : [1, k];
  const ratio = m === 2 ? 4 : 5;
  const minor: number[] = [];
  const [mLo, mHi] = indexRange(min, max, scaled(1, mm, kk));
  for (let n = mLo; n <= mHi; n++) if (n % ratio !== 0) minor.push(scaled(n, mm, kk));
  return { step, major, minor };
}

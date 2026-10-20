// A slider's range maths: snapping to limits and step (SLIDERS-22), soft limits that grow to fit
// (SLIDERS-20), keyboard moves (SLIDERS-26), the thumb, zero marker and tick positions
// (SLIDERS-13, SLIDERS-14) and the value under a pointer (SLIDERS-24). Pure TypeScript.

import { roundNear, shortestBetween } from "./numbers";

/** The numbers a slider works with once its limits are evaluated; `step` 0 means none. */
export interface SliderRange {
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly hardMin: boolean;
  readonly hardMax: boolean;
}

export interface SnapInput {
  target: number;
  hardMin?: number;
  hardMax?: number;
  step?: number;
}

/**
 * SLIDERS-22: `target` clamped to the hard limits and snapped to `hardMin + k·step` (`k·step` with
 * no hard min). The limits and the result are cleaned to millionths within a tolerance of
 * min(1e-10, |max−min|/1000, step/10), so float noise such as 0.35·3 reads 1.05.
 */
export function snap({ target, hardMin, hardMax, step }: SnapInput): number {
  let tolerance = 1e-10;
  if (hardMin !== undefined && hardMax !== undefined) {
    tolerance = Math.min(tolerance, Math.abs(hardMax - hardMin) / 1000);
  }
  if (step) tolerance = Math.min(tolerance, step / 10);
  const lo = hardMin === undefined ? undefined : roundNear(hardMin, tolerance);
  const hi = hardMax === undefined ? undefined : roundNear(hardMax, tolerance);
  if (lo !== undefined && ((hi !== undefined && lo > hi) || target <= lo)) return lo;
  if (hi !== undefined && target >= hi) return hi;
  let t = target;
  if (step) {
    const base = lo ?? 0;
    t = step * Math.round((t - base) / step) + base;
  }
  const cleaned = roundNear(t, tolerance);
  if (step || lo === cleaned || hi === cleaned) t = cleaned;
  if (lo !== undefined && t <= lo) return lo;
  if (hi !== undefined && t >= hi) return hi;
  return t;
}

/**
 * SLIDERS-20: a soft min, min(−10, stored min, value, hard max), snapped outward to the step grid
 * based on 0.
 */
export function softMin(stored: number, value: number, hardMax: number | undefined, step: number) {
  let m = -10;
  if (stored < m) m = stored;
  if (value < m) m = value;
  if (hardMax !== undefined && hardMax < m) m = hardMax;
  if (step) {
    const s = snap({ target: m, hardMax, step });
    m = s <= m ? s : s - step;
  }
  return m;
}

/**
 * SLIDERS-20: a soft max, max(10, stored max, value, hard min), snapped outward to the step grid
 * based on the hard min (or 0).
 */
export function softMax(stored: number, value: number, hardMin: number | undefined, step: number) {
  let m = 10;
  if (stored > m) m = stored;
  if (value > m) m = value;
  if (hardMin !== undefined && hardMin > m) m = hardMin;
  if (step) {
    const s = snap({ target: m, hardMin, step });
    m = s >= m ? s : s + step;
  }
  return m;
}

/**
 * A value a slider may take: snapped (with `step` in place of the range's when given), then, unless
 * `ignoreSoftLimits`, held inside the soft limits too.
 */
export function constrain(
  range: SliderRange,
  target: number,
  options: { step?: number; ignoreSoftLimits?: boolean } = {}
): number {
  const v = snap({
    target,
    hardMin: range.hardMin ? range.min : undefined,
    hardMax: range.hardMax ? range.max : undefined,
    step: options.step ?? range.step,
  });
  if (!options.ignoreSoftLimits) {
    if (!range.hardMin && v < range.min) return range.min;
    if (!range.hardMax && v > range.max) return range.max;
  }
  return v;
}

export type KeyMove = "up" | "down" | "bigup" | "bigdown" | "min" | "max";

/**
 * SLIDERS-26: the value after a key. One step is the slider's step, or (max−min)/20 without one;
 * the move tries offsets k/3·step for k = 0..19 and counts a step each time the constrained value
 * passes the last one, so the result lands on the step grid. PageUp/PageDown count 5 steps; Home
 * and End go to the limits.
 */
export function keyMove(range: SliderRange, value: number, move: KeyMove): number {
  const step = range.step || (range.max - range.min) / 20;
  if (move === "min") return constrain(range, range.min);
  if (move === "max") return constrain(range, range.max);
  let left = move === "up" ? 1 : move === "down" ? -1 : move === "bigup" ? 5 : -5;
  let v = value;
  for (let k = 0; k < 20 && left !== 0; k++) {
    const offset = (k / 3) * step,
      before = v;
    if (left > 0) {
      v = constrain(range, value + offset, { step });
      if (v > before) left--;
    } else {
      v = constrain(range, value - offset, { step });
      if (v < before) left++;
    }
  }
  return v;
}

/** SLIDERS-14: where the thumb sits, as a percentage to 2 decimals; NaN when min = max. */
export function thumbPercent(range: SliderRange, value: number): number {
  const f = (value - range.min) / (range.max - range.min);
  return Math.round(1e4 * Math.min(1, Math.max(0, f))) / 100;
}

/** SLIDERS-12: the zero marker's percentage, or null when 0 is outside [min, max]. */
export function zeroPercent(range: SliderRange): number | null {
  if (!(range.min <= 0 && range.max >= 0) || range.min === range.max) return null;
  return (100 * -range.min) / (range.max - range.min);
}

/**
 * SLIDERS-13: tick percentages, one per multiple of step/(max−min) of the track, only when that
 * spacing is at least 3% and under 100%.
 */
export function tickPercents(range: SliderRange): number[] {
  if (!range.step) return [];
  const spacing = (100 * range.step) / (range.max - range.min);
  if (!(spacing >= 3 && spacing < 100)) return [];
  const out: number[] = [];
  for (let p = spacing; p < 100; p += spacing) out.push(p);
  return out;
}

/**
 * SLIDERS-24: the value at `x` px along a `width` px track: min + (max−min)·clamp(x/width), then
 * the shortest number within one pixel either side, then snapped to the step and limits.
 */
export function valueAtPixel(range: SliderRange, x: number, width: number): number {
  if (!(width > 0)) return range.min;
  const f = Math.min(1, Math.max(0, x / width));
  const raw = range.min + (range.max - range.min) * f,
    pixel = (range.max - range.min) / width;
  return constrain(range, shortestBetween(raw - pixel, raw + pixel));
}

/** SLIDERS-24: the pixel offset of `value` along a `width` px track. */
export function pixelOfValue(range: SliderRange, value: number, width: number): number {
  const f = (value - range.min) / (range.max - range.min);
  return width * Math.min(1, Math.max(0, Number.isFinite(f) ? f : 0));
}

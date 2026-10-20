// Axis numbers (GP-16, GP-19): plain decimals while an axis's largest visible |bound| lies strictly
// between 5e-5 and 5e6, otherwise scientific "m×10" with a raised exponent. Pure: no DOM.

import { formatAxisLabel } from "../core/eval/format";

/** GP-16: the plain range of an axis's largest visible |bound| (exclusive at both ends). */
export const PLAIN_BOUND_MIN = 5e-5;
export const PLAIN_BOUND_MAX = 5e6;

export type AxisNumber = { text: string; exponent?: string };

/** Whether an axis spanning [min, max] shows scientific numbers (GP-16). */
export function isScientificAxis(min: number, max: number): boolean {
  const bound = Math.max(Math.abs(min), Math.abs(max));
  return !(bound > PLAIN_BOUND_MIN && bound < PLAIN_BOUND_MAX);
}

const trimZeros = (s: string) => (s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s);
const fixed = (x: number, digits: number) => x.toFixed(Math.min(100, Math.max(0, digits)));

/**
 * The number at `v` on an axis of major `step`: plain (formatAxisLabel) or, on a scientific axis,
 * the mantissa with only the digits the step needs, "×10" and the exponent apart.
 */
export function axisNumber(v: number, step: number, scientific: boolean): AxisNumber {
  if (!scientific || !Number.isFinite(v) || v === 0) return { text: formatAxisLabel(v, step) };
  const a = Math.abs(v);
  if (a < 1e-6 * step) return { text: "0" };
  const k = Math.floor(Math.log10(step) + 1e-9);
  let n = Math.floor(Math.log10(a));
  let mantissa = fixed(v / 10 ** n, n - k);
  if (Math.abs(Number(mantissa)) >= 10) {
    n += 1;
    mantissa = fixed(v / 10 ** n, n - k);
  }
  return { text: `${trimZeros(mantissa)}×10`, exponent: String(n) };
}

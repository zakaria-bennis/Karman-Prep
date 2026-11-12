/*
 * Theta to the 200-800 section scale. Each section has a monotone piecewise-linear curve through
 * fitted knots (`data/scale-knots.json`, written by scripts/sat-engine/fit-scale.ts from College
 * Board's official raw-score conversion tables). Scores are rounded to the nearest 10 and kept
 * inside 200-800, as on the SAT.
 */
import knots from "./data/scale-knots.json";
import type { Section } from "./params";

type Knots = { theta: number[]; scale: number[] };
const KNOTS = knots as unknown as Record<Section, Knots> & { note?: string };

/** Unrounded scale value at `theta` (linear between knots, linear beyond the ends). */
export function rawScale(section: Section, theta: number): number {
  const { theta: xs, scale: ys } = KNOTS[section];
  if (theta <= xs[0]) return ys[0] + ((ys[1] - ys[0]) / (xs[1] - xs[0])) * (theta - xs[0]);
  const last = xs.length - 1;
  if (theta >= xs[last])
    return ys[last] + ((ys[last] - ys[last - 1]) / (xs[last] - xs[last - 1])) * (theta - xs[last]);
  let i = 0;
  while (theta > xs[i + 1]) i++;
  const t = (theta - xs[i]) / (xs[i + 1] - xs[i]);
  return ys[i] + t * (ys[i + 1] - ys[i]);
}

export const roundToTen = (x: number) => Math.round(x / 10) * 10;
export const clampScale = (x: number) => Math.max(200, Math.min(800, x));

/** Reported section score: rounded to 10, inside 200-800. */
export function sectionScaleScore(section: Section, theta: number): number {
  return clampScale(roundToTen(rawScale(section, theta)));
}

/** Theta that gives `score` on this section (inverse, by bisection). */
export function thetaForScale(section: Section, score: number): number {
  let low = -8;
  let high = 8;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (rawScale(section, mid) < score) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

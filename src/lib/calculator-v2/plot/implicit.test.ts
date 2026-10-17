import { expect, it } from "vitest";
import { NO_DEADLINE } from "../core/deadline";
import {
  at,
  distanceToGraphPx,
  mid,
  pointToSegmentPx,
  pxDistance,
  runsOf,
  segmentsOf,
  UP_TO_1080,
  VIEW_800,
  type Pt,
} from "./__fixtures__/measure";
import { EvaluationBudget, IMPLICIT_BUDGET } from "./budget";
import { sampleField, type NodeEvaluator } from "./field";
import type { RealFn2 } from "./geometry";
import { plotImplicit } from "./implicit";
import { plotLines } from "./lines";
import type { ViewSpec } from "./viewport";

const circle: RealFn2 = (x, y) => x * x + y * y - 25;
const curve = (F: RealFn2, view = VIEW_800) => plotImplicit("c", F, view, NO_DEADLINE);
const off = (w: ViewSpec, p: Pt) => Math.abs(Math.hypot(p[0], p[1]) - 5) * (w.size.width / 20);
it("G-16 x^2+y^2=25 lies within 0.5 px of the circle and closes, with no band, up to 1920×1080", () => {
  for (const view of UP_TO_1080) {
    const g = curve(circle, view);
    expect(g.bands).toHaveLength(0);
    for (const [a, b] of segmentsOf(g.polylines)) {
      expect(Math.max(off(view, a), off(view, b), off(view, mid(a, b)))).toBeLessThanOrEqual(0.5);
      expect(pxDistance(view, a, b)).toBeLessThanOrEqual(1.5);
    }
    const runs = runsOf(g.polylines);
    expect(runs).toHaveLength(1);
    expect(pxDistance(view, runs[0][0], runs[0].at(-1)!)).toBeLessThanOrEqual(1);
  }
}, 30_000);
it("G-16 xy=6 draws both branches with no connector", () => {
  const segments = segmentsOf(curve((x, y) => x * y - 6).polylines);
  expect(segments.some(([a]) => a[0] > 0) && segments.some(([a]) => a[0] < 0)).toBe(true);
  for (const [a, b] of segments) {
    expect(a[0] * b[0]).toBeGreaterThan(0);
    expect(distanceToGraphPx(VIEW_800, (x) => 6 / x, a)).toBeLessThanOrEqual(0.5);
  }
});
it("G-16 with y=5 the circle and its tangent line both draw and (0, 5) lies on both within 0.5 px", () => {
  const segments = segmentsOf(curve(circle).polylines);
  const gaps = segments.map(([a, b]) => pointToSegmentPx(VIEW_800, [0, 5], a, b));
  expect(Math.min(...gaps)).toBeLessThanOrEqual(0.5);
  const line = plotLines("l", "horizontal", (y) => y - 5, VIEW_800, NO_DEADLINE).positions;
  expect(line).toHaveLength(1);
  expect(Math.abs(line[0] - 5) * 40).toBeLessThanOrEqual(0.5);
});
it("G-15 the coarse pass fits a quarter of the budget and work beyond it falls back to bands", () => {
  const fill: NodeEvaluator = (x, y, out) => void (out[0] = circle(x, y));
  const budget = new EvaluationBudget(IMPLICIT_BUDGET, NO_DEADLINE);
  expect(sampleField(at({ width: 3840, height: 2160 }), 1, 1, fill, budget).cell).toBe(16);
  const dense = curve((x, y) => Math.sin(300 * x) * Math.sin(300 * y));
  expect(dense.evaluations).toBeLessThanOrEqual(IMPLICIT_BUDGET);
  expect(dense.bands.length).toBeGreaterThan(0);
});

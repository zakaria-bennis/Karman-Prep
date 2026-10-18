import { expect, it } from "vitest";
import { NO_DEADLINE } from "../core/deadline";
import {
  at,
  columnCoverage,
  runsOf,
  segmentsOf,
  VIEW_800,
  type Skip,
} from "./__fixtures__/measure";
import { EvaluationBudget } from "./budget";
import { explicitFrame, plotExplicit, sampleExplicit } from "./explicit";
import type { RealFn1 } from "./geometry";

const plot = (f: RealFn1) => plotExplicit("r", "x", f, VIEW_800, NO_DEADLINE);
const atZero: Skip = (x0, x1) => x0 <= 0 && 0 <= x1;
const never: Skip = () => false;
const tanPole: Skip = (x0, x1) => Math.floor(x0 / Math.PI - 0.5) !== Math.floor(x1 / Math.PI - 0.5);
const bandsOf = (b: Float64Array) =>
  Array.from({ length: b.length / 4 }, (_, k) => [b[4 * k], b[4 * k + 1]]);
it("G-12 every defined column's drawn extent covers at least 90% of its 64-sample range", () => {
  const cases: [RealFn1, Skip][] = [
    [(x) => Math.sin(100 * x), never],
    [(x) => Math.sin(1 / x), atZero],
    [Math.exp, never],
    [(x) => x ** 10, never],
    [(x) => (x - 0.01) ** 2, never],
    [Math.tan, tanPole],
    [(x) => 1 / x, atZero],
    [(x) => Math.sqrt(1 - x * x), never],
  ];
  for (const [f, skip] of cases) {
    const ratios = columnCoverage(VIEW_800, plot(f), f, skip).filter((r) => !Number.isNaN(r));
    expect(ratios.length).toBeGreaterThan(0);
    expect(Math.min(...ratios)).toBeGreaterThanOrEqual(0.9);
  }
});
it("G-12 sin(100x) and sin(1/x) near 0 draw as filled bands, never as a curve", () => {
  const fast = plot((x) => Math.sin(100 * x));
  expect(fast.bands.length / 4).toBeGreaterThanOrEqual(790);
  const slow = plot((x) => Math.sin(1 / x));
  for (const i of [396, 397, 398, 401, 402, 403]) {
    const x0 = -10 + i * 0.025; // the columns with 0.025 <= |x| <= 0.1
    const covers = ([a, b]: number[]) => a <= x0 + 1e-9 && b >= x0 + 0.025 - 1e-9;
    expect(bandsOf(slow.bands).some(covers)).toBe(true);
  }
  for (const g of [fast, slow]) {
    for (const [a, b] of segmentsOf(g.polylines)) {
      const [lo, hi] = [Math.min(a[0], b[0]), Math.max(a[0], b[0])];
      expect(bandsOf(g.bands).some(([c0, c1]) => lo < c1 && hi > c0)).toBe(false);
    }
  }
});
it("G-15 an exhausted explicit budget falls back to bands built from real samples", () => {
  const f = (x: number) => Math.tan(200 * x);
  const budget = new EvaluationBudget(3000, NO_DEADLINE);
  const out = sampleExplicit(f, explicitFrame(VIEW_800, "x"), budget);
  expect(budget.used).toBeLessThanOrEqual(3000);
  expect(out.bands.length).toBeGreaterThan(0);
  const vertices = runsOf(Float64Array.from(out.polyline)).flat(); // guard lines: v = ±15
  for (const [t, v] of vertices) expect(v === f(t) || Math.abs(v) === 15).toBe(true);
});
// Deviation from Task 3's literal turn rule (see explicit.ts): rounding noise in a constant
// function turns at almost every sample, which must not band the row or spend the budget.
it("G-12 an identity that is constant up to rounding draws as one curve, never as bands", () => {
  const identities: RealFn1[] = [
    (x) => Math.sin(x) ** 2 + Math.cos(x) ** 2,
    (x) => Math.sin(2 * x) - 2 * Math.sin(x) * Math.cos(x),
    (x) => 2 ** x * 2 ** -x,
    (x) => (x + 1) ** 2 - x * x - 2 * x,
    (x) => Math.tan(x) * Math.cos(x) - Math.sin(x),
  ];
  for (const view of [VIEW_800, at({ width: 3840, height: 2160 })]) {
    for (const f of identities) {
      const g = plotExplicit("r", "x", f, view, NO_DEADLINE);
      expect(g.bands).toHaveLength(0);
      const runs = runsOf(g.polylines);
      expect(runs).toHaveLength(1);
      expect([runs[0][0][0], runs[0].at(-1)![0]]).toEqual([
        view.viewport.left,
        view.viewport.right,
      ]);
      expect(g.evaluations).toBe(2 * view.size.width + 1); // the base grid only
    }
  }
});

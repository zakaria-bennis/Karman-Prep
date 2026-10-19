import { expect, it } from "vitest";
import { NO_DEADLINE } from "../core/deadline";
import {
  at,
  expectG11,
  pxDistance,
  runsOf,
  segmentsOf,
  SHIFTED,
  VIEW_800,
  viewOf,
} from "./__fixtures__/measure";
import { plotExplicit } from "./explicit";
import type { RealFn1 } from "./geometry";
import { defaultViewport, zoomViewport, type ViewSpec } from "./viewport";

const plot = (f: RealFn1, view = VIEW_800) => plotExplicit("r", "x", f, view, NO_DEADLINE);
// Exact binary samples -8 - 1/128 + j/64; the first pole bisection lands exactly on x = 0 for 1/x and x = 2 for (x^2-1)/(x-2)
const POLE_HIT = viewOf(
  { left: -8 - 1 / 128, right: 8 - 1 / 128, bottom: -6, top: 6 },
  { width: 512, height: 384 }
);
it("G-9 no segment crosses a pole of tan x, 1/x or (x^2-1)/(x-2), also when a bisection lands on the pole", () => {
  const cases: [RealFn1, RealFn1][] = [
    [Math.tan, (x) => Math.floor((x - Math.PI / 2) / Math.PI)],
    [(x) => 1 / x, Math.sign],
    [(x) => (x * x - 1) / (x - 2), (x) => (x < 2 ? 0 : 1)],
  ];
  for (const view of [VIEW_800, POLE_HIT]) {
    for (const [f, piece] of cases) {
      const segments = segmentsOf(plot(f, view).polylines);
      expect(segments.length).toBeGreaterThan(100);
      for (const [a, b] of segments) expect(piece(a[0])).toBe(piece(b[0]));
    }
  }
});
it("G-10 curves reach their domain endpoints", () => {
  for (const view of [VIEW_800, SHIFTED]) {
    const runs = (f: RealFn1) => runsOf(plot(f, view).polylines);
    const circle = runs((x) => Math.sqrt(1 - x * x));
    expect(circle).toHaveLength(1);
    expect(pxDistance(view, circle[0][0], [-1, 0])).toBeLessThanOrEqual(0.5);
    expect(pxDistance(view, circle[0].at(-1)!, [1, 0])).toBeLessThanOrEqual(0.5);
    expect(pxDistance(view, runs(Math.sqrt)[0][0], [0, 0])).toBeLessThanOrEqual(0.5);
    const moved = runs((x) => Math.sqrt(x - 3) + 2);
    expect(pxDistance(view, moved[0][0], [3, 2])).toBeLessThanOrEqual(0.5);
    const ln = runs(Math.log);
    expect(ln).toHaveLength(1);
    expect(ln[0][0][1]).toBeLessThanOrEqual(view.viewport.bottom);
    expect(ln[0].at(-1)![0]).toBeGreaterThanOrEqual(9.99);
  }
});
it("G-11 vertices and segment midpoints lie within 0.5 px, also after a 1e6 zoom about (1, f(1))", () => {
  const fs: RealFn1[] = [(x) => x * x, (x) => x ** 10, Math.exp, Math.sin, (x) => 1 / x, Math.tan];
  for (const f of fs) {
    const zoomed = viewOf(zoomViewport(VIEW_800.viewport, 1e6, { x: 1, y: f(1) }));
    for (const view of [VIEW_800, zoomed]) expectG11(view, f, segmentsOf(plot(f, view).polylines));
  }
});
it("G-11, G-12 at 1440×900 x^10 and 0.5^x zoomed out ×10 draw their visible parts as curves, not bands", () => {
  const size = { width: 1440, height: 900 };
  const out = viewOf(zoomViewport(defaultViewport(size), 0.1, { x: 0, y: 0 }), size);
  const cases: [RealFn1, ViewSpec, number, number][] = [
    [(x) => x ** 10, at(size), -1.2, 1.2],
    [(x) => 0.5 ** x, out, -5.9, 100],
  ];
  for (const [f, view, lo, hi] of cases) {
    const { bands, polylines } = plot(f, view);
    for (let k = 0; k < bands.length; k += 4) expect(bands[k + 1] < lo || bands[k] > hi).toBe(true);
    const inside = segmentsOf(polylines).filter(([a, b]) => a[0] >= lo && b[0] <= hi);
    expect(inside.length).toBeGreaterThan(100);
    expectG11(view, f, inside);
  }
});
it("G-13 removable holes leave no break wider than 1 px and no marker", () => {
  const fs: RealFn1[] = [(x) => (x * x - 1) / (x - 1), (x) => Math.sin(x) / x, (x) => x / x];
  for (const f of fs) {
    for (const view of [VIEW_800, SHIFTED]) {
      const g = plot(f, view);
      expect([g.kind, g.bands.length]).toEqual(["curve", 0]);
      const runs = runsOf(g.polylines);
      const gap = (k: number) => pxDistance(view, runs[k - 1].at(-1)!, runs[k][0]);
      for (let k = 1; k < runs.length; k++) expect(gap(k)).toBeLessThanOrEqual(1);
    }
  }
});

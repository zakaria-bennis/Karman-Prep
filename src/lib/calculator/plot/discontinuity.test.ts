// Jumps, asymptotes, chained boundaries and empty sets, each checked against what Desmos draws.
import { expect, it } from "vitest";
import { NO_DEADLINE } from "../core/deadline";
import { runsOf, segmentsOf, SHIFTED, VIEW_800, viewOf } from "./__fixtures__/measure";
import { plotExplicit } from "./explicit";
import type { CurveGeometry, LineSetGeometry, RealFn1, RealFn2 } from "./geometry";
import { plotImplicit } from "./implicit";
import { plotLines } from "./lines";
import { plotRegion } from "./region";

const plot = (f: RealFn1, view = VIEW_800) => plotExplicit("r", "x", f, view, NO_DEADLINE);
/** A region boundary as the curve a plotted inequality gives. */
const asCurve = (b: CurveGeometry | LineSetGeometry) => b as CurveGeometry;
const mod = (x: number, m: number) => x - m * Math.floor(x / m);
const piecewise = (x: number) => (x < 0 ? -1 : x < 2 ? 1 : 3);

it("steps, sawtooth wraps, sign and piecewise seams are never joined by a riser", () => {
  const cases: [RealFn1, RealFn1][] = [
    [Math.floor, Math.floor],
    [Math.ceil, Math.ceil],
    [Math.round, Math.round],
    [(x) => Math.floor(x * x), (x) => Math.floor(x * x)],
    [(x) => mod(x, 3), (x) => Math.floor(x / 3)],
    [(x) => mod(-x, 2), (x) => Math.floor(-x / 2)],
    [(x) => x - Math.floor(x), Math.floor],
    [Math.sign, Math.sign],
    [piecewise, piecewise],
  ];
  for (const view of [VIEW_800, SHIFTED]) {
    for (const [f, piece] of cases) {
      const g = plot(f, view);
      expect(g.bands).toHaveLength(0);
      const segments = segmentsOf(g.polylines);
      expect(segments.length).toBeGreaterThan(10);
      for (const [a, b] of segments) expect(piece(a[0]) === piece(b[0])).toBe(true);
    }
  }
});

it("each step of floor(x) and floor(10x)/10 reaches within 1 px of its jump", () => {
  const fine = viewOf({ left: -1, right: 1, bottom: -0.75, top: 0.75 });
  for (const [f, view, step] of [
    [Math.floor, VIEW_800, 1],
    [(x: number) => Math.floor(10 * x) / 10, fine, 0.1],
  ] as const) {
    const pxPerUnit = view.size.width / (view.viewport.right - view.viewport.left);
    for (const run of runsOf(plot(f, view).polylines)) {
      const [start, end] = [run[0][0], run.at(-1)![0]];
      if (start > view.viewport.left) {
        expect(Math.abs(start - Math.round(start / step) * step) * pxPerUnit).toBeLessThan(1);
      }
      if (end < view.viewport.right) {
        expect(Math.abs(end - Math.round(end / step) * step) * pxPerUnit).toBeLessThan(1);
      }
    }
  }
});

it("steep continuous curves stay joined: tanh(100x), atan(1000x), cbrt", () => {
  const fs: RealFn1[] = [(x) => Math.tanh(100 * x), (x) => Math.atan(1000 * x), Math.cbrt];
  for (const f of fs) {
    const g = plot(f, VIEW_800);
    expect([runsOf(g.polylines).length, g.bands.length]).toEqual([1, 0]);
  }
});

it("log(sin x) runs each spike off the bottom of the view", () => {
  const g = plot((x) => Math.log10(Math.sin(x)), VIEW_800);
  const runs = runsOf(g.polylines);
  expect(runs.length).toBeGreaterThanOrEqual(3);
  const { left, right, bottom } = VIEW_800.viewport;
  for (const run of runs) {
    if (run[0][0] > left) expect(run[0][1]).toBeLessThan(bottom);
    if (run.at(-1)![0] < right) expect(run.at(-1)![1]).toBeLessThan(bottom);
  }
});

const curve = (F: RealFn2) => plotImplicit("c", F, VIEW_800, NO_DEADLINE);
const xPx = VIEW_800.size.width / 20;

it("y > floor(x), y > tan x and y > 1/x draw no boundary along a jump or an asymptote", () => {
  const cases: [RealFn1, (x: number) => number][] = [
    [Math.floor, Math.floor],
    [Math.tan, (x) => Math.floor(x / Math.PI + 0.5)],
    [(x) => 1 / x, Math.sign],
  ];
  for (const [f, piece] of cases) {
    const g = plotRegion("r", [(x, y) => y, (x) => f(x)], [">"], VIEW_800, NO_DEADLINE);
    const segments = segmentsOf(asCurve(g.boundaries[0]).polylines);
    expect(segments.length).toBeGreaterThan(100);
    for (const [a, b] of segments) expect(piece(a[0])).toBe(piece(b[0]));
  }
});

it("tan(x) = y^2 has no line along its asymptotes", () => {
  const segments = segmentsOf(curve((x, y) => Math.tan(x) - y * y).polylines);
  const piece = (x: number) => Math.floor(x / Math.PI + 0.5);
  expect(segments.length).toBeGreaterThan(100);
  for (const [a, b] of segments) expect(piece(a[0])).toBe(piece(b[0]));
});

it("floor(x^2+y^2) = 4 is the circle of radius √5 and floor(x) = floor(y) the lower-right edges", () => {
  for (const [a, b] of segmentsOf(curve((x, y) => Math.floor(x * x + y * y) - 4).polylines)) {
    expect(Math.abs(Math.hypot(a[0], a[1]) - Math.sqrt(5)) * xPx).toBeLessThanOrEqual(1.5);
    expect(Math.abs(Math.hypot(b[0], b[1]) - Math.sqrt(5)) * xPx).toBeLessThanOrEqual(1.5);
  }
  const stairs = segmentsOf(curve((x, y) => Math.floor(x) - Math.floor(y)).polylines);
  expect(stairs.length).toBeGreaterThan(100);
  for (const p of stairs.flat()) {
    // Each point lies on the bottom edge (y = n, n ≤ x ≤ n + 1) or the right edge (x = n + 1).
    const n = Math.round(p[1]);
    const onBottom = Math.abs(p[1] - n) * xPx <= 1 && p[0] >= n - 0.05 && p[0] <= n + 1.05;
    const m = Math.round(p[0]);
    const onRight = Math.abs(p[0] - m) * xPx <= 1 && p[1] >= m - 1.05 && p[1] <= m + 0.05;
    expect(onBottom || onRight, `(${p[0]}, ${p[1]})`).toBe(true);
  }
});

it("a chained inequality draws each boundary only where it borders the region", () => {
  const eps = 1.5 / xPx;
  const chain = plotRegion(
    "r",
    [() => -1, (x, y) => y, (x) => x],
    ["<", "<"],
    VIEW_800,
    NO_DEADLINE
  );
  const [low, high] = chain.boundaries.map((b) => segmentsOf(asCurve(b).polylines).flat());
  expect(low.length * high.length).toBeGreaterThan(0);
  for (const p of low) expect(p[0]).toBeGreaterThanOrEqual(-1 - eps); // y = -1 right of x = -1
  for (const p of high) expect(p[1]).toBeGreaterThanOrEqual(-1 - eps); // y = x above y = -1
  const parabola = plotRegion(
    "r",
    [(x) => x * x, (x, y) => y, () => 4],
    ["<", "<"],
    VIEW_800,
    NO_DEADLINE
  );
  for (const p of parabola.boundaries.flatMap((b) => segmentsOf(asCurve(b).polylines).flat())) {
    expect(Math.abs(p[0])).toBeLessThanOrEqual(2 + eps);
    expect(p[1]).toBeLessThanOrEqual(4 + eps);
  }
});

it("x < x, 0 = x − x and x = x draw nothing", () => {
  const empty = plotRegion("r", [(x) => x, (x) => x], ["<"], VIEW_800, NO_DEADLINE);
  expect([empty.spans.length, asCurve(empty.boundaries[0]).polylines.length]).toEqual([0, 0]);
  expect(asCurve(empty.boundaries[0]).bands).toHaveLength(0);
  const zero = curve((x) => x - x);
  expect([zero.polylines.length, zero.bands.length]).toEqual([0, 0]);
  const lines = plotLines("l", "vertical", (x) => x - x, VIEW_800, NO_DEADLINE);
  expect(lines.positions).toHaveLength(0);
  expect(plotLines("l", "vertical", (x) => x - 3, VIEW_800, NO_DEADLINE).positions).toEqual(
    Float64Array.from([3])
  );
  const floorLine = plotLines("l", "vertical", Math.floor, VIEW_800, NO_DEADLINE).positions;
  expect(floorLine).toHaveLength(1); // floor(x) = 0: only x = 1, where f ≤ 0 meets f > 0
  expect(Math.abs(floorLine[0] - 1) * xPx).toBeLessThan(0.5);
});

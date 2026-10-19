import { expect, it } from "vitest";
import { NO_DEADLINE } from "../core/deadline";
import type { InequalityOp } from "../core/latex/ast";
import { mid, runsOf, segmentsOf, shadedMask, UP_TO_1080, VIEW_800 } from "./__fixtures__/measure";
import type { CurveGeometry, RealFn2 } from "./geometry";
import { plotConstantRegion, plotRegion } from "./region";
import { pxToWorld } from "./viewport";

const LINE: RealFn2[] = [(x, y) => y, (x) => 2 * x + 1];
const BAND: RealFn2[] = [() => 1, (x, y) => y, () => 3];
const DISC: RealFn2[] = [(x, y) => x * x + y * y, () => 25];
// [terms, ops, holds, distance to the boundary in world units]
const CASES: [RealFn2[], InequalityOp[], (x: number, y: number) => boolean, RealFn2][] = [
  [LINE, ["<="], (x, y) => y <= 2 * x + 1, (x, y) => Math.abs(y - 2 * x - 1) / Math.sqrt(5)],
  [BAND, ["<", "<"], (x, y) => 1 < y && y < 3, (x, y) => Math.abs(Math.abs(y - 2) - 1)],
  [DISC, ["<"], (x, y) => x * x + y * y < 25, (x, y) => Math.abs(Math.hypot(x, y) - 5)],
];
const region = (terms: RealFn2[], ops: InequalityOp[], view = VIEW_800) =>
  plotRegion("r", terms, ops, view, NO_DEADLINE);
it("G-17 every pixel centre more than 1 px from the boundary is shaded exactly when it holds, up to 1920×1080", () => {
  for (const view of UP_TO_1080) {
    const { width, height } = view.size;
    const px = (d: number) => d * (width / 20);
    for (const [terms, ops, holds, dist] of CASES) {
      const g = region(terms, ops, view);
      const mask = shadedMask(g, view.size);
      let wrong = 0;
      for (let n = 0; n < width * height; n++) {
        const [x, y] = pxToWorld(view, (n % width) + 0.5, Math.floor(n / width) + 0.5);
        if (px(dist(x, y)) > 1 && (mask[n] === 1) !== holds(x, y)) wrong++;
      }
      expect(wrong).toBe(0);
      const curves = g.boundaries.filter((b): b is CurveGeometry => b.kind === "curve");
      const vertices = curves.flatMap((b) => runsOf(b.polylines).flat());
      expect(vertices.length).toBeGreaterThan(0);
      for (const [x, y] of vertices) expect(px(dist(x, y))).toBeLessThanOrEqual(1);
      for (const [a, b] of curves.flatMap((c) => segmentsOf(c.polylines))) {
        expect(px(dist(...mid(a, b)))).toBeLessThanOrEqual(1);
      }
    }
  }
  expect(Array.from(plotConstantRegion("k", true, VIEW_800).spans)).toEqual([0, 600, 0, 800]);
  expect(plotConstantRegion("k", false, VIEW_800).spans).toHaveLength(0);
}, 30_000);
it("G-1 a strict inequality's boundary is dashed and a non-strict one solid", () => {
  const dashes = (t: RealFn2[], ops: InequalityOp[]) =>
    region(t, ops).boundaries.map((b) => b.dashed);
  expect(dashes(LINE, ["<"])).toEqual([true]);
  expect(dashes(LINE, ["<="])).toEqual([false]);
  expect(dashes(BAND, ["<", "<="])).toEqual([true, false]);
});

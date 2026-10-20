import { expect, it } from "vitest";
import { NO_DEADLINE } from "../core/deadline";
import type { InequalityOp } from "../core/latex/ast";
import {
  at,
  mid,
  runsOf,
  segmentsOf,
  shadedMask,
  UP_TO_1080,
  VIEW_800,
} from "./__fixtures__/measure";
import { EvaluationBudget, IMPLICIT_BUDGET } from "./budget";
import { sampleField, type SampledField } from "./field";
import type { CurveGeometry, RealFn2 } from "./geometry";
import { plotConstantRegion, plotRegion, relationHolds, shadedSpans } from "./region";
import { pxToWorld, type ViewSpec } from "./viewport";

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

/** The per-pixel definition shadedSpans must reproduce: every pixel judged by pixelValue. */
function spansByPixel(field: SampledField, ops: readonly InequalityOp[], view: ViewSpec): number[] {
  const { width, height } = view.size;
  const spans: number[] = [];
  for (let j = 0; j < field.height; j++) {
    let start = -1;
    for (let i = 0; i <= field.width; i++) {
      const inside =
        i < field.width && ops.every((op, k) => relationHolds(op, field.pixelValue(i, j, k)));
      if (inside && start < 0) start = i;
      else if (!inside && start >= 0) {
        spans.push(j, Math.min(j + 1, height), start, Math.min(i, width));
        start = -1;
      }
    }
  }
  return spans;
}

it("G-17, G-22 shadedSpans judges whole inactive squares at once yet matches a pixel-by-pixel judgement, with and without refused splits", () => {
  const cases: [RealFn2[], InequalityOp[], number][] = [
    [[(_x, y) => y, () => 0], [">"], IMPLICIT_BUDGET],
    [[(_x, y) => y, (x) => x], [">"], 2000],
    [BAND, ["<", "<"], IMPLICIT_BUDGET],
    [DISC, ["<="], 30_000],
    [[(_x, y) => y, (x) => Math.sqrt(x) * Math.sin(3 * x)], ["<"], 50_000],
    [[(x, y) => Math.sin(3 * x) * Math.sin(3 * y), () => 0], ["<"], 20_000],
    [[(x, y) => Math.floor(y), () => 0], [">="], IMPLICIT_BUDGET],
  ];
  let refused = 0;
  for (const view of [
    VIEW_800,
    at({ width: 333.5, height: 201.25 }),
    at({ width: 7, height: 1 }),
  ]) {
    for (const [terms, ops, limit] of cases) {
      const values = new Float64Array(terms.length);
      const field = sampleField(
        view,
        ops.length,
        terms.length,
        (x, y, out) => {
          for (let t = 0; t < terms.length; t++) values[t] = terms[t](x, y);
          for (let k = 0; k < ops.length; k++) out[k] = values[k] - values[k + 1];
        },
        new EvaluationBudget(limit, NO_DEADLINE)
      );
      if (field.unresolved.length > 0) refused++;
      expect(shadedSpans(field, ops, view)).toEqual(spansByPixel(field, ops, view));
    }
  }
  expect(refused).toBeGreaterThan(0); // the pixel-by-pixel edge path ran too
}, 20_000);

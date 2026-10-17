import { expect, it } from "vitest";
import type { RegionGeometry } from "../plot/geometry";
import type { PixelSize, Viewport, ViewSpec } from "../plot/viewport";
import { compositeShading, contrastRatio } from "../theme/contrast";
import { alignRegionSpans, buildShadingRects, type ShadingRegion } from "./shading";

const vp = (l: number, r: number, b: number, t: number): Viewport => ({
  left: l,
  right: r,
  bottom: b,
  top: t,
});
const DEFAULT = vp(-10, 10, -7.5, 7.5);
const SIZE: PixelSize = { width: 800, height: 600 };
const view = (v: Viewport = DEFAULT, size: PixelSize = SIZE): ViewSpec => ({
  viewport: v,
  size,
  dpr: 1,
});

const PAPER = "#fbf8f1";
const region = (spans: number[], color: string, fillAlpha: number): ShadingRegion => ({
  spans: new Float32Array(spans),
  color,
  fillAlpha,
});
const A = region([0, 10, 0, 10], "#1f5fbf", 0.1);
const B = region([5, 15, 5, 15], "#b8322a", 0.12);
const f = (r: ShadingRegion) => ({ color: r.color, alpha: r.fillAlpha });
const a = compositeShading(PAPER, [f(A)]);
const b = compositeShading(PAPER, [f(B)]);
const ab = compositeShading(PAPER, [f(A), f(B)]);

it("G-5 overlapping region spans paint the compositeShading colour of every covering fill (G-17), rows merged", () => {
  expect(buildShadingRects([A, B], PAPER, { width: 20, height: 20 }, 1)).toEqual([
    { x: 0, y: 0, width: 10, height: 5, color: a },
    { x: 0, y: 5, width: 5, height: 5, color: a },
    { x: 5, y: 5, width: 5, height: 5, color: ab },
    { x: 10, y: 5, width: 5, height: 5, color: b },
    { x: 5, y: 10, width: 10, height: 5, color: b },
  ]);
});

it("G-5 a device pixel is shaded exactly when its centre lies inside a region span", () => {
  const r = region([0.3, 1.2, 0.3, 1.2], "#1f5fbf", 0.1);
  expect(buildShadingRects([r], PAPER, { width: 2, height: 2 }, 2)).toEqual([
    { x: 1, y: 1, width: 1, height: 1, color: compositeShading(PAPER, [f(r)]) },
  ]);
});

it("G-5 stacked region fills never paint the paper and stay within TH-8's 1.3:1", () => {
  const regions = ["#1f5fbf", "#b8322a", "#2c7a3f", "#7a3fa0"].map((c) =>
    region([0, 4, 0, 4], c, 0.12)
  );
  const rects = buildShadingRects(regions, PAPER, { width: 4, height: 4 }, 1);
  expect(rects).toHaveLength(1);
  const [{ color }] = rects;
  expect(color).not.toBe(PAPER);
  expect(contrastRatio(color, PAPER)).toBeLessThanOrEqual(1.3 + 1e-9);
});

it("G-5 region spans follow a pan and are withheld after a zoom until fresh geometry arrives", () => {
  const g: RegionGeometry = {
    kind: "region",
    rowId: "1",
    evaluations: 0,
    spans: new Float32Array([0, 300, 0, 800]),
    boundaries: [],
  };
  expect(alignRegionSpans(g, view(), view())).toBe(g);

  const panned = alignRegionSpans(g, view(), view(vp(-8, 12, -6, 9)));
  expect(Array.from(panned.spans)).toEqual([60, 360, -80, 720]);

  const zoomed = alignRegionSpans(g, view(), view(vp(-5, 5, -3.75, 3.75)));
  expect(zoomed.spans).toHaveLength(0);
  expect(zoomed.boundaries).toBe(g.boundaries);

  const resized = alignRegionSpans(g, view(), view(DEFAULT, { width: 400, height: 300 }));
  expect(resized.spans).toHaveLength(0);
});

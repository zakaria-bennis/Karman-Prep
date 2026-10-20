import { expect, it } from "vitest";
import type { RegionGeometry } from "../plot/geometry";
import type { PixelSize, Viewport, ViewSpec } from "../plot/viewport";
import { compositeOver } from "../theme/contrast";
import { alignRegionSpans, buildShadingRects, stackFills, type ShadingRegion } from "./shading";

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
const a = stackFills([f(A)]);
const b = stackFills([f(B)]);
const ab = stackFills([f(A), f(B)]);

it("G-5 overlapping region spans paint the stacked fills of every covering region (G-17), rows merged", () => {
  expect(buildShadingRects([A, B], { width: 20, height: 20 }, 1)).toEqual([
    { x: 0, y: 0, width: 10, height: 5, ...a },
    { x: 0, y: 5, width: 5, height: 5, ...a },
    { x: 5, y: 5, width: 5, height: 5, ...ab },
    { x: 10, y: 5, width: 5, height: 5, ...b },
    { x: 5, y: 10, width: 10, height: 5, ...b },
  ]);
});

it("G-5 a device pixel is shaded exactly when its centre lies inside a region span", () => {
  const r = region([0.3, 1.2, 0.3, 1.2], "#1f5fbf", 0.1);
  expect(buildShadingRects([r], { width: 2, height: 2 }, 2)).toEqual([
    { x: 1, y: 1, width: 1, height: 1, color: "#1f5fbf", alpha: 0.1 },
  ]);
});

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** `fill` painted over the opaque `under` colour. */
const over = (fill: { color: string; alpha: number }, under: string) =>
  compositeOver(fill.color, fill.alpha, under);

it("GP-26, GP-27 stacked fills over any paper equal the fills painted one by one in row order, with no cap", () => {
  const colours = ["#c74440", "#2d70b3", "#348543", "#6042a6"];
  const fills = colours.map((c) => ({ color: c, alpha: 0.4 }));
  const stacked = stackFills(fills);
  expect(stacked.alpha).toBeCloseTo(1 - 0.6 ** 4, 9);
  for (const paper of [PAPER, "#ffffff", "#000000"]) {
    const oneByOne = colours.reduce((under, c) => compositeOver(c, 0.4, under), paper);
    const got = channels(over(stacked, paper));
    channels(oneByOne).forEach((v, i) => expect(Math.abs(v - got[i])).toBeLessThanOrEqual(1));
  }
  // GP-27: the auto-green row over the blue row reads #7caca2 on white (to 1 in 255).
  const overlap = over(
    stackFills([
      { color: "#2d70b3", alpha: 0.4 },
      { color: "#348543", alpha: 0.4 },
    ]),
    "#ffffff"
  );
  const want = channels("#7caca2");
  channels(overlap).forEach((v, i) => expect(Math.abs(v - want[i])).toBeLessThanOrEqual(1));
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

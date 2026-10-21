import { expect, it } from "vitest";
import type { Geometry } from "@/lib/calculator/plot/geometry";
import type { Viewport, ViewSpec } from "@/lib/calculator/plot/viewport";
import {
  collectFitPoints,
  fitSearchView,
  fitViewport,
  geometryFitPoints,
  type FitPoints,
} from "./fit-view";

const V: Viewport = { left: -10, right: 10, bottom: -7.5, top: 7.5 };
const view = (viewport: Viewport = V): ViewSpec => ({
  viewport,
  size: { width: 800, height: 600 },
  dpr: 1,
});
const close = (a: Viewport, b: Viewport) => {
  for (const k of ["left", "right", "bottom", "top"] as const) expect(a[k]).toBeCloseTo(b[k], 9);
};

it("fits key points with 10% margins, the tighter axis deciding, at the current x:y units per px", () => {
  // x −1…3 needs 5 units over 800 px; y −2…2 needs 5 units over 600 px, so y decides.
  close(fitViewport({ xs: [-1, 3], ys: [-2, 2] }, view())!, {
    left: 1 - 10 / 3,
    right: 1 + 10 / 3,
    bottom: -2.5,
    top: 2.5,
  });
  // y shown at twice x's units per px stays so: circles drawn round stay round.
  const stretched = view({ left: -10, right: 10, bottom: -15, top: 15 });
  const fitted = fitViewport({ xs: [0, 8], ys: [0, 8] }, stretched)!;
  expect((fitted.top - fitted.bottom) / 600 / ((fitted.right - fitted.left) / 800)).toBeCloseTo(
    2,
    9
  );
  expect(fitted.right - fitted.left).toBeCloseTo(10, 9); // x: 8 units / 0.8
});

it("a single point or a single coordinate keeps the scale; nothing gives null", () => {
  close(fitViewport({ xs: [3], ys: [1] }, view())!, {
    left: -7,
    right: 13,
    bottom: -6.5,
    top: 8.5,
  });
  // Only a vertical line x = 4: centred on it, y untouched.
  close(fitViewport({ xs: [4], ys: [] }, view())!, { left: -6, right: 14, bottom: -7.5, top: 7.5 });
  expect(fitViewport({ xs: [], ys: [] }, view())).toBeNull();
});

it("with a phone keypad over the bottom, the fit uses the visible part above it", () => {
  // 200 of 600 px covered: y −2…2 needs 5 units over 400 px; centred 200 px from the top.
  const fitted = fitViewport({ xs: [0], ys: [-2, 2] }, view(), 200)!;
  expect(fitted.top).toBeCloseTo(2.5, 9);
  expect(fitted.top - fitted.bottom).toBeCloseTo(7.5, 9);
  expect(fitted.right - fitted.left).toBeCloseTo(10, 9);
});

it("drawn geometry gives points, table data, line positions and a finite curve's extent only", () => {
  const out: FitPoints = { xs: [], ys: [] };
  const geometries: Geometry[] = [
    { kind: "points", rowId: "p", evaluations: 0, coords: new Float64Array([1, 2, NaN, 3]) },
    {
      kind: "table",
      rowId: "t",
      evaluations: 0,
      series: [{ column: 1, coords: new Float64Array([5, 6]) }],
    },
    {
      kind: "lines",
      rowId: "l",
      evaluations: 0,
      orientation: "vertical",
      positions: new Float64Array([-4]),
      dashed: false,
    },
    // A circle of radius 3 inside the view, and a curve running off its top edge.
    {
      kind: "curve",
      rowId: "c",
      evaluations: 0,
      polylines: new Float64Array([-3, 0, 0, 3, 3, 0, 0, -3, -3, 0]),
      bands: new Float64Array(0),
      dashed: false,
    },
    {
      kind: "curve",
      rowId: "e",
      evaluations: 0,
      polylines: new Float64Array([0, 1, 2, 7.5]),
      bands: new Float64Array(0),
      dashed: false,
    },
  ];
  for (const g of geometries) geometryFitPoints(g, V, out);
  expect(out.xs).toEqual([1, 5, -4, -3, 3]);
  expect(out.ys).toEqual([2, 6, -3, 3]);
});

it("collects every row's points of interest, intersections included, from a wider search", () => {
  const search = fitSearchView(view(), V);
  expect(search.viewport.right).toBeCloseTo(40, 9);
  const engine = {
    poiCurves: (id: string) =>
      id === "a"
        ? [{ independent: "x" as const, f: (x: number) => x * x - 4 }]
        : [{ independent: "x" as const, f: (x: number) => x + 16, linear: true }],
  };
  const geometry = new Map<string, Geometry>([
    ["a", { kind: "points", rowId: "a", evaluations: 0, coords: new Float64Array(0) }],
    ["b", { kind: "points", rowId: "b", evaluations: 0, coords: new Float64Array(0) }],
  ]);
  const rows = [
    { id: "a", hidden: false },
    { id: "b", hidden: false },
  ] as unknown as Parameters<typeof collectFitPoints>[1]["rows"];
  const points = collectFitPoints(engine, { rows, geometry }, view(), search);
  // y=x²−4: zeros ±2, vertex (0, −4); y=x+16: zero −16, intercept 16; they meet at x = −4 and 5.
  expect(Math.min(...points.xs)).toBeCloseTo(-16, 6);
  expect(Math.max(...points.xs)).toBeCloseTo(5, 6);
  expect(Math.min(...points.ys)).toBeCloseTo(-4, 6);
  expect(Math.max(...points.ys)).toBeCloseTo(21, 6);
});

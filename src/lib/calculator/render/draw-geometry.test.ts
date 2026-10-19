import { expect, it } from "vitest";
import type { CurveGeometry, Geometry, LineSetGeometry } from "../plot/geometry";
import type { PixelSize, Viewport, ViewSpec } from "../plot/viewport";
import { createRecordingContext, type RecordedCall } from "./__fixtures__/recording-context";
import {
  AXIS_LINE_PX,
  CROSS_ARM_PX,
  CURVE_CUT_PX,
  CURVE_LINE_PX,
  CURVE_SELECTED_LINE_PX,
  DASH_PX,
  GRID_LINE_PX,
  POINT_HOLE_PX,
  POINT_RADIUS_PX,
} from "./constants";
import { drawCurveLayer, drawPointLayer } from "./draw-geometry";
import type { RenderRow } from "./types";

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

const COLOR = "#1f5fbf";
const PAPER = "#ffffff";
const curve = (polylines: number[], dashed: boolean): CurveGeometry => ({
  kind: "curve",
  rowId: "1",
  evaluations: 0,
  polylines: new Float64Array(polylines),
  bands: new Float64Array(0),
  dashed,
});
const rowOf = (geometry: Geometry): RenderRow => ({
  rowId: "1",
  color: COLOR,
  fillAlpha: 0.1,
  geometry,
});
const curveRow = (polylines: number[], dashed: boolean) => rowOf(curve(polylines, dashed));
const lineRow = (orientation: LineSetGeometry["orientation"], positions: number[]) =>
  rowOf({
    kind: "lines",
    rowId: "1",
    evaluations: 0,
    orientation,
    positions: new Float64Array(positions),
    dashed: false,
  });
const strokes = (calls: readonly RecordedCall[]) => calls.filter((c) => c.name === "stroke");
const pathCalls = (calls: readonly RecordedCall[]) =>
  calls.filter((c) => c.name === "moveTo" || c.name === "lineTo" || c.name === "stroke");

/** Records drawCurveLayer over `rows` in the default view. */
function drawCurves(rows: RenderRow[]): RecordedCall[] {
  const { ctx, calls } = createRecordingContext();
  drawCurveLayer(ctx, view(), rows);
  return calls;
}

/** Expects `call` to be `name` at (x, y), each coordinate to `digits` digits. */
function expectAt(call: RecordedCall, name: string, x: number, y: number, digits: number) {
  expect(call.name).toBe(name);
  const [cx, cy] = call.args as [number, number];
  expect(cx).toBeCloseTo(x, digits);
  expect(cy).toBeCloseTo(y, digits);
}

it("G-5 strict region boundaries stroke with the dash pattern and non-strict ones solid (G-1)", () => {
  const calls = drawCurves([
    rowOf({
      kind: "region",
      rowId: "1",
      evaluations: 0,
      spans: new Float32Array(0),
      boundaries: [curve([-5, 1, 5, 1], true), curve([-5, 2, 5, 2], false)],
    }),
  ]);
  const drawn = strokes(calls);
  expect(drawn.map((c) => c.state.lineDash)).toEqual([[11, 7], []]);
  for (const c of drawn) {
    expect(c.state.strokeStyle).toBe(COLOR);
    expect(c.state.lineWidth).toBe(2.5);
  }
});

it("G-5 the dash phase continues across runs that meet", () => {
  const calls = drawCurves([
    curveRow([-5, 1, 0, 1, NaN, NaN, 0, 1, 5, 1, NaN, NaN, -5, 2, 5, 2], true),
  ]);
  expect(strokes(calls).map((c) => c.state.lineDashOffset)).toEqual([0, 200, 0]);
});

it("G-5 a point is a filled circle of radius 4 px at its view position (G-7, GP-28)", () => {
  const { ctx, calls } = createRecordingContext();
  drawPointLayer(
    ctx,
    view(),
    [
      rowOf({
        kind: "points",
        rowId: "1",
        evaluations: 0,
        coords: new Float64Array([2, 3, NaN, 1]),
      }),
    ],
    PAPER
  );
  expect(calls.filter((c) => c.name === "arc").map((c) => c.args)).toEqual([
    [480, 180, 4, 0, 2 * Math.PI],
  ]);
  expect(calls.filter((c) => c.name === "fill").map((c) => c.state.fillStyle)).toEqual([COLOR]);
});

it("G-5 curves map through the current view and far vertices are clipped", () => {
  const path = pathCalls(drawCurves([curveRow([0, 0, 1e12, 1e12], false)]));
  expect(path.map((c) => c.name)).toEqual(["moveTo", "lineTo", "stroke"]);
  expectAt(path[0], "moveTo", 400, 300, 9);
  // GP-20: the far vertex is clipped where the segment leaves the view grown by the line width
  // and CURVE_CUT_PX.
  expect(-(CURVE_LINE_PX + CURVE_CUT_PX)).toBe(-5.5);
  expectAt(path[1], "lineTo", 705.5, -5.5, 6);
});

it("G-8 a line set strokes the full view height or width at its position", () => {
  const vertical = pathCalls(drawCurves([lineRow("vertical", [3])]));
  expect(vertical.map((c) => c.name)).toEqual(["moveTo", "lineTo", "stroke"]);
  expectAt(vertical[0], "moveTo", 520, 0, 9);
  expectAt(vertical[1], "lineTo", 520, 600, 9);

  const horizontal = pathCalls(drawCurves([lineRow("horizontal", [2])]));
  expect(horizontal.map((c) => c.name)).toEqual(["moveTo", "lineTo", "stroke"]);
  expectAt(horizontal[0], "moveTo", 0, 220, 9);
  expectAt(horizontal[1], "lineTo", 800, 220, 9);
});

it("POI-17 the selected row's curve strokes at CURVE_SELECTED_LINE_PX and others at CURVE_LINE_PX", () => {
  const { ctx, calls } = createRecordingContext();
  const plain = curveRow([0, 0, 1, 1], false);
  const selected = { ...curveRow([0, 1, 1, 2], false), rowId: "2", selected: true };
  drawCurveLayer(ctx, view(), [plain, selected]);
  const widths = calls.filter((c) => c.name === "stroke").map((c) => c.state.lineWidth);
  expect(widths).toEqual([CURVE_LINE_PX, CURVE_SELECTED_LINE_PX]);
});

it("D-12, GP-29, GP-30 open points are discs with a paper hole, crosses two round strokes, and a dotted line dots", () => {
  const { ctx, calls } = createRecordingContext();
  const coords = new Float64Array([2, 3]);
  drawPointLayer(
    ctx,
    view(),
    [
      { ...rowOf({ kind: "points", rowId: "1", evaluations: 0, coords }), pointStyle: "open" },
      { ...rowOf({ kind: "points", rowId: "1", evaluations: 0, coords }), pointStyle: "cross" },
    ],
    PAPER
  );
  expect(calls.filter((c) => c.name === "fill").map((c) => c.state.fillStyle)).toEqual([
    COLOR,
    PAPER,
  ]);
  expect(calls.filter((c) => c.name === "arc").map((c) => c.args)).toEqual([
    [480, 180, POINT_RADIUS_PX, 0, 2 * Math.PI],
    [480, 180, POINT_HOLE_PX, 0, 2 * Math.PI],
  ]);
  const lines = calls.filter((c) => c.name === "lineTo").map((c) => c.args);
  expect(lines).toEqual([
    [480 + CROSS_ARM_PX, 180 + CROSS_ARM_PX],
    [480 + CROSS_ARM_PX, 180 - CROSS_ARM_PX],
  ]);
  expect(strokes(calls)).toHaveLength(1);
  const dotted = strokes(drawCurves([{ ...curveRow([-5, 1, 5, 1], false), lineStyle: "dotted" }]));
  expect(dotted.map((c) => [c.state.lineWidth, c.state.lineDash])).toEqual([[5, [0.1, 8]]]);
});

it("GP-20, GP-22, GP-33 curves stroke 2.5 px (selected 3.5), points are 8 px discs, strict boundaries dash 11 on 7 off and axes are 1.5 px", () => {
  expect([CURVE_LINE_PX, CURVE_SELECTED_LINE_PX, 2 * POINT_RADIUS_PX]).toEqual([2.5, 3.5, 8]);
  expect([[...DASH_PX], AXIS_LINE_PX, GRID_LINE_PX]).toEqual([[11, 7], 1.5, 1]);
  const drawn = strokes(drawCurves([curveRow([-5, 1, 5, 1], true)]));
  expect(drawn.map((c) => [c.state.lineWidth, c.state.lineDash])).toEqual([[2.5, [11, 7]]]);
});

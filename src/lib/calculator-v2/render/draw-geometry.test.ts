import { expect, it } from "vitest";
import type { CurveGeometry, Geometry, LineSetGeometry } from "../plot/geometry";
import type { PixelSize, Viewport, ViewSpec } from "../plot/viewport";
import { createRecordingContext, type RecordedCall } from "./__fixtures__/recording-context";
import { CURVE_LINE_PX } from "./constants";
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
  expect(drawn.map((c) => c.state.lineDash)).toEqual([[10, 6], []]);
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

it("G-5 a point is a filled circle of radius 4 px at its view position (G-7)", () => {
  const { ctx, calls } = createRecordingContext();
  drawPointLayer(ctx, view(), [
    rowOf({ kind: "points", rowId: "1", evaluations: 0, coords: new Float64Array([2, 3, NaN, 1]) }),
  ]);
  expect(calls.filter((c) => c.name === "arc").map((c) => c.args)).toEqual([
    [480, 180, 4, 0, 2 * Math.PI],
  ]);
  expect(calls.filter((c) => c.name === "fill").map((c) => c.state.fillStyle)).toEqual([COLOR]);
});

it("G-5 curves map through the current view and far vertices are clipped", () => {
  const path = pathCalls(drawCurves([curveRow([0, 0, 1e12, 1e12], false)]));
  expect(path.map((c) => c.name)).toEqual(["moveTo", "lineTo", "stroke"]);
  expectAt(path[0], "moveTo", 400, 300, 9);
  // The far vertex is clipped where the segment leaves the view expanded by 2·CURVE_LINE_PX.
  expect(-2 * CURVE_LINE_PX).toBe(-5);
  expectAt(path[1], "lineTo", 705, -5, 6);
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

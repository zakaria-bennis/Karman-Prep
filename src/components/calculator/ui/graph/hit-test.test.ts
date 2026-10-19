import { expect, it } from "vitest";
import type { Geometry } from "@/lib/calculator/plot/geometry";
import type { ViewSpec } from "@/lib/calculator/plot/viewport";
import type { RenderRow } from "@/lib/calculator/render/types";
import { CURVE_HIT_PX, hitCurve, hitPoi, POI_HIT_PX } from "./hit-test";

const VIEW: ViewSpec = {
  viewport: { left: -10, right: 10, bottom: -7.5, top: 7.5 },
  size: { width: 800, height: 600 },
  dpr: 1,
};
const P = [{ x: 0, y: -2, kinds: ["y-intercept" as const], withRowId: null }]; // px (400, 380)
const row = (rowId: string, geometry: Geometry): RenderRow => ({
  rowId,
  color: "#000000",
  fillAlpha: 0.1,
  geometry,
});
const curve = (rowId: string, polylines: number[]): Geometry => ({
  kind: "curve",
  rowId,
  evaluations: 0,
  polylines: new Float64Array(polylines),
  bands: new Float64Array(0),
  dashed: false,
});

it("POI-18 a dot is hit within 12 px on a fine pointer and 14 px on touch, and 16 px away is a miss", () => {
  expect(POI_HIT_PX).toEqual({ fine: 12, coarse: 14 });
  expect(hitPoi(P, VIEW, [400 + 12, 380], "fine")).toBe(0);
  expect(hitPoi(P, VIEW, [400 + 12.5, 380], "fine")).toBeNull();
  expect(hitPoi(P, VIEW, [400, 380 + 14], "coarse")).toBe(0);
  expect(hitPoi(P, VIEW, [400 + 16, 380], "coarse")).toBeNull();
  expect(hitPoi([], VIEW, [400, 380], "fine")).toBeNull();
});

it("POI-17 a press near a curve hits the nearest row, the last drawn winning a tie", () => {
  expect(CURVE_HIT_PX).toEqual({ fine: 8, coarse: 16 });
  // y = 0 from x = -10 to 10 is the line py = 300; y = 0.1 is py = 296
  const rows = [row("1", curve("1", [-10, 0, 10, 0])), row("2", curve("2", [-10, 0.1, 10, 0.1]))];
  expect(hitCurve(rows, VIEW, [200, 298], "fine")).toBe("2"); // a tie: the later row
  expect(hitCurve(rows, VIEW, [200, 303], "fine")).toBe("1"); // the nearer row
  expect(hitCurve(rows, VIEW, [200, 309], "fine")).toBeNull();
  expect(hitCurve(rows, VIEW, [200, 314], "coarse")).toBe("1");
  const lines = row("3", {
    kind: "lines",
    rowId: "3",
    evaluations: 0,
    orientation: "vertical",
    positions: new Float64Array([5]),
    dashed: false,
  });
  expect(hitCurve([lines], VIEW, [606, 50], "fine")).toBe("3");
  const region = row("4", {
    kind: "region",
    rowId: "4",
    evaluations: 0,
    spans: new Float32Array(0),
    boundaries: [curve("4", [-10, 5, 10, 5]) as never],
  });
  expect(hitCurve([region], VIEW, [100, 102], "fine")).toBe("4");
  expect(hitCurve([region], VIEW, [100, 200], "fine")).toBeNull();
});

import { expect, it } from "vitest";
import type { Geometry } from "@/lib/calculator/plot/geometry";
import type { ViewSpec } from "@/lib/calculator/plot/viewport";
import { SNAP_PX, traceAt, type TraceSource } from "./trace";

const VIEW: ViewSpec = {
  viewport: { left: -10, right: 10, bottom: -7.5, top: 7.5 },
  size: { width: 800, height: 600 },
  dpr: 1,
};
const px = (x: number) => (x + 10) * 40;
const py = (y: number) => (7.5 - y) * 40;
const parabola: TraceSource = {
  curve: { kind: "explicit", independent: "x", f: (x) => x * x - 2 },
  geometry: null,
};
const POIS = [{ x: Math.SQRT2, y: 0, kinds: ["zero" as const], withRowId: null }];

it("POI-14 the trace dot follows the nearest curve point even when the pointer leaves the curve", () => {
  const on = traceAt(parabola, VIEW, [px(1.23456), py(0)], [], "fine");
  expect(on).toEqual({ x: 1.235, y: 1.235 ** 2 - 2, label: "(1.235, −0.47477)" }); // −0.474775 sits just below half-way in binary
  const away = traceAt(parabola, VIEW, [px(1.23456), 5], [], "fine");
  expect(away?.x).toBe(1.235); // x follows the pointer, y stays on the curve
  const g = {
    kind: "curve",
    rowId: "1",
    evaluations: 0,
    polylines: new Float64Array([0, 5, 0, -5]),
    bands: new Float64Array(0),
    dashed: false,
  } as Geometry;
  const implicit = traceAt({ curve: null, geometry: g }, VIEW, [px(2), py(4.9)], [], "fine");
  expect(implicit).toMatchObject({ x: 0, y: 5 });
});

it("POI-14 a fine-pointer trace snaps to a point of interest within 3 px and shows its exact label", () => {
  expect(SNAP_PX).toBe(3);
  const near = traceAt(parabola, VIEW, [px(Math.SQRT2) + 2, py(0)], POIS, "fine");
  expect(near).toEqual({ x: Math.SQRT2, y: 0, label: "(1.41421, 0)" });
  const far = traceAt(parabola, VIEW, [px(Math.SQRT2) + 5, py(0)], POIS, "fine");
  expect(far?.label).not.toBe("(1.41421, 0)");
  const touch = traceAt(parabola, VIEW, [px(Math.SQRT2) + 2, py(0)], POIS, "coarse");
  expect(touch?.x).not.toBe(Math.SQRT2);
});

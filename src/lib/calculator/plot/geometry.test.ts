import { expect, it } from "vitest";
import {
  geometryTransferables,
  type CurveGeometry,
  type Geometry,
  type LineSetGeometry,
  type PointGeometry,
  type RegionGeometry,
} from "./geometry";

it("AR-45 geometryTransferables lists each geometry's own buffers once", () => {
  const f64 = (...n: number[]) => Float64Array.from(n);
  const curve = { kind: "curve", polylines: f64(0, 0, 1, 1), bands: f64() } as CurveGeometry;
  const spans = Float32Array.from([0, 1, 0, 800]);
  const region = { kind: "region", spans, boundaries: [curve, curve] } as RegionGeometry;
  const lines = { kind: "lines", positions: f64(2) } as LineSetGeometry;
  const points = { kind: "points", coords: f64(2, 3) } as PointGeometry;
  const same = (g: Geometry, ...want: ArrayBufferLike[]) => {
    const got = geometryTransferables(g);
    expect(got.length === want.length && got.every((b, k) => b === want[k])).toBe(true);
  };
  same(curve, curve.polylines.buffer, curve.bands.buffer);
  same(lines, lines.positions.buffer);
  same(points, points.coords.buffer);
  same(region, spans.buffer, curve.polylines.buffer, curve.bands.buffer);
});

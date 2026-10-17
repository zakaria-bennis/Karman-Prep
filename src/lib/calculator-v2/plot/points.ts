// Points (a, b) with numeric coordinates (G-7). A point with an undefined coordinate is not drawn,
// so only pairs whose two coordinates are finite are kept. Pure TypeScript, no DOM (AR-44).

import type { PointGeometry } from "./geometry";

/** The points with both coordinates finite, in order, as world [x0, y0, …]; no evaluations. */
export function plotPoints(rowId: string, points: readonly (readonly number[])[]): PointGeometry {
  const coords: number[] = [];
  for (const point of points) {
    if (Number.isFinite(point[0]) && Number.isFinite(point[1])) coords.push(point[0], point[1]);
  }
  return { rowId, kind: "points", coords: Float64Array.from(coords), evaluations: 0 };
}

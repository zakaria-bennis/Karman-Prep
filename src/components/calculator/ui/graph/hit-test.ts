// Hit testing on the graph (POI-17, POI-18): the point-of-interest dot and the curve under a press,
// in CSS px of the view. Pure: geometry in, ids out.

import type { CurveGeometry, Geometry, LineSetGeometry } from "@/lib/calculator/plot/geometry";
import { worldToPx, type ViewSpec } from "@/lib/calculator/plot/viewport";
import type { PoiPoint } from "@/lib/calculator/poi/types";
import type { RenderRow } from "@/lib/calculator/render/types";
import type { Pointer } from "../controller/media";

type Point = readonly [number, number];

/** POI-18: a dot's hit radius; 16 px from its centre is always a miss. */
export const POI_HIT_PX: Readonly<Record<Pointer, number>> = Object.freeze({
  fine: 12,
  coarse: 14,
});
/** POI-17: how near a curve a press must be to select its row or start a trace. */
export const CURVE_HIT_PX: Readonly<Record<Pointer, number>> = Object.freeze({
  fine: 8,
  coarse: 16,
});

/** The index of the dot nearest `at` within the hit radius, or null. */
export function hitPoi(
  points: readonly Pick<PoiPoint, "x" | "y">[],
  view: ViewSpec,
  at: Point,
  pointer: Pointer
): number | null {
  let best: number | null = null,
    bestDistance = POI_HIT_PX[pointer];
  points.forEach((p, i) => {
    const [x, y] = worldToPx(view, p.x, p.y);
    const d = Math.hypot(x - at[0], y - at[1]);
    if (d <= bestDistance) {
      best = i;
      bestDistance = d;
    }
  });
  return best;
}

function segmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    len = dx * dx + dy * dy;
  const t =
    len === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function curveDistance(g: CurveGeometry, view: ViewSpec, at: Point): number {
  const p = g.polylines;
  let best = Infinity,
    prev: Point | null = null;
  for (let k = 0; k + 1 < p.length; k += 2) {
    if (!Number.isFinite(p[k]) || !Number.isFinite(p[k + 1])) {
      prev = null;
      continue;
    }
    const cur = worldToPx(view, p[k], p[k + 1]);
    best = Math.min(
      best,
      prev === null ? Math.hypot(cur[0] - at[0], cur[1] - at[1]) : segmentDistance(at, prev, cur)
    );
    prev = cur;
  }
  return best;
}

function linesDistance(g: LineSetGeometry, view: ViewSpec, at: Point): number {
  let best = Infinity;
  for (const position of g.positions) {
    const [x, y] = worldToPx(view, position, position);
    best = Math.min(best, Math.abs(g.orientation === "vertical" ? x - at[0] : y - at[1]));
  }
  return best;
}

/** The distance in px from `at` to what a geometry strokes or marks. */
export function geometryDistance(g: Geometry, view: ViewSpec, at: Point): number {
  switch (g.kind) {
    case "curve":
      return curveDistance(g, view, at);
    case "lines":
      return linesDistance(g, view, at);
    case "region":
      return Math.min(Infinity, ...g.boundaries.map((b) => geometryDistance(b, view, at)));
    case "points": {
      let best = Infinity;
      for (let k = 0; k + 1 < g.coords.length; k += 2) {
        const [x, y] = worldToPx(view, g.coords[k], g.coords[k + 1]);
        best = Math.min(best, Math.hypot(x - at[0], y - at[1]));
      }
      return best;
    }
    default:
      return Infinity;
  }
}

/** POI-17: the row whose curve is nearest `at` within CURVE_HIT_PX, later rows winning ties. */
export function hitCurve(
  rows: readonly RenderRow[],
  view: ViewSpec,
  at: Point,
  pointer: Pointer
): string | null {
  let best: string | null = null,
    bestDistance = CURVE_HIT_PX[pointer];
  for (const row of rows) {
    const d = geometryDistance(row.geometry, view, at);
    if (d <= bestDistance) {
      best = row.rowId;
      bestDistance = d;
    }
  }
  return best;
}

// Hit testing on the graph (POI-TRACE-12, POI-TRACE-21, POI-TRACE-22): the point-of-interest dot
// and the traceable row under a pointer, in CSS px of the view. Pure: geometry in, ids out.

import { worldToPx, type ViewSpec } from "@/lib/calculator/plot/viewport";
import { POI_KINDS, type PoiBranch, type PoiKind, type PoiPoint } from "@/lib/calculator/poi/types";
import type { Pointer } from "../controller/media";
import { branchDistance } from "./trace";

type Point = readonly [number, number];

/** POI-TRACE-21: a press this near a branch's centreline, whatever its width, traces it. */
export const CURVE_HIT_PX: Readonly<Record<Pointer, number>> = Object.freeze({
  fine: 10,
  coarse: 20,
});
/** POI-TRACE-12: a dot is hit 2 px further out than a curve. */
export const POI_HIT_PX: Readonly<Record<Pointer, number>> = Object.freeze({
  fine: CURVE_HIT_PX.fine + 2,
  coarse: CURVE_HIT_PX.coarse + 2,
});

/**
 * Pointer events carry float32 coordinates, so a pointer exactly 12 px from a dot reads as
 * 12.0000122 px; Desmos still counts that as a hit (12 px hits, 13 px misses), and so do we.
 */
const SLACK_PX = 1e-3;

/**
 * The farthest a hit may be: up to and including the reach for a mouse, short of it for a finger
 * (the reference hits a curve 19.5 px from a touch but not 20, and a dot at 21.5 but not 22).
 */
export const hitLimit = (reach: number, pointer: Pointer): number =>
  pointer === "fine" ? reach + SLACK_PX : reach - SLACK_PX;

/**
 * A press this near a branch or a dot is on it. Desmos then picks the last such row in list order,
 * however much nearer an earlier one is (live 2026-10-25: `y=x^2` then `y=x^2+0.12` pressed on the
 * first picks the second until they are 4.65 to 4.9 px apart, either way up), and among dots the
 * highest kind (hitPoi). Measured with a mouse.
 */
export const ON_CURVE_PX = 4.75;

/** A dot's rank among others within ON_CURVE_PX: POI_KINDS order, intersections highest. */
const rank = (p: { kinds?: readonly PoiKind[] }): number =>
  Math.max(-1, ...(p.kinds ?? []).map((k) => POI_KINDS.indexOf(k)));

/**
 * The index of the dot to open for a press at `at`: among dots within ON_CURVE_PX, the highest
 * kind (Desmos, live 2026-10-25: pressed right on an intercept, an intersection or extremum 4.7 px
 * away opens instead, a zero 4 px away does not; 5 px away the nearest opens), the nearest of
 * those; else the dot nearest `at` within the hit radius; else null.
 */
export function hitPoi(
  points: readonly (Pick<PoiPoint, "x" | "y"> & { kinds?: readonly PoiKind[] })[],
  view: ViewSpec,
  at: Point,
  pointer: Pointer
): number | null {
  let best: number | null = null,
    bestDistance = hitLimit(POI_HIT_PX[pointer], pointer),
    on: number | null = null,
    onDistance = Infinity;
  points.forEach((p, i) => {
    const [x, y] = worldToPx(view, p.x, p.y);
    const d = Math.hypot(x - at[0], y - at[1]);
    if (d <= ON_CURVE_PX) {
      const higher = on === null || rank(p) > rank(points[on]);
      if (higher || (rank(p) === rank(points[on!]) && d <= onDistance)) {
        on = i;
        onDistance = d;
      }
    }
    if (d <= bestDistance) {
      best = i;
      bestDistance = d;
    }
  });
  return on ?? best;
}

export interface TraceableRow {
  rowId: string;
  branches: readonly PoiBranch[];
}

/**
 * POI-TRACE-21, POI-TRACE-22: the last row with a branch within ON_CURVE_PX of `at`, else the row
 * whose branch is nearest `at` within CURVE_HIT_PX, later rows winning ties; rows without explicit
 * branches (points, parametric, polar, unsolvable implicit curves) are never hit.
 */
export function hitBranch(
  rows: readonly TraceableRow[],
  view: ViewSpec,
  at: Point,
  pointer: Pointer
): string | null {
  let best: string | null = null,
    on: string | null = null,
    bestDistance = hitLimit(CURVE_HIT_PX[pointer], pointer);
  for (const row of rows) {
    for (const b of row.branches) {
      const d = branchDistance(b, view, at);
      if (d <= ON_CURVE_PX) on = row.rowId;
      if (d <= bestDistance) {
        best = row.rowId;
        bestDistance = d;
      }
    }
  }
  return on ?? best;
}

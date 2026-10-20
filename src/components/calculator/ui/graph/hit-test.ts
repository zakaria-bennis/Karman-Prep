// Hit testing on the graph (POI-TRACE-12, POI-TRACE-21, POI-TRACE-22): the point-of-interest dot
// and the traceable row under a pointer, in CSS px of the view. Pure: geometry in, ids out.

import { worldToPx, type ViewSpec } from "@/lib/calculator/plot/viewport";
import type { PoiBranch, PoiPoint } from "@/lib/calculator/poi/types";
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

/** The index of the dot nearest `at` within the hit radius, or null. */
export function hitPoi(
  points: readonly Pick<PoiPoint, "x" | "y">[],
  view: ViewSpec,
  at: Point,
  pointer: Pointer
): number | null {
  let best: number | null = null,
    bestDistance = POI_HIT_PX[pointer] + SLACK_PX;
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

export interface TraceableRow {
  rowId: string;
  branches: readonly PoiBranch[];
}

/**
 * POI-TRACE-21, POI-TRACE-22: the row whose branch is nearest `at` within CURVE_HIT_PX, later rows
 * winning ties; rows without explicit branches (points, parametric, polar, unsolvable implicit
 * curves) are never hit.
 */
export function hitBranch(
  rows: readonly TraceableRow[],
  view: ViewSpec,
  at: Point,
  pointer: Pointer
): string | null {
  let best: string | null = null,
    bestDistance = CURVE_HIT_PX[pointer] + SLACK_PX;
  for (const row of rows) {
    for (const b of row.branches) {
      const d = branchDistance(b, view, at);
      if (d <= bestDistance) {
        best = row.rowId;
        bestDistance = d;
      }
    }
  }
  return best;
}

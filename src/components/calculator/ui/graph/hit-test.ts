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
 * The farthest a hit may be: up to and including the reach, for a mouse and a finger alike (live
 * Desmos 2026-10-25, a dot on a whole pixel: 12 px from a mouse hits and 12.00001 px misses, 22 px
 * from a finger hits and 22.00001 px misses; a curve 10 px from a mouse and 20 px from a finger is
 * hit). The slack only absorbs rounding in the dot's own pixel position.
 */
export const hitLimit = (reach: number): number => reach + 1e-9;

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
 * away opens instead, a zero 4 px away does not; 5 px away the nearest opens); among intersections
 * there, the one with the row latest in the list (`rowOrder`; `x=0.05`, `x=-0.08`, `y=0` with
 * `y=0` selected, pressed 1 px from (0.05, 0), opens (−0.08, 0) 4.2 px away; with the vertical
 * rows swapped, (0.05, 0)); then the nearest. Else the dot nearest `at` within the hit radius;
 * else null.
 */
export function hitPoi(
  points: readonly (Pick<PoiPoint, "x" | "y"> & {
    kinds?: readonly PoiKind[];
    withRowId?: string | null;
  })[],
  view: ViewSpec,
  at: Point,
  pointer: Pointer,
  rowOrder: (rowId: string) => number = () => 0
): number | null {
  const order = (p: (typeof points)[number]) =>
    p.withRowId === undefined || p.withRowId === null ? -1 : rowOrder(p.withRowId);
  // [rank, row order, −distance]: the larger wins
  const key = (p: (typeof points)[number], d: number) => [rank(p), order(p), -d];
  const beats = (a: number[], b: number[]) => {
    for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) return a[k] > b[k];
    return true; // a later dot wins a full tie
  };
  let best: number | null = null,
    bestDistance = hitLimit(POI_HIT_PX[pointer]),
    on: number | null = null,
    onKey: number[] = [];
  points.forEach((p, i) => {
    const [x, y] = worldToPx(view, p.x, p.y);
    const d = Math.hypot(x - at[0], y - at[1]);
    if (d <= ON_CURVE_PX) {
      const k = key(p, d);
      if (on === null || beats(k, onKey)) {
        on = i;
        onKey = k;
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
    bestDistance = hitLimit(CURVE_HIT_PX[pointer]);
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

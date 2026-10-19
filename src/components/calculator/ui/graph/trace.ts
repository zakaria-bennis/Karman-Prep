// Tracing a curve by press and drag (POI-14): the curve point the trace dot sits on for a pointer
// position, its live label, and snapping to a point of interest on fine pointers.

import type { Geometry } from "@/lib/calculator/plot/geometry";
import { pxToWorld, worldToPx, type ViewSpec } from "@/lib/calculator/plot/viewport";
import { formatPoiLabel, formatTraceLabel, roundTraceX } from "@/lib/calculator/poi/format";
import type { PoiCurve, PoiPoint } from "@/lib/calculator/poi/types";
import type { Pointer } from "../controller/media";

/** POI-14: a fine-pointer trace snaps to a point of interest this close (Desmos: about 1.5 px). */
export const SNAP_PX = 3;

/** What a trace follows: a compiled explicit curve when there is one, else the drawn geometry. */
export interface TraceSource {
  curve: PoiCurve | null;
  geometry: Geometry | null;
}
export interface TracePoint {
  x: number;
  y: number;
  label: string;
}

const isNum = Number.isFinite;

/** Rounds a trace coordinate along `axis` to the view's pixel precision. */
function roundAlong(t: number, view: ViewSpec, axis: "x" | "y"): number {
  if (axis === "x") return roundTraceX(t, view);
  const { viewport: v, size } = view;
  const swapped: ViewSpec = {
    ...view,
    viewport: { left: v.bottom, right: v.top, bottom: v.left, top: v.right },
    size: { width: size.height, height: size.width },
  };
  return roundTraceX(t, swapped);
}

/** The geometry vertex nearest `at` in px, or null. */
function nearestVertex(
  g: Geometry,
  view: ViewSpec,
  at: readonly [number, number]
): [number, number] | null {
  const runs: Float64Array[] =
    g.kind === "curve"
      ? [g.polylines]
      : g.kind === "region"
        ? g.boundaries.flatMap((b) => (b.kind === "curve" ? [b.polylines] : []))
        : [];
  let best: [number, number] | null = null,
    bestD = Infinity;
  for (const p of runs) {
    for (let k = 0; k + 1 < p.length; k += 2) {
      if (!isNum(p[k]) || !isNum(p[k + 1])) continue;
      const [x, y] = worldToPx(view, p[k], p[k + 1]);
      const d = Math.hypot(x - at[0], y - at[1]);
      if (d < bestD) {
        bestD = d;
        best = [p[k], p[k + 1]];
      }
    }
  }
  return best;
}

/** POI-14: the traced point for the pointer at `at` (CSS px), or null when the curve has none there. */
export function traceAt(
  source: TraceSource,
  view: ViewSpec,
  at: readonly [number, number],
  pois: readonly PoiPoint[],
  pointer: Pointer
): TracePoint | null {
  const [wx, wy] = pxToWorld(view, at[0], at[1]);
  let point: { x: number; y: number } | null = null;
  const c = source.curve;
  if (c !== null && c.kind === "explicit") {
    const alongX = c.independent === "x",
      t = roundAlong(alongX ? wx : wy, view, alongX ? "x" : "y"),
      v = c.f(t);
    if (isNum(v)) point = alongX ? { x: t, y: v } : { x: v, y: t };
  } else if (c !== null && c.kind === "lines" && source.geometry?.kind === "lines") {
    const vertical = c.orientation === "vertical";
    let best: number | null = null;
    for (const position of source.geometry.positions) {
      const d = Math.abs(position - (vertical ? wx : wy));
      if (best === null || d < Math.abs(best - (vertical ? wx : wy))) best = position;
    }
    if (best !== null) {
      point = vertical
        ? { x: best, y: roundAlong(wy, view, "y") }
        : { x: roundAlong(wx, view, "x"), y: best };
    }
  } else if (source.geometry !== null) {
    const v = nearestVertex(source.geometry, view, at);
    if (v !== null) point = { x: v[0], y: v[1] };
  }
  if (point === null) return null;
  if (pointer === "fine") {
    // Within SNAP_PX of the pointer or of the dot: on a steep curve the dot outruns the pointer.
    const [dx, dy] = worldToPx(view, point.x, point.y);
    const snap = pois.find((p) => {
      const [x, y] = worldToPx(view, p.x, p.y);
      return Math.min(Math.hypot(x - dx, y - dy), Math.hypot(x - at[0], y - at[1])) <= SNAP_PX;
    });
    if (snap !== undefined) return { x: snap.x, y: snap.y, label: formatPoiLabel(snap, view) };
  }
  return { ...point, label: formatTraceLabel(point.x, point.y, view) };
}

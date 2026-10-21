// Zoom to fit (owner decision, 2026-10-21; a Karman control, Desmos has none): the view that holds
// every visible graphed item's key points with about 10% of the view spare on each side, keeping
// the current x:y units per px so a circle stays round. Key points are the points of interest of
// every traceable row (zeros, intercepts, extrema, intersections), plotted points, table points
// (a regression's data), line sets' positions and a curve's whole extent when it is finite (the
// drawn curve ends inside the view, as a circle does). The fitter is pure; collectFitPoints reads
// the engine.

import type { CalculatorEngine, EngineSnapshot } from "@/lib/calculator/core/api/engine";
import { createDeadline, DeadlineExceeded } from "@/lib/calculator/core/deadline";
import type { Geometry } from "@/lib/calculator/plot/geometry";
import { zoomViewport, type Viewport, type ViewSpec } from "@/lib/calculator/plot/viewport";
import { findPois, type OtherBranch } from "@/lib/calculator/poi/find";

/** World coordinates to fit: points constrain both axes; a vertical line only x, a horizontal one only y. */
export type FitPoints = { xs: number[]; ys: number[] };

/** The share of the fitted view each margin takes. */
export const FIT_MARGIN = 0.1;
/** The key-point search looks this many times wider than the current and default views together. */
export const FIT_SEARCH_WIDEN = 4;
/** The key-point search's time budget. */
export const FIT_DEADLINE_MS = 400;
/** Coordinates beyond this size are not fitted (they are off any useful view). */
const FAR = 1e12;
/** A curve whose drawn extent comes this close to the view's edge (share of the span) may run on. */
const EDGE = 0.002;

const usable = (v: number) => Number.isFinite(v) && Math.abs(v) < FAR;

function addPair(out: FitPoints, x: number, y: number): void {
  if (!usable(x) || !usable(y)) return;
  out.xs.push(x);
  out.ys.push(y);
}

function addPairs(out: FitPoints, coords: ArrayLike<number>): void {
  for (let i = 0; i + 1 < coords.length; i += 2) addPair(out, coords[i], coords[i + 1]);
}

/** A curve's drawn extent when it ends inside `v` (a closed or bounded curve), else nothing. */
function addFiniteExtent(out: FitPoints, polylines: Float64Array, v: Viewport): void {
  let [x0, x1, y0, y1] = [Infinity, -Infinity, Infinity, -Infinity];
  for (let i = 0; i + 1 < polylines.length; i += 2) {
    const [x, y] = [polylines[i], polylines[i + 1]];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    [x0, x1, y0, y1] = [Math.min(x0, x), Math.max(x1, x), Math.min(y0, y), Math.max(y1, y)];
  }
  if (x0 > x1) return;
  const ex = EDGE * (v.right - v.left);
  const ey = EDGE * (v.top - v.bottom);
  const inside = x0 > v.left + ex && x1 < v.right - ex && y0 > v.bottom + ey && y1 < v.top - ey;
  if (!inside) return;
  addPair(out, x0, y0);
  addPair(out, x1, y1);
}

/** The key points one row's drawn geometry gives directly (not its points of interest). */
export function geometryFitPoints(g: Geometry, view: Viewport, out: FitPoints): void {
  switch (g.kind) {
    case "points":
      addPairs(out, g.coords);
      return;
    case "table":
      for (const s of g.series) addPairs(out, s.coords);
      if (g.regression !== undefined) addFiniteExtent(out, g.regression.polylines, view);
      return;
    case "lines":
      for (const p of g.positions) {
        if (usable(p)) (g.orientation === "vertical" ? out.xs : out.ys).push(p);
      }
      return;
    case "curve":
      addFiniteExtent(out, g.polylines, view);
      return;
    case "region":
      for (const b of g.boundaries) geometryFitPoints(b, view, out);
      return;
  }
}

/** Where the key-point search looks: the current and default views together, widened. */
export function fitSearchView(view: ViewSpec, home: Viewport): ViewSpec {
  const v = view.viewport;
  const union: Viewport = {
    left: Math.min(v.left, home.left),
    right: Math.max(v.right, home.right),
    bottom: Math.min(v.bottom, home.bottom),
    top: Math.max(v.top, home.top),
  };
  const centre = { x: (union.left + union.right) / 2, y: (union.bottom + union.top) / 2 };
  return { ...view, viewport: zoomViewport(union, 1 / FIT_SEARCH_WIDEN, centre) };
}

/**
 * Every visible graphed item's key points: each drawn row's geometry, and the points of interest
 * of each traceable row against every other in `search`, within FIT_DEADLINE_MS (what was found
 * by then is kept).
 */
export function collectFitPoints(
  engine: Pick<CalculatorEngine, "poiCurves">,
  snapshot: Pick<EngineSnapshot, "rows" | "geometry">,
  view: ViewSpec,
  search: ViewSpec
): FitPoints {
  const out: FitPoints = { xs: [], ys: [] };
  const ids: string[] = [];
  for (const row of snapshot.rows) {
    const g = snapshot.geometry.get(row.id);
    if (row.hidden || g === undefined) continue;
    geometryFitPoints(g, view.viewport, out);
    ids.push(row.id);
  }
  const branches = new Map(ids.map((id) => [id, engine.poiCurves(id, search)]));
  const deadline = createDeadline(FIT_DEADLINE_MS, () => performance.now(), null);
  try {
    for (const id of ids) {
      const own = branches.get(id)!;
      if (own.length === 0) continue;
      const others: OtherBranch[] = [];
      for (const [rowId, list] of branches) {
        if (rowId !== id) for (const branch of list) others.push({ rowId, branch });
      }
      for (const p of findPois(own, others, search, deadline)) addPair(out, p.x, p.y);
    }
  } catch (error) {
    if (!(error instanceof DeadlineExceeded)) throw error;
  }
  return out;
}

const range = (values: number[]): [number, number] | null =>
  values.length === 0 ? null : [Math.min(...values), Math.max(...values)];

/**
 * The view fitting `points` with FIT_MARGIN of the view spare on each side, at the current x:y
 * units per px, in the part of the graph above `insetPx` (the open keypad over it); a single
 * point or a single coordinate keeps the current scale. Null when there is nothing to fit.
 */
export function fitViewport(points: FitPoints, view: ViewSpec, insetPx = 0): Viewport | null {
  const xr = range(points.xs);
  const yr = range(points.ys);
  if (xr === null && yr === null) return null;
  const { viewport: v, size } = view;
  const width = size.width;
  const visible = Math.max(1, size.height - Math.max(0, insetPx));
  const ux = (v.right - v.left) / width;
  const ratio = (v.top - v.bottom) / size.height / ux; // y units per x unit, per px
  const share = 1 - 2 * FIT_MARGIN;
  const needX = xr === null ? 0 : (xr[1] - xr[0]) / share / width;
  const needY = yr === null ? 0 : (yr[1] - yr[0]) / share / (ratio * visible);
  const fitted = Math.max(needX, needY);
  const u = fitted > 0 && Number.isFinite(fitted) ? fitted : ux;
  const cx = xr === null ? (v.left + v.right) / 2 : (xr[0] + xr[1]) / 2;
  const cy =
    yr === null ? v.top - ((v.top - v.bottom) * visible) / size.height / 2 : (yr[0] + yr[1]) / 2;
  const uy = u * ratio;
  const top = cy + (uy * visible) / 2;
  return {
    left: cx - (u * width) / 2,
    right: cx + (u * width) / 2,
    bottom: top - uy * size.height,
    top,
  };
}

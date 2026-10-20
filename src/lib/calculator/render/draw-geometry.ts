// Paints the shading, curve and point layers of the graph (G-5): shading as opaque device-px
// rectangles, curves, bands, line sets and region boundaries as strokes in their row colour (G-1
// dashes, G-8 full-view lines), and points as filled dots (G-7). Every coordinate goes through the
// current view's worldToPx, and segments are clipped in float64 before the canvas sees them.

import type { CurveGeometry, LineSetGeometry } from "../plot/geometry";
import { worldToPx, type ViewSpec } from "../plot/viewport";
import {
  CROSS_ARM_PX,
  CROSS_STROKE_PX,
  CURVE_CUT_PX,
  CURVE_LINE_PX,
  CURVE_SELECTED_LINE_PX,
  DASH_PX,
  DOT_LENGTH_PX,
  DOT_PERIOD_PX,
  JOIN_TOLERANCE_PX,
  POINT_HOLE_PX,
  POINT_RADIUS_PX,
} from "./constants";
import type { ShadingRect } from "./shading";
import type { RenderRow } from "./types";
import type { Point } from "./view-input";

type Ctx = CanvasRenderingContext2D;
export type ClipRect = { left: number; top: number; right: number; bottom: number };

/** Clears the whole backing store in device px, then draws in CSS px of a `dpr` view. */
function startLayer(ctx: Ctx, dpr: number): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** The view's CSS px rectangle grown by `margin` on every side. */
function grown(view: ViewSpec, margin: number): ClipRect {
  const { width, height } = view.size;
  return { left: -margin, top: -margin, right: width + margin, bottom: height + margin };
}

const isInside = ([x, y]: Point, r: ClipRect) =>
  x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

/**
 * Liang–Barsky: the part of segment a→b inside `r`, or null when none is. An endpoint already
 * inside is returned as given. Non-finite coordinates give null.
 */
export function clipSegment(a: Point, b: Point, r: ClipRect): [Point, Point] | null {
  if (![a[0], a[1], b[0], b[1]].every(Number.isFinite)) return null;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  let t0 = 0;
  let t1 = 1;
  const edges: [p: number, q: number][] = [
    [-dx, a[0] - r.left],
    [dx, r.right - a[0]],
    [-dy, a[1] - r.top],
    [dy, r.bottom - a[1]],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > t1) return null;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return null;
      if (t < t1) t1 = t;
    }
  }
  const at = (t: number): Point => [a[0] + t * dx, a[1] + t * dy];
  return [t0 === 0 ? a : at(t0), t1 === 1 ? b : at(t1)];
}

/** Fills translucent device-px shading rectangles (from buildShadingRects), each in its colour. */
function fillShading(ctx: Ctx, rects: readonly ShadingRect[], dpr: number): void {
  if (rects.length === 0) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const rect of rects) {
    ctx.fillStyle = rect.color;
    ctx.globalAlpha = rect.alpha;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  }
  ctx.globalAlpha = 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

const finitePair = (a: Float64Array, k: number) =>
  Number.isFinite(a[k]) && Number.isFinite(a[k + 1]);

/**
 * G-12 bands as rectangles in the row colour, grown by half a curve line so a band reads at the
 * weight of the stroke it stands for, and clamped to `clip`.
 */
function fillBands(ctx: Ctx, view: ViewSpec, bands: Float64Array, clip: ClipRect): void {
  const half = CURVE_LINE_PX / 2;
  for (let k = 0; k + 3 < bands.length; k += 4) {
    if (!finitePair(bands, k) || !finitePair(bands, k + 2)) continue;
    const [ax, ay] = worldToPx(view, bands[k], bands[k + 3]);
    const [bx, by] = worldToPx(view, bands[k + 1], bands[k + 2]);
    const left = Math.max(clip.left, Math.min(ax, bx) - half);
    const right = Math.min(clip.right, Math.max(ax, bx) + half);
    const top = Math.max(clip.top, Math.min(ay, by) - half);
    const bottom = Math.min(clip.bottom, Math.max(ay, by) + half);
    if (right > left && bottom > top) ctx.fillRect(left, top, right - left, bottom - top);
  }
}

const EDGE_SLACK_PX = 1;
const SAMPLE_LEAD_PX = 0.5;

/**
 * GP-20, GP-22: where the reference's dash pattern starts. It cuts a curve at `clip` above and
 * below the view and samples explicit curves from about SAMPLE_LEAD_PX past the left and right
 * edges, starting the pattern where the drawn path starts. A run that starts at the view's edge
 * (within EDGE_SLACK_PX of it, or past it) is taken to continue back to that start: the length of
 * the lead-in, along the run's first segment `a`→`b`, is the dash phase at `a`. Any other start
 * begins the pattern afresh.
 */
function leadIn(view: ViewSpec, a: Point, b: Point, clip: ClipRect): number {
  const { width, height } = view.size;
  const atEdge =
    a[0] <= EDGE_SLACK_PX ||
    a[1] <= EDGE_SLACK_PX ||
    a[0] >= width - EDGE_SLACK_PX ||
    a[1] >= height - EDGE_SLACK_PX;
  if (!atEdge || !isInside(a, clip) || a[0] < -SAMPLE_LEAD_PX || a[0] > width + SAMPLE_LEAD_PX)
    return 0;
  const length = Math.hypot(a[0] - b[0], a[1] - b[1]);
  if (!(length > 0)) return 0;
  const u = [(a[0] - b[0]) / length, (a[1] - b[1]) / length];
  let t = Infinity;
  for (const axis of [0, 1]) {
    const [lo, hi] =
      axis === 0 ? [-SAMPLE_LEAD_PX, width + SAMPLE_LEAD_PX] : [clip.top, clip.bottom];
    if (u[axis] > 0) t = Math.min(t, (hi - a[axis]) / u[axis]);
    else if (u[axis] < 0) t = Math.min(t, (lo - a[axis]) / u[axis]);
  }
  return Number.isFinite(t) ? t : 0;
}

/**
 * GP-22: the reference strokes an inequality's boundary in its sampling order, left to right (up
 * the view when the boundary runs more up than across), so its dashes start at that end's cut.
 * A traced contour has no such order: each open run (in world coordinates) is reversed when it
 * starts at the other end. Closed runs keep their order.
 */
export function orientRuns(p: Float64Array): Float64Array {
  const out = Float64Array.from(p);
  for (let k = 0; k + 1 < p.length; ) {
    if (!finitePair(p, k)) {
      k += 2;
      continue;
    }
    let end = k + 2;
    while (end + 1 < p.length && finitePair(p, end)) end += 2;
    const dx = p[end - 2] - p[k];
    const dy = p[end - 1] - p[k + 1];
    const across = Math.abs(dx) >= Math.abs(dy);
    if ((across && dx < 0) || (!across && dy < 0)) {
      for (let j = k; j < end; j += 2) {
        out[k + end - 2 - j] = p[j];
        out[k + end - 1 - j] = p[j + 1];
      }
    }
    k = end;
  }
  return out;
}

/**
 * A curve's polylines: each NaN-separated run is its own path and stroke, clipped segment by
 * segment. A dashed run that starts within JOIN_TOLERANCE_PX of the previous run's end continues
 * its dash phase; any other run starts the pattern afresh.
 */
function strokeCurve(
  ctx: Ctx,
  view: ViewSpec,
  g: CurveGeometry,
  clip: ClipRect,
  dotted: boolean
): void {
  const patterned = dotted || g.dashed;
  const width = ctx.lineWidth;
  // GP-23: dots are stroked at twice the line width, one every DOT_PERIOD_PX.
  if (dotted) ctx.lineWidth = 2 * width;
  ctx.setLineDash(
    dotted ? [DOT_LENGTH_PX, DOT_PERIOD_PX - DOT_LENGTH_PX] : g.dashed ? [...DASH_PX] : []
  );
  const p = g.polylines;
  let phase = 0;
  let previousEnd: Point | null = null;
  for (let k = 0; k + 1 < p.length; ) {
    if (!finitePair(p, k)) {
      k += 2;
      continue;
    }
    let end = k + 2;
    while (end + 1 < p.length && finitePair(p, end)) end += 2;
    const start = worldToPx(view, p[k], p[k + 1]);
    if (end - k >= 4) {
      const joins =
        previousEnd !== null &&
        Math.hypot(start[0] - previousEnd[0], start[1] - previousEnd[1]) <= JOIN_TOLERANCE_PX;
      if (!joins) phase = leadIn(view, start, worldToPx(view, p[k + 2], p[k + 3]), clip);
      const runPhase = phase;
      let pen: Point | null = null;
      let a = start;
      for (let j = k + 2; j < end; j += 2) {
        const b = worldToPx(view, p[j], p[j + 1]);
        const part = clipSegment(a, b, clip);
        if (part !== null) {
          const [from, to] = part;
          if (pen === null) ctx.beginPath();
          if (pen === null || pen[0] !== from[0] || pen[1] !== from[1]) ctx.moveTo(...from);
          ctx.lineTo(...to);
          pen = to;
          phase += Math.hypot(to[0] - from[0], to[1] - from[1]);
        }
        a = b;
      }
      if (pen !== null) {
        ctx.lineDashOffset = patterned ? runPhase : 0;
        ctx.stroke();
      }
      previousEnd = a;
    }
    k = end;
  }
  ctx.lineWidth = width;
}

/**
 * G-8: each position strokes the whole view height (vertical) or width (horizontal) as its own
 * run, unclipped. A position outside the grown view would paint nothing, so it is skipped.
 */
function strokeLines(ctx: Ctx, view: ViewSpec, g: LineSetGeometry, clip: ClipRect): void {
  ctx.setLineDash(g.dashed ? [...DASH_PX] : []);
  ctx.lineDashOffset = 0;
  const { width, height } = view.size;
  const vertical = g.orientation === "vertical";
  const [lo, hi] = vertical ? [clip.left, clip.right] : [clip.top, clip.bottom];
  for (const position of g.positions) {
    if (!Number.isFinite(position)) continue;
    const [x, y] = worldToPx(view, vertical ? position : 0, vertical ? 0 : position);
    const at = vertical ? x : y;
    if (!(at >= lo && at <= hi)) continue;
    ctx.beginPath();
    if (vertical) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    } else {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  }
}

function drawStrokes(
  ctx: Ctx,
  view: ViewSpec,
  g: CurveGeometry | LineSetGeometry,
  clip: ClipRect,
  dotted = false
): void {
  if (g.kind === "lines") {
    strokeLines(ctx, view, g, clip);
    return;
  }
  fillBands(ctx, view, g.bands, clip);
  strokeCurve(ctx, view, g, clip, dotted);
}

/**
 * Rows in list order, each complete before the next (GP-4, as the reference paints them, so a later
 * row's shading lies over an earlier row's curve): a region's shading (`shading`, by row id) then
 * its boundaries; curves (bands, then polylines) and line sets. Strokes are in the row colour at
 * CURVE_LINE_PX with round joins and caps, cut CURVE_CUT_PX past their width outside the view
 * (GP-20).
 */
export function drawCurveLayer(
  ctx: Ctx,
  view: ViewSpec,
  rows: readonly RenderRow[],
  shading: ReadonlyMap<string, readonly ShadingRect[]> = new Map()
): void {
  startLayer(ctx, view.dpr);
  ctx.lineWidth = CURVE_LINE_PX;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const clip = grown(view, CURVE_LINE_PX + CURVE_CUT_PX);
  for (const row of rows) {
    const g = row.geometry;
    if (g.kind === "points" || g.kind === "table") continue; // render-rows splits tables
    ctx.strokeStyle = row.color;
    ctx.fillStyle = row.color;
    ctx.lineWidth = row.selected === true ? CURVE_SELECTED_LINE_PX : CURVE_LINE_PX;
    if (g.kind === "region") {
      fillShading(ctx, shading.get(row.rowId) ?? [], view.dpr);
      ctx.fillStyle = row.color;
      for (const boundary of g.boundaries) {
        const oriented =
          boundary.kind === "curve" && boundary.dashed
            ? { ...boundary, polylines: orientRuns(boundary.polylines) }
            : boundary;
        drawStrokes(ctx, view, oriented, clip);
      }
    } else {
      drawStrokes(ctx, view, g, clip, row.lineStyle === "dotted");
    }
  }
}

/**
 * G-7, D-12, GP-28 to GP-30: each finite coordinate pair as a disc of POINT_RADIUS_PX, one path per
 * row; a table column may instead ask for open points (the disc with a `paper` hole of
 * POINT_HOLE_PX) or crosses (two diagonals of ±CROSS_ARM_PX, stroked round at CROSS_STROKE_PX).
 */
export function drawPointLayer(
  ctx: Ctx,
  view: ViewSpec,
  rows: readonly RenderRow[],
  paper: string
): void {
  startLayer(ctx, view.dpr);
  const clip = grown(view, 2 * POINT_RADIUS_PX);
  ctx.setLineDash([]);
  ctx.lineCap = "round";
  ctx.lineWidth = CROSS_STROKE_PX;
  for (const row of rows) {
    const g = row.geometry;
    if (g.kind !== "points") continue;
    const style = row.pointStyle ?? "filled";
    const centres: Point[] = [];
    for (let k = 0; k + 1 < g.coords.length; k += 2) {
      if (!finitePair(g.coords, k)) continue;
      const centre = worldToPx(view, g.coords[k], g.coords[k + 1]);
      if (isInside(centre, clip)) centres.push(centre);
    }
    if (centres.length === 0) continue;
    ctx.fillStyle = row.color;
    ctx.strokeStyle = row.color;
    ctx.beginPath();
    for (const [x, y] of centres) {
      if (style === "cross") {
        const a = CROSS_ARM_PX;
        ctx.moveTo(x - a, y - a);
        ctx.lineTo(x + a, y + a);
        ctx.moveTo(x - a, y + a);
        ctx.lineTo(x + a, y - a);
      } else {
        ctx.moveTo(x + POINT_RADIUS_PX, y);
        ctx.arc(x, y, POINT_RADIUS_PX, 0, 2 * Math.PI);
      }
    }
    if (style === "cross") {
      ctx.stroke();
      continue;
    }
    ctx.fill();
    if (style !== "open") continue;
    ctx.fillStyle = paper;
    ctx.beginPath();
    for (const [x, y] of centres) {
      ctx.moveTo(x + POINT_HOLE_PX, y);
      ctx.arc(x, y, POINT_HOLE_PX, 0, 2 * Math.PI);
    }
    ctx.fill();
  }
}

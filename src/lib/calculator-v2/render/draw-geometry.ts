// Paints the shading, curve and point layers of the graph (G-5): shading as opaque device-px
// rectangles, curves, bands, line sets and region boundaries as strokes in their row colour (G-1
// dashes, G-8 full-view lines), and points as filled dots (G-7). Every coordinate goes through the
// current view's worldToPx, and segments are clipped in float64 before the canvas sees them.

import type { CurveGeometry, LineSetGeometry } from "../plot/geometry";
import { worldToPx, type ViewSpec } from "../plot/viewport";
import {
  CURVE_LINE_PX,
  CURVE_SELECTED_LINE_PX,
  DASH_PX,
  JOIN_TOLERANCE_PX,
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

/** Fills each opaque device-px shading rectangle (from buildShadingRects) in its colour. */
export function drawShadingLayer(ctx: Ctx, rects: readonly ShadingRect[]): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  let colour: string | null = null;
  for (const rect of rects) {
    if (rect.color !== colour) {
      colour = rect.color;
      ctx.fillStyle = colour;
    }
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  }
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

/**
 * A curve's polylines: each NaN-separated run is its own path and stroke, clipped segment by
 * segment. A dashed run that starts within JOIN_TOLERANCE_PX of the previous run's end continues
 * its dash phase; any other run starts the pattern afresh.
 */
function strokeCurve(ctx: Ctx, view: ViewSpec, g: CurveGeometry, clip: ClipRect): void {
  ctx.setLineDash(g.dashed ? [...DASH_PX] : []);
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
      if (!joins) phase = 0;
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
        ctx.lineDashOffset = g.dashed ? runPhase : 0;
        ctx.stroke();
      }
      previousEnd = a;
    }
    k = end;
  }
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
  clip: ClipRect
): void {
  if (g.kind === "lines") {
    strokeLines(ctx, view, g, clip);
    return;
  }
  fillBands(ctx, view, g.bands, clip);
  strokeCurve(ctx, view, g, clip);
}

/**
 * Curves (bands, then polylines), line sets and region boundaries in list order, each in its row
 * colour at CURVE_LINE_PX with round joins and caps; region spans are the shading layer's.
 */
export function drawCurveLayer(ctx: Ctx, view: ViewSpec, rows: readonly RenderRow[]): void {
  startLayer(ctx, view.dpr);
  ctx.lineWidth = CURVE_LINE_PX;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const clip = grown(view, 2 * CURVE_LINE_PX);
  for (const row of rows) {
    const g = row.geometry;
    if (g.kind === "points" || g.kind === "table") continue; // render-rows splits tables
    ctx.strokeStyle = row.color;
    ctx.fillStyle = row.color;
    ctx.lineWidth = row.selected === true ? CURVE_SELECTED_LINE_PX : CURVE_LINE_PX;
    if (g.kind === "region") {
      for (const boundary of g.boundaries) drawStrokes(ctx, view, boundary, clip);
    } else {
      drawStrokes(ctx, view, g, clip);
    }
  }
}

/** G-7: a filled circle of POINT_RADIUS_PX at each finite coordinate pair, one path per row. */
export function drawPointLayer(ctx: Ctx, view: ViewSpec, rows: readonly RenderRow[]): void {
  startLayer(ctx, view.dpr);
  const clip = grown(view, 2 * POINT_RADIUS_PX);
  for (const row of rows) {
    const g = row.geometry;
    if (g.kind !== "points") continue;
    let started = false;
    for (let k = 0; k + 1 < g.coords.length; k += 2) {
      if (!finitePair(g.coords, k)) continue;
      const centre = worldToPx(view, g.coords[k], g.coords[k + 1]);
      if (!isInside(centre, clip)) continue;
      if (!started) {
        started = true;
        ctx.fillStyle = row.color;
        ctx.beginPath();
      }
      const [x, y] = centre;
      ctx.moveTo(x + POINT_RADIUS_PX, y);
      ctx.arc(x, y, POINT_RADIUS_PX, 0, 2 * Math.PI);
    }
    if (started) ctx.fill();
  }
}

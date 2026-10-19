// Paints a grid plan (G-5) on the grid layer: Cartesian gridlines and the axes as crisp device-px
// rectangles, polar spokes and rings as strokes, arrow tips as filled triangles, and tick labels
// with a paper-coloured halo. Every colour is a RenderTheme role (TH-3).

import type { ViewSpec } from "../plot/viewport";
import {
  ARROW_HALF_WIDTH_PX,
  ARROW_LENGTH_PX,
  AXIS_FONT,
  AXIS_LINE_PX,
  GRID_LINE_PX,
  LABEL_HALO_PX,
} from "./constants";
import { clipSegment, type ClipRect } from "./draw-geometry";
import type { GridPlan, PxEllipse, PxSegment } from "./grid-plan";
import type { RenderTheme } from "./types";
import type { Point } from "./view-input";

type Ctx = CanvasRenderingContext2D;

/**
 * Rings wider than this many CSS px are traced as clipped polylines: Canvas paths hold float32
 * coordinates, which lose sub-pixel precision on a huge native ellipse.
 */
const NATIVE_ELLIPSE_PX = 1e5;
const ARC_SAGITTA_PX = 0.1; // the most a traced ring's chord strays from the ring
const MAX_ARC_STEPS = 4096;

/**
 * An axis-aligned segment as a device-px rectangle `max(1, round(px·dpr))` thick, placed at
 * `snap(pos·dpr) − floor(thickness/2)`; draw under the identity transform. Gridlines snap down
 * (floor), as the reference's do (GP-2), so a line just left of or above the canvas stays off it;
 * axes round.
 */
function fillLine(
  ctx: Ctx,
  s: PxSegment,
  px: number,
  dpr: number,
  snap: (v: number) => number = Math.round
): void {
  const t = Math.max(1, Math.round(px * dpr));
  const across = (pos: number) => snap(pos * dpr) - Math.floor(t / 2);
  const along = (a: number, b: number) => [
    Math.round(Math.min(a, b) * dpr),
    Math.round(Math.max(a, b) * dpr),
  ];
  if (s.x0 === s.x1) {
    const [y0, y1] = along(s.y0, s.y1);
    ctx.fillRect(across(s.x0), y0, t, y1 - y0);
  } else if (s.y0 === s.y1) {
    const [x0, x1] = along(s.x0, s.x1);
    ctx.fillRect(x0, across(s.y0), x1 - x0, t);
  }
}

/**
 * The angles of ring `e` that can reach `r`: the cone `r` subtends from the centre (a convex set
 * apart from the centre spans less than a half turn), or the full turn when the centre is in `r`.
 */
function visibleAngles(e: PxEllipse, r: ClipRect): [number, number] {
  if (e.cx >= r.left && e.cx <= r.right && e.cy >= r.top && e.cy <= r.bottom) {
    return [0, 2 * Math.PI];
  }
  const angle = (x: number, y: number) => Math.atan2((y - e.cy) / e.ry, (x - e.cx) / e.rx);
  const mid = angle((r.left + r.right) / 2, (r.top + r.bottom) / 2);
  let lo = 0;
  let hi = 0;
  for (const x of [r.left, r.right]) {
    for (const y of [r.top, r.bottom]) {
      let a = angle(x, y) - mid;
      a -= 2 * Math.PI * Math.round(a / (2 * Math.PI));
      lo = Math.min(lo, a);
      hi = Math.max(hi, a);
    }
  }
  return [mid + lo, mid + hi];
}

/** Adds ring `e` to the path: natively, or for a huge ring as its visible arc, clipped to `r`. */
function traceRing(ctx: Ctx, e: PxEllipse, r: ClipRect): void {
  if (!(e.rx > 0 && e.ry > 0)) return;
  const radius = Math.max(e.rx, e.ry);
  if (radius <= NATIVE_ELLIPSE_PX) {
    ctx.moveTo(e.cx + e.rx, e.cy);
    ctx.ellipse(e.cx, e.cy, e.rx, e.ry, 0, 0, 2 * Math.PI);
    return;
  }
  // A chord of Δ radians strays at most radius·Δ²/8 from the ring.
  const [from, to] = visibleAngles(e, r);
  const steps = Math.min(
    MAX_ARC_STEPS,
    Math.max(1, Math.ceil((to - from) * Math.sqrt(radius / (8 * ARC_SAGITTA_PX))))
  );
  const at = (k: number): Point => {
    const a = from + ((to - from) * k) / steps;
    return [e.cx + e.rx * Math.cos(a), e.cy + e.ry * Math.sin(a)];
  };
  let pen: Point | null = null;
  let a = at(0);
  for (let k = 1; k <= steps; k++) {
    const b = at(k);
    const part = clipSegment(a, b, r);
    if (part !== null) {
      if (pen === null || pen[0] !== part[0][0] || pen[1] !== part[0][1]) ctx.moveTo(...part[0]);
      ctx.lineTo(...part[1]);
      pen = part[1];
    }
    a = b;
  }
}

/**
 * One class of gridlines in `colour`: device-px rectangles, or for a polar plan its spokes,
 * clipped in float64, and its rings, stroked as one path.
 */
function paintGridClass(
  ctx: Ctx,
  view: ViewSpec,
  polar: boolean,
  lines: readonly PxSegment[],
  ellipses: readonly PxEllipse[],
  colour: string
): void {
  const { dpr } = view;
  if (!polar) {
    if (lines.length === 0) return;
    ctx.fillStyle = colour;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const s of lines) fillLine(ctx, s, GRID_LINE_PX, dpr, Math.floor);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return;
  }
  if (lines.length === 0 && ellipses.length === 0) return;
  const { width, height } = view.size;
  const clip: ClipRect = {
    left: -GRID_LINE_PX,
    top: -GRID_LINE_PX,
    right: width + GRID_LINE_PX,
    bottom: height + GRID_LINE_PX,
  };
  ctx.strokeStyle = colour;
  ctx.beginPath();
  for (const s of lines) {
    const part = clipSegment([s.x0, s.y0], [s.x1, s.y1], clip);
    if (part === null) continue;
    ctx.moveTo(...part[0]);
    ctx.lineTo(...part[1]);
  }
  for (const e of ellipses) traceRing(ctx, e, clip);
  ctx.stroke();
}

/**
 * The grid layer: minor lines (gridMinor), major lines (gridMajor), axes (axis), arrow tips
 * (filled in axis), then labels in AXIS_FONT, each over a LABEL_HALO_PX halo in paper (TH-9's
 * technique) so text stays legible on the lines; all halos go down before any text.
 */
export function drawGridLayer(ctx: Ctx, plan: GridPlan, theme: RenderTheme, view: ViewSpec): void {
  const { dpr } = view;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.setLineDash([]);
  ctx.lineWidth = GRID_LINE_PX;
  ctx.lineJoin = "round";
  ctx.lineCap = "butt";
  paintGridClass(ctx, view, plan.polar, plan.minorLines, plan.minorEllipses, theme.gridMinor);
  paintGridClass(ctx, view, plan.polar, plan.majorLines, plan.majorEllipses, theme.gridMajor);

  ctx.fillStyle = theme.axis;
  if (plan.axes.length > 0) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const s of plan.axes) fillLine(ctx, s, AXIS_LINE_PX, dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  if (plan.arrows.length > 0) {
    ctx.beginPath();
    for (const { x, y, direction } of plan.arrows) {
      ctx.moveTo(x, y);
      if (direction === "right") {
        ctx.lineTo(x - ARROW_LENGTH_PX, y - ARROW_HALF_WIDTH_PX);
        ctx.lineTo(x - ARROW_LENGTH_PX, y + ARROW_HALF_WIDTH_PX);
      } else {
        ctx.lineTo(x - ARROW_HALF_WIDTH_PX, y + ARROW_LENGTH_PX);
        ctx.lineTo(x + ARROW_HALF_WIDTH_PX, y + ARROW_LENGTH_PX);
      }
      ctx.closePath();
    }
    ctx.fill();
  }

  if (plan.labels.length === 0) return;
  ctx.font = AXIS_FONT;
  ctx.lineWidth = 2 * LABEL_HALO_PX; // the stroke straddles the glyph edge: LABEL_HALO_PX outside it
  ctx.lineJoin = "round";
  ctx.strokeStyle = theme.paper;
  ctx.fillStyle = theme.text;
  for (const pass of ["halo", "text"] as const) {
    for (const label of plan.labels) {
      ctx.textAlign = label.align;
      ctx.textBaseline = label.baseline;
      if (pass === "halo") ctx.strokeText(label.text, label.x, label.y);
      else ctx.fillText(label.text, label.x, label.y);
    }
  }
}

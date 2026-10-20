// Paints a grid plan (G-5) on the grid layer: Cartesian gridlines as crisp device-px rectangles,
// polar spokes and rings, the axes and ticks as anti-aliased strokes, arrow tips, and labels with a
// paper-coloured halo. Every colour is a RenderTheme role (TH-3).

import type { ViewSpec } from "../plot/viewport";
import {
  ARROW_HALF_WIDTH_PX,
  ARROW_LENGTH_PX,
  AXIS_FONT,
  AXIS_LINE_PX,
  GRID_LINE_PX,
  LABEL_HALO_PX,
  SCI_EXPONENT_OVERLAP_PX,
  SCI_EXPONENT_RAISE_PX,
  TITLE_FONT,
  TITLE_LETTER_FONT,
} from "./constants";
import { clipSegment, type ClipRect } from "./draw-geometry";
import type { GridPlan, LabelFont, PxEllipse, PxLabel, PxSegment } from "./grid-plan";
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

/** Floor, forgiving float error: a line computed at 798.9999 px belongs on pixel 799. */
const snapDown = (v: number) => Math.floor(v + 1e-6);

/**
 * A Cartesian gridline as a device-px rectangle `max(1, round(px·dpr))` thick. Like the
 * reference (GP-2), the line centres on the half CSS px after its position rounded down, so at
 * DPR 2 it covers the two device px of that CSS px; a line whose CSS px is the canvas's first or
 * its last (`extent`, the canvas size across the line) is not drawn. Draw under the identity
 * transform.
 */
function fillGridLine(
  ctx: Ctx,
  s: PxSegment,
  px: number,
  dpr: number,
  size: ViewSpec["size"]
): void {
  const t = Math.max(1, Math.round(px * dpr));
  const vertical = s.x0 === s.x1;
  if (!vertical && s.y0 !== s.y1) return;
  const cell = snapDown(vertical ? s.x0 : s.y0);
  const extent = vertical ? size.width : size.height;
  if (cell === 0 || cell === snapDown(extent)) return;
  const across = Math.round((cell + 0.5) * dpr - t / 2);
  const along = (a: number, b: number) => [
    Math.round(Math.min(a, b) * dpr),
    Math.round(Math.max(a, b) * dpr),
  ];
  if (vertical) {
    const [y0, y1] = along(s.y0, s.y1);
    ctx.fillRect(across, y0, t, y1 - y0);
  } else {
    const [x0, x1] = along(s.x0, s.x1);
    ctx.fillRect(x0, across, x1 - x0, t);
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
    for (const s of lines) fillGridLine(ctx, s, GRID_LINE_PX, dpr, view.size);
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

const mean = (hex: string) =>
  [1, 3, 5].reduce((sum, i) => sum + parseInt(hex.slice(i, i + 2), 16), 0) / 3;
const HEX = /^#[0-9a-f]{6}$/i;

/**
 * GP-2, GP-3, GP-7: the reference inks its grid and axes as the text colour at a partial alpha,
 * so crossings darken and minors under majors stack. Each role colour is read back as the alpha
 * of text over paper that gives it: minors alone, majors stacked over a minor when minors are
 * drawn (`stacked`), axes alone. A skin whose roles cannot be read that way (a non-hex colour,
 * text as light as the paper, or a role outside the text–paper range) keeps its opaque roles.
 */
export function gridInk(theme: RenderTheme, stacked: boolean) {
  const opaque = {
    minor: 1,
    major: 1,
    axis: 1,
    color: { minor: theme.gridMinor, major: theme.gridMajor, axis: theme.axis },
  };
  const roles = [theme.paper, theme.text, theme.gridMinor, theme.gridMajor, theme.axis];
  if (!roles.every((c) => HEX.test(c))) return opaque;
  const [p, t, minor, major, axis] = roles.map(mean);
  if (Math.abs(p - t) < 32) return opaque;
  const alone = (r: number) => (p - r) / (p - t);
  const a = {
    minor: alone(minor),
    major: stacked ? 1 - (major - t) / (minor - t) : alone(major),
    axis: alone(axis),
  };
  if (![a.minor, a.major, a.axis].every((v) => Number.isFinite(v) && v > 0 && v <= 1)) {
    return opaque;
  }
  return { ...a, color: { minor: theme.text, major: theme.text, axis: theme.text } };
}

/** The CSS font of a label (GP-9, GP-10). */
export function labelFont(font: LabelFont = "axis"): string {
  return font === "title" ? TITLE_FONT : font === "letter" ? TITLE_LETTER_FONT : AXIS_FONT;
}

/** Strokes `segments` as one path at the current line width. */
function strokeSegments(ctx: Ctx, segments: readonly PxSegment[]): void {
  if (segments.length === 0) return;
  ctx.beginPath();
  for (const s of segments) {
    ctx.moveTo(s.x0, s.y0);
    ctx.lineTo(s.x1, s.y1);
  }
  ctx.stroke();
}

/**
 * Each label stroked in a paper halo then filled (GP-10), one after the other: numbers in the
 * text colour, pinned ones in the major-grid grey (GP-15), with any exponent raised after the text
 * (GP-16).
 */
function paintLabels(ctx: Ctx, labels: readonly PxLabel[], theme: RenderTheme): void {
  ctx.lineWidth = 2 * LABEL_HALO_PX; // the stroke straddles the glyph edge: LABEL_HALO_PX outside it
  ctx.lineJoin = "miter";
  ctx.miterLimit = 2;
  ctx.strokeStyle = theme.paper;
  ctx.textBaseline = "alphabetic";
  const paint = (text: string, x: number, y: number) => {
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
  };
  for (const label of labels) {
    ctx.font = labelFont(label.font);
    ctx.fillStyle = label.pinned === true ? theme.gridMajor : theme.text;
    ctx.textAlign = label.align;
    paint(label.text, label.x, label.y);
    if (label.exponent === undefined) continue;
    const w = ctx.measureText(label.text).width;
    const end =
      label.align === "left" ? label.x + w : label.align === "right" ? label.x : label.x + w / 2;
    ctx.textAlign = "left";
    paint(label.exponent, end - SCI_EXPONENT_OVERLAP_PX, label.y - SCI_EXPONENT_RAISE_PX);
  }
}

/**
 * The grid layer: minor lines (gridMinor), major lines (gridMajor) over them, the axes stroked at
 * AXIS_LINE_PX in the axis colour (GP-7), grid-off ticks (GP-5), arrow tips filled and stroked
 * (GP-8), then the labels. The shading layer sits above this one (GP-4).
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
  const ink = gridInk(theme, plan.minorLines.length + plan.minorEllipses.length > 0);
  ctx.globalAlpha = ink.minor;
  paintGridClass(ctx, view, plan.polar, plan.minorLines, plan.minorEllipses, ink.color.minor);
  ctx.globalAlpha = ink.major;
  paintGridClass(ctx, view, plan.polar, plan.majorLines, plan.majorEllipses, ink.color.major);
  ctx.globalAlpha = ink.axis;
  ctx.strokeStyle = ink.color.axis;
  ctx.fillStyle = ink.color.axis;
  ctx.lineWidth = AXIS_LINE_PX;
  strokeSegments(ctx, plan.axes);
  strokeSegments(ctx, plan.ticks);
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
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  if (plan.labels.length > 0) paintLabels(ctx, plan.labels, theme);
}

/**
 * Coordinate-plane builder: grid, axes, tick labels, function graphs, points,
 * segments, rays, lines, circles, arcs, polygons and shaded regions
 * (plane-shapes.ts), as a role-colored Scene. Function graphs are the
 * part's `samples`, world polylines computed when the figure is authored
 * (scripts/figures/sample-functions.ts); the engine never loads the
 * calculator. Polylines, rays and lines are clipped to the frame
 * (Liang–Barsky) and end in arrowheads where they leave it; segments never do.
 * Axis and tick labels sit at fixed positions; part labels are placed clear
 * of them and of every line (plane-labels.ts). Region fills sit under every
 * line; a part marked hidden_dashed draws dashed.
 */
import { planeDetail } from "./describe-detail";
import { HOUSE } from "./house";
import { textBox } from "./labels";
import { planeLabels } from "./plane-labels";
import { helperPoints, pathOf, regionItems, shapeItems } from "./plane-shapes";
import type { Scene, SceneIssue, SceneItem } from "./scene";
import type { FigureSpec, Part, PlaneFrame } from "./spec";
import { axisTicks, tickValues } from "./ticks";

export type Box = { width: number; height: number };
type Pt = [number, number];
/** Distance in px from each box edge to the plot area. */
export type Inset = { left: number; right: number; top: number; bottom: number };
export type Mapper = ReturnType<typeof mapper>;

const EPS = 1e-9;
/** Coincidence tolerance, relative to the frame's larger span. */
const REL_EPS = 1e-12;

const MARGIN_INSET: Inset = {
  left: HOUSE.margin,
  right: HOUSE.margin,
  top: HOUSE.margin,
  bottom: HOUSE.margin,
};

/** World-to-pixel mapping for the frame inside the box, less `inset` on each side. */
function mapper(frame: PlaneFrame, box: Box, inset: Inset = MARGIN_INSET) {
  const [x0, x1] = frame.x;
  const [y0, y1] = frame.y;
  const w = box.width - inset.left - inset.right;
  const h = box.height - inset.top - inset.bottom;
  return {
    w,
    h,
    px: (x: number) => inset.left + ((x - x0) / (x1 - x0)) * w,
    py: (y: number) => inset.top + ((y1 - y) / (y1 - y0)) * h,
  };
}

/** A coordinate rounded to 2 decimals for path data. */
export const fmt = (n: number) => String(Math.round(n * 100) / 100);

/**
 * Liang–Barsky: the parameter range [t0, t1] of p + t·d that lies inside the
 * frame, starting from [tMin, tMax], or null when none does (or when the
 * range stays unbounded, which only a zero direction can cause). Parallel
 * means an exactly zero component, so a tiny direction still clips; callers
 * with unbounded ranges pass a unit direction.
 */
export function clipParam(
  p: Pt,
  d: Pt,
  frame: PlaneFrame,
  tMin: number,
  tMax: number
): [number, number] | null {
  let t0 = tMin;
  let t1 = tMax;
  const checks: [number, number][] = [
    [-d[0], p[0] - frame.x[0]],
    [d[0], frame.x[1] - p[0]],
    [-d[1], p[1] - frame.y[0]],
    [d[1], frame.y[1] - p[1]],
  ];
  for (const [q, r] of checks) {
    if (q === 0) {
      if (r < 0) return null;
      continue;
    }
    const t = r / q;
    if (q < 0) {
      if (t > t1) return null;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return null;
      if (t < t1) t1 = t;
    }
  }
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return null; // unbounded both ways
  return t0 <= t1 ? [t0, t1] : null;
}

/** Splits a world polyline into runs that stay inside the frame. */
export function clipPolyline(run: readonly Pt[], frame: PlaneFrame): Pt[][] {
  const out: Pt[][] = [];
  let cur: Pt[] = [];
  const close = () => {
    if (cur.length > 1) out.push(cur);
    cur = [];
  };
  for (let i = 0; i + 1 < run.length; i++) {
    const a: Pt = [run[i][0], run[i][1]];
    const d: Pt = [run[i + 1][0] - a[0], run[i + 1][1] - a[1]];
    const c = clipParam(a, d, frame, 0, 1);
    if (!c) {
      close();
      continue;
    }
    const s: Pt = [a[0] + c[0] * d[0], a[1] + c[0] * d[1]];
    const e: Pt = [a[0] + c[1] * d[0], a[1] + c[1] * d[1]];
    const last = cur[cur.length - 1];
    if (!last || c[0] > 0 || Math.hypot(last[0] - s[0], last[1] - s[1]) > EPS) {
      close();
      cur.push(s);
    }
    cur.push(e);
    if (c[1] < 1) close();
  }
  close();
  return out;
}

/** How the y-axis is drawn: with grid, ticks and labels, or not at all (a number line). */
export type YAxisMode = "ticks" | "none";

/** Options for planeAxes: the y-axis mode and room kept clear for titles, legends and row labels. */
export type AxesOptions = { y?: YAxisMode; reserve?: Partial<Inset> };

/** Grid and tick steps per axis (undefined: the automatic step from ./ticks). */
function steps(frame: PlaneFrame) {
  const x = frame.step;
  const y = frame.yStep ?? frame.step;
  // labelStep spans both axes only while they share one step.
  const yLabel = frame.yLabelStep ?? (frame.yStep === undefined ? frame.labelStep : undefined);
  return { x, y, xLabel: frame.labelStep, yLabel };
}

function grid(frame: PlaneFrame, m: Mapper, yMode: YAxisMode): SceneItem[] {
  if (frame.grid === false) return [];
  const { w, h, px, py } = m;
  const s = steps(frame);
  const items: SceneItem[] = [];
  // Categories get no vertical lines; a number line (no y-axis) gets no grid at all.
  if (yMode === "none") return items;
  const xs = frame.categories
    ? []
    : s.x
      ? tickValues(frame.x[0], frame.x[1], s.x)
      : axisTicks(frame.x[0], frame.x[1], w).major;
  const ys = s.y
    ? tickValues(frame.y[0], frame.y[1], s.y)
    : axisTicks(frame.y[0], frame.y[1], h).major;
  for (const x of xs) {
    items.push({
      t: "path",
      d: `M${fmt(px(x))} ${fmt(py(frame.y[1]))} L${fmt(px(x))} ${fmt(py(frame.y[0]))}`,
      role: "grid",
      weight: "grid",
    });
  }
  for (const y of ys) {
    items.push({
      t: "path",
      d: `M${fmt(px(frame.x[0]))} ${fmt(py(y))} L${fmt(px(frame.x[1]))} ${fmt(py(y))}`,
      role: "grid",
      weight: "grid",
    });
  }
  return items;
}

/** Bluebook density: labels need at least this much center spacing along an axis. */
export const MIN_LABEL_SPACING_PX = 28;

/**
 * The step between tick labels on an axis `lengthPx` long: every `every` (an
 * explicit label step, snapped to a whole number of ticks so labels sit on
 * ticks), else every grid step (`step`, else the step axisTicks picks),
 * doubled while labels would sit closer than MIN_LABEL_SPACING_PX (once, on
 * any sensible axis). 0 means no labels.
 */
function labelStep(
  range: [number, number],
  lengthPx: number,
  step?: number,
  every?: number
): number {
  const tick = step ?? axisTicks(range[0], range[1], lengthPx).step;
  let base = every && tick ? tick * Math.max(1, Math.round(every / tick)) : (every ?? tick);
  if (!base || !(lengthPx > 0)) return 0;
  const pxPerUnit = lengthPx / (range[1] - range[0]);
  while (base * pxPerUnit < MIN_LABEL_SPACING_PX) base *= 2;
  return base;
}

const clamp = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, v));

/** Estimated advance of `text` at the house font (the same estimate textBounds uses). */
const advance = (text: string) => HOUSE.charWidthEm * HOUSE.font * text.length;

/** Line height for wrapped text. */
export const LINE_HEIGHT = Math.round(HOUSE.font * 1.2);

/** Words of `text` packed into lines no wider than `maxWidth`; a long word keeps its own line. */
export function wrapText(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    const last = lines[lines.length - 1];
    if (last !== undefined && advance(`${last} ${word}`) <= maxWidth) {
      lines[lines.length - 1] = `${last} ${word}`;
    } else lines.push(word);
  }
  return lines;
}

/** A short axis name (x, y, t, f(x)) sits at the axis end; a longer one is a title beside the plot. */
const isShortName = (name: string) => name.length <= 4 && !/\s/.test(name);
/** A single-letter name is a variable and prints in italic. */
const isVariable = (name: string) => /^[A-Za-z]$/.test(name);

/** True when text `t` would overlap a text in `items` by more than 1px both ways (checks.ts). */
function collides(t: SceneItem, items: SceneItem[]): boolean {
  if (t.t !== "text") return false;
  const a = textBox(t);
  return items.some((o) => {
    if (o.t !== "text") return false;
    const b = textBox(o);
    return (
      Math.min(a[1], b[1]) - Math.max(a[0], b[0]) > 1 &&
      Math.min(a[3], b[3]) - Math.max(a[2], b[2]) > 1
    );
  });
}

function axes(frame: PlaneFrame, m: Mapper, yMode: YAxisMode): SceneItem[] {
  const { w, h, px, py } = m;
  const yAxis = yMode === "ticks";
  // The x-axis sits at y = 0, or the nearer frame edge; a number line sits at the bottom.
  const ax = yAxis ? clamp(0, frame.y) : frame.y[0];
  const ay = clamp(0, frame.x);
  const font = HOUSE.font;
  const off = HOUSE.labelOffset;
  const items: SceneItem[] = [
    {
      t: "path",
      d: `M${fmt(px(frame.x[0]))} ${fmt(py(ax))} L${fmt(px(frame.x[1]))} ${fmt(py(ax))}`,
      role: "ink",
      weight: "line",
      partId: "axis",
    },
  ];
  if (yAxis) {
    items.push({
      t: "path",
      d: `M${fmt(px(ay))} ${fmt(py(frame.y[0]))} L${fmt(px(ay))} ${fmt(py(frame.y[1]))}`,
      role: "ink",
      weight: "line",
      partId: "axis",
    });
  }
  const tick = HOUSE.tickLength / 2;
  const s = steps(frame);
  // Where both labelled axes cross at 0, one "0" serves both.
  const sharedOrigin = yAxis && !frame.categories && ax === 0 && ay === 0;
  // Baseline of the lowest text under the plot, for the x-axis title.
  let below = py(frame.y[0]);
  let xStep = 0;
  if (frame.categories) {
    const band = w / frame.categories.length;
    frame.categories.forEach((name, i) => {
      const lines = wrapText(name, band - off);
      lines.forEach((line, k) => {
        const y = py(frame.y[0]) + off + font + k * LINE_HEIGHT;
        below = Math.max(below, y);
        items.push({ t: "text", x: px(i + 0.5), y, text: line, role: "ink", anchor: "middle" });
      });
    });
  } else {
    xStep = labelStep(frame.x, w, s.x, s.xLabel);
    for (const x of xStep ? tickValues(frame.x[0], frame.x[1], xStep) : []) {
      if (sharedOrigin && Math.abs(x) < EPS) continue; // the origin is labeled once, below
      const X = px(x);
      const Y = py(ax);
      items.push({
        t: "path",
        d: `M${fmt(X)} ${fmt(Y - tick)} L${fmt(X)} ${fmt(Y + tick)}`,
        role: "ink",
        weight: "line",
      });
      items.push({
        t: "text",
        x: X,
        y: Y + tick + font,
        text: fmt(x),
        role: "ink-muted",
        anchor: "middle",
      });
      below = Math.max(below, Y + tick + font);
    }
  }
  // Width of the widest y tick label, for the y-axis title.
  let yLabelWidth = 0;
  const yStep = yAxis ? labelStep(frame.y, h, s.y, s.yLabel) : 0;
  for (const y of yStep ? tickValues(frame.y[0], frame.y[1], yStep) : []) {
    if (sharedOrigin && Math.abs(y) < EPS) continue;
    const X = px(ay);
    const Y = py(y);
    items.push({
      t: "path",
      d: `M${fmt(X - tick)} ${fmt(Y)} L${fmt(X + tick)} ${fmt(Y)}`,
      role: "ink",
      weight: "line",
    });
    const label: SceneItem = {
      t: "text",
      x: X - tick - off / 2,
      y: Y + font / 3,
      text: fmt(y),
      role: "ink-muted",
      anchor: "end",
    };
    // Where the axes meet away from the origin (a histogram from 10), the x-axis
    // label at the corner wins and the y label beside it is left off.
    if (!collides(label, items)) items.push(label);
    yLabelWidth = Math.max(yLabelWidth, advance(fmt(y)) + tick + off / 2);
  }
  // One "0" at the origin, below and left of it, unless the spec leaves it off, or
  // the axes are so short that it would sit on the first tick label below it.
  if (sharedOrigin && frame.originLabel !== false && (xStep || yStep)) {
    const zero: SceneItem = {
      t: "text",
      x: px(0) - tick - off / 2,
      y: py(0) + tick + font,
      text: "0",
      role: "ink-muted",
      anchor: "end",
    };
    if (!collides(zero, items)) items.push(zero);
  }
  items.push(...axisNames(frame, m, { ax, ay, yAxis, below, yLabelWidth }));
  return items;
}

/** Axis names: short ones at the positive ends, longer ones as titles below and above the plot. */
function axisNames(
  frame: PlaneFrame,
  m: Mapper,
  at: { ax: number; ay: number; yAxis: boolean; below: number; yLabelWidth: number }
): SceneItem[] {
  const { w, px, py } = m;
  const off = HOUSE.labelOffset;
  const items: SceneItem[] = [];
  // Category bands (a bar chart) have no x variable to name.
  const xName = (frame.xLabel ?? (frame.categories ? "" : "x")).trim();
  const yName = at.yAxis ? (frame.yLabel ?? "y").trim() : "";
  if (xName && isShortName(xName)) {
    items.push({
      t: "text",
      x: px(frame.x[1]) - off,
      y: py(at.ax) - off,
      text: xName,
      role: "ink",
      anchor: "end",
      italic: isVariable(xName) || undefined,
    });
  } else if (xName) {
    const mid = (px(frame.x[0]) + px(frame.x[1])) / 2;
    wrapText(xName, w).forEach((line, k) => {
      items.push({
        t: "text",
        x: mid,
        y: at.below + HOUSE.font + off + k * LINE_HEIGHT,
        text: line,
        role: "ink",
        anchor: "middle",
      });
    });
  }
  if (yName && isShortName(yName)) {
    items.push({
      t: "text",
      x: px(at.ay) + off,
      y: py(frame.y[1]) + HOUSE.font,
      text: yName,
      role: "ink",
      anchor: "start",
      italic: isVariable(yName) || undefined,
    });
  } else if (yName) {
    // Above the plot, left-aligned with the y tick labels.
    const left = px(at.ay) - at.yLabelWidth;
    const lines = wrapText(yName, px(frame.x[1]) - left);
    const top = py(frame.y[1]) - HOUSE.font - off - (lines.length - 1) * LINE_HEIGHT;
    lines.forEach((line, k) => {
      items.push({
        t: "text",
        x: left,
        y: top + k * LINE_HEIGHT,
        text: line,
        role: "ink",
        anchor: "start",
      });
    });
  }
  return items;
}

/** A clipped segment, ray or line, with arrows where a ray or line leaves the frame. */
function straight(
  part: Extract<Part, { kind: "segment" | "ray" | "line" }>,
  points: Map<string, Pt>,
  frame: PlaneFrame,
  m: Mapper,
  issues: SceneIssue[]
): SceneItem | null {
  const a = points.get(part.from);
  const b = points.get(part.to);
  if (!a || !b) return null;
  const span = Math.max(frame.x[1] - frame.x[0], frame.y[1] - frame.y[0]);
  const tol = REL_EPS * span;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (!(len > tol)) {
    issues.push({ code: "off_line", partId: part.id, detail: "its two points coincide" });
    return null;
  }
  // Clip along a unit direction, so t is a world distance and tiny offsets clip exactly.
  const d: Pt = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  const range =
    part.kind === "segment"
      ? [0, len]
      : part.kind === "ray"
        ? [0, Infinity]
        : [-Infinity, Infinity];
  const c = clipParam(a, d, frame, range[0], range[1]);
  if (!c || c[1] - c[0] < tol) {
    issues.push({ code: "clipped", partId: part.id, detail: "lies outside the frame" });
    return null;
  }
  if (part.kind === "segment" && (c[0] > tol || c[1] < len - tol)) {
    issues.push({ code: "clipped", partId: part.id, detail: "runs past the frame" });
  }
  if (part.kind === "ray" && c[0] > tol) {
    issues.push({
      code: "clipped",
      partId: part.id,
      detail: "its start point is outside the frame",
    });
  }
  const pts: Pt[] = [c[0], c[1]].map((t) => [a[0] + t * d[0], a[1] + t * d[1]] as Pt);
  if (!pts.flat().every(Number.isFinite)) {
    issues.push({ code: "clipped", partId: part.id, detail: "could not be clipped to the frame" });
    return null;
  }
  const item: SceneItem = {
    t: "path",
    d: pathOf(pts, m),
    role: "ink",
    weight: "line",
    partId: part.id,
  };
  if (part.kind === "ray") item.arrows = "end";
  if (part.kind === "line") item.arrows = "both";
  return item;
}

/** A dot of radius `r` centred on pixel (X, Y): filled, or open (outline only). */
export function dotAt(
  X: number,
  Y: number,
  partId: string,
  r: number = HOUSE.pointRadius,
  open = false
): SceneItem {
  const item: SceneItem = {
    t: "path",
    d: `M${fmt(X - r)} ${fmt(Y)} A${r} ${r} 0 1 0 ${fmt(X + r)} ${fmt(Y)} A${r} ${r} 0 1 0 ${fmt(X - r)} ${fmt(Y)} Z`,
    role: "ink",
    weight: "line",
    partId,
  };
  if (!open) item.fill = "ink";
  return item;
}

function dot([x, y]: Pt, m: Mapper, partId: string): SceneItem {
  return dotAt(m.px(x), m.py(y), partId);
}

/**
 * The graph of a function part: its authored `samples`, clipped to the frame
 * (and to its domain). A part without samples draws nothing and is reported
 * as "unsampled_function"; run scripts/figures/sample-spec.ts to fill them.
 */
export function functionItems(
  part: Extract<Part, { kind: "function" }>,
  frame: PlaneFrame,
  m: Mapper,
  issues: SceneIssue[]
): SceneItem[] {
  if (!part.samples) {
    issues.push({
      code: "unsampled_function",
      partId: part.id,
      detail: "has no samples; run scripts/figures/sample-spec.ts",
    });
    return [];
  }
  let sub = frame;
  if (part.domain) {
    const lo = Math.max(frame.x[0], Math.min(...part.domain));
    const hi = Math.min(frame.x[1], Math.max(...part.domain));
    if (hi <= lo) {
      issues.push({ code: "clipped", partId: part.id, detail: "its domain is outside the frame" });
      return [];
    }
    sub = { ...frame, x: [lo, hi] };
  }
  const clipped = part.samples.flatMap((run) => clipPolyline(run, sub));
  if (clipped.length === 0) {
    issues.push({ code: "clipped", partId: part.id, detail: "draws nothing inside the frame" });
    return [];
  }
  return clipped.map((pts) => ({
    t: "path",
    d: pathOf(pts, m),
    role: "ink",
    weight: "line",
    partId: part.id,
  }));
}

function describePlane(spec: FigureSpec, frame: PlaneFrame): string {
  const counts = new Map<string, number>();
  for (const p of spec.parts) counts.set(p.kind, (counts.get(p.kind) ?? 0) + 1);
  const what = [...counts].map(([k, n]) => `${n} ${k}${n > 1 ? "s" : ""}`).join(", ");
  const base = `A coordinate plane with x from ${fmt(frame.x[0])} to ${fmt(frame.x[1])} and y from ${fmt(frame.y[0])} to ${fmt(frame.y[1])}`;
  // What is drawn, so two graphs in one frame never read the same (describe-detail.ts).
  const detail = planeDetail(spec);
  if (detail.length) return `${base}: ${detail.join("; ")}.`;
  return what ? `${base}, showing ${what}.` : `${base}.`;
}

/** Estimated box [left, right, top, bottom] of a text item, in px. */
function textBounds(t: Extract<SceneItem, { t: "text" }>): [number, number, number, number] {
  const w = HOUSE.charWidthEm * HOUSE.font * t.text.length;
  const x0 = t.anchor === "start" ? t.x : t.anchor === "middle" ? t.x - w / 2 : t.x - w;
  // Cap height above the baseline, a descender's room below it.
  return [x0, x0 + w, t.y - HOUSE.font, t.y + 0.25 * HOUSE.font];
}

/**
 * The plot inset that keeps every axis label inside the box: the house margin
 * plus any reserved room, grown on any side where labels would hang past the
 * edge (an axis on a frame edge, as in a first-quadrant plane). Labels keep
 * their place outside the axes; the plot shrinks to make room. A few passes
 * settle the mapping.
 */
function labelInset(frame: PlaneFrame, box: Box, opts: AxesOptions): Inset {
  const r = opts.reserve ?? {};
  const inset = {
    left: MARGIN_INSET.left + (r.left ?? 0),
    right: MARGIN_INSET.right + (r.right ?? 0),
    top: MARGIN_INSET.top + (r.top ?? 0),
    bottom: MARGIN_INSET.bottom + (r.bottom ?? 0),
  };
  const yMode = opts.y ?? "ticks";
  for (let pass = 0; pass < 4; pass++) {
    const texts = axes(frame, mapper(frame, box, inset), yMode).filter(
      (i): i is Extract<SceneItem, { t: "text" }> => i.t === "text"
    );
    const over = { left: 0, right: 0, top: 0, bottom: 0 };
    for (const t of texts) {
      const [left, right, top, bottom] = textBounds(t);
      over.left = Math.max(over.left, (r.left ?? 0) - left);
      over.right = Math.max(over.right, right - (box.width - (r.right ?? 0)));
      over.top = Math.max(over.top, (r.top ?? 0) - top);
      over.bottom = Math.max(over.bottom, bottom - (box.height - (r.bottom ?? 0)));
    }
    let grew = false;
    for (const side of ["left", "right", "top", "bottom"] as const) {
      if (over[side] > 0.01) {
        inset[side] += over[side];
        grew = true;
      }
    }
    if (!grew) break;
  }
  return inset;
}

/**
 * Grid, axes, tick labels and axis names for `frame` in `box`, and the
 * world-to-pixel map of the plot they frame. Charts and planes share it.
 * With categories the x range becomes [0, n], one band per category.
 */
export function planeAxes(
  frame: PlaneFrame,
  box: Box,
  opts: AxesOptions = {}
): { items: SceneItem[]; map: Mapper; frame: PlaneFrame } {
  const f: PlaneFrame = frame.categories ? { ...frame, x: [0, frame.categories.length] } : frame;
  const yMode = opts.y ?? "ticks";
  const map = mapper(f, box, labelInset(f, box, opts));
  return { items: [...grid(f, map, yMode), ...axes(f, map, yMode)], map, frame: f };
}

/** The frame a plane spec without one is drawn in. */
export const DEFAULT_PLANE_FRAME: PlaneFrame = { x: [-10, 10], y: [-10, 10] };

/** The Scene of a `plane` FigureSpec drawn in `box`. */
export function buildPlane(spec: FigureSpec, box: Box): Scene {
  const issues: SceneIssue[] = [];
  const frame: PlaneFrame = spec.frame ?? DEFAULT_PLANE_FRAME;
  if (!spec.frame) issues.push({ code: "clipped", detail: "no frame given; using -10 to 10" });
  const { items, map: m } = planeAxes(frame, box);
  const points = new Map<string, Pt>();
  for (const p of spec.parts) if (p.kind === "point") points.set(p.id, [p.x, p.y]);

  const dashed = new Set(spec.marks.filter((k) => k.kind === "hidden_dashed").flatMap((k) => k.on));
  const helpers = helperPoints(spec);
  const fills: SceneItem[] = [];
  const dots: SceneItem[] = [];
  const lines: SceneItem[] = [];
  for (const part of spec.parts) {
    switch (part.kind) {
      case "function":
        lines.push(...functionItems(part, frame, m, issues));
        break;
      case "segment":
      case "ray":
      case "line": {
        const item = straight(part, points, frame, m, issues);
        if (item) lines.push(item);
        break;
      }
      case "circle":
      case "arc":
      case "polygon":
        lines.push(...shapeItems(part, points, frame, m, issues));
        break;
      case "region":
        fills.push(...regionItems(part, spec, frame, m, issues));
        break;
      case "point":
        if (clipParam([part.x, part.y], [0, 0], frame, 0, 0)) {
          if (!helpers.has(part.id)) dots.push(dot([part.x, part.y], m, part.id));
        } else {
          issues.push({ code: "clipped", partId: part.id, detail: "lies outside the frame" });
        }
        break;
      default:
        issues.push({
          code: "clipped",
          partId: part.id,
          detail: `a ${part.kind} is not drawn on a coordinate plane yet`,
        });
    }
  }
  for (const item of lines) {
    if (item.t === "path" && item.partId && dashed.has(item.partId)) item.weight = "dashed";
  }
  // Fills go under the axes and every line, right after the grid.
  const firstInk = items.findIndex((i) => !(i.t === "path" && i.role === "grid"));
  items.splice(firstInk < 0 ? items.length : firstInk, 0, ...fills);
  items.push(...lines);
  items.push(...dots); // points draw on top of the lines through them
  const labels = planeLabels(spec, items, box, ([x, y]) => [m.px(x), m.py(y)]);
  items.push(...labels.items);
  issues.push(...labels.issues);
  return {
    width: box.width,
    height: box.height,
    items,
    issues,
    description: describePlane(spec, frame),
  };
}

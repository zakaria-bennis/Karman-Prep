/**
 * Coordinate-plane builder: grid, axes, tick labels, function graphs, points,
 * segments, rays and lines, as a role-colored Scene. Function graphs come from
 * the calculator through calc-adapter. Rays and lines are clipped to the frame
 * (Liang–Barsky) and end in arrowheads where they leave it; segments never do.
 * Axis and tick labels sit at fixed positions; general label placement is a
 * separate step.
 */
import { axisTicks, curveFor } from "./calc-adapter";
import { HOUSE } from "./house";
import type { Scene, SceneIssue, SceneItem } from "./scene";
import type { FigureSpec, Part, PlaneFrame } from "./spec";

type Box = { width: number; height: number };
type Pt = [number, number];
/** Distance in px from each box edge to the plot area. */
type Inset = { left: number; right: number; top: number; bottom: number };
type Mapper = ReturnType<typeof mapper>;

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

const fmt = (n: number) => String(Math.round(n * 100) / 100);

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

/** Splits a flat world polyline into runs that stay inside the frame. */
function clipPolyline(run: number[], frame: PlaneFrame): Pt[][] {
  const out: Pt[][] = [];
  let cur: Pt[] = [];
  const close = () => {
    if (cur.length > 1) out.push(cur);
    cur = [];
  };
  for (let i = 0; i + 3 < run.length; i += 2) {
    const a: Pt = [run[i], run[i + 1]];
    const d: Pt = [run[i + 2] - a[0], run[i + 3] - a[1]];
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

function grid(frame: PlaneFrame, m: Mapper): SceneItem[] {
  const { w, h, px, py } = m;
  const step = frame.step;
  const xs = step ? multiples(frame.x, step) : axisTicks(frame.x[0], frame.x[1], w).major;
  const ys = step ? multiples(frame.y, step) : axisTicks(frame.y[0], frame.y[1], h).major;
  const items: SceneItem[] = [];
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

/** Multiples of `step` within [min, max], computed from integer indices. */
function multiples([min, max]: [number, number], step: number): number[] {
  const out: number[] = [];
  const lo = Math.ceil(min / step - EPS);
  const hi = Math.floor(max / step + EPS);
  for (let n = lo; n <= hi; n++) out.push(n === 0 ? 0 : n * step);
  return out;
}

/** Bluebook density: labels need at least this much center spacing along an axis. */
export const MIN_LABEL_SPACING_PX = 28;

/**
 * The step between tick labels on an axis `lengthPx` long: every grid step
 * (`step`, else the step axisTicks picks), or every 2nd step when labels on
 * every step would sit closer than MIN_LABEL_SPACING_PX. 0 means no labels.
 */
function labelStep(range: [number, number], lengthPx: number, step?: number): number {
  const base = step ?? axisTicks(range[0], range[1], lengthPx).step;
  if (!base) return 0;
  const pxPerStep = (lengthPx * base) / (range[1] - range[0]);
  return pxPerStep >= MIN_LABEL_SPACING_PX ? base : 2 * base;
}

const clamp = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, v));

function axes(frame: PlaneFrame, m: Mapper): SceneItem[] {
  const { w, h, px, py } = m;
  const ax = clamp(0, frame.y); // the x-axis sits at y = 0, or the nearer frame edge
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
    {
      t: "path",
      d: `M${fmt(px(ay))} ${fmt(py(frame.y[0]))} L${fmt(px(ay))} ${fmt(py(frame.y[1]))}`,
      role: "ink",
      weight: "line",
      partId: "axis",
    },
  ];
  const tick = HOUSE.tickLength / 2;
  const xStep = labelStep(frame.x, w, frame.step);
  const yStep = labelStep(frame.y, h, frame.step);
  for (const x of xStep ? multiples(frame.x, xStep) : []) {
    if (Math.abs(x) < EPS) continue; // the origin is labeled once, below
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
  }
  for (const y of yStep ? multiples(frame.y, yStep) : []) {
    if (Math.abs(y) < EPS) continue;
    const X = px(ay);
    const Y = py(y);
    items.push({
      t: "path",
      d: `M${fmt(X - tick)} ${fmt(Y)} L${fmt(X + tick)} ${fmt(Y)}`,
      role: "ink",
      weight: "line",
    });
    items.push({
      t: "text",
      x: X - tick - off / 2,
      y: Y + font / 3,
      text: fmt(y),
      role: "ink-muted",
      anchor: "end",
    });
  }
  // One "0" at the origin, below and left of it, when both axes pass through it.
  if (ax === 0 && ay === 0 && (xStep || yStep)) {
    items.push({
      t: "text",
      x: px(0) - tick - off / 2,
      y: py(0) + tick + font,
      text: "0",
      role: "ink-muted",
      anchor: "end",
    });
  }
  // Axis names at the positive ends.
  items.push({
    t: "text",
    x: px(frame.x[1]) - off,
    y: py(ax) - off,
    text: frame.xLabel ?? "x",
    role: "ink",
    anchor: "end",
  });
  items.push({
    t: "text",
    x: px(ay) + off,
    y: py(frame.y[1]) + font,
    text: frame.yLabel ?? "y",
    role: "ink",
    anchor: "start",
  });
  return items;
}

function pathOf(pts: Pt[], m: Mapper): string {
  return pts.map(([x, y], i) => `${i ? "L" : "M"}${fmt(m.px(x))} ${fmt(m.py(y))}`).join(" ");
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

function dot([x, y]: Pt, m: Mapper, partId: string): SceneItem {
  const X = m.px(x);
  const Y = m.py(y);
  const r = HOUSE.pointRadius;
  return {
    t: "path",
    d: `M${fmt(X - r)} ${fmt(Y)} A${r} ${r} 0 1 0 ${fmt(X + r)} ${fmt(Y)} A${r} ${r} 0 1 0 ${fmt(X - r)} ${fmt(Y)} Z`,
    role: "ink",
    weight: "line",
    fill: "ink",
    partId,
  };
}

function functionItems(
  part: Extract<Part, { kind: "function" }>,
  frame: PlaneFrame,
  m: Mapper,
  issues: SceneIssue[]
): SceneItem[] {
  let sub = frame;
  let width = m.w;
  if (part.domain) {
    const lo = Math.max(frame.x[0], Math.min(...part.domain));
    const hi = Math.min(frame.x[1], Math.max(...part.domain));
    if (hi <= lo) {
      issues.push({ code: "clipped", partId: part.id, detail: "its domain is outside the frame" });
      return [];
    }
    sub = { ...frame, x: [lo, hi] };
    width = Math.max(1, (m.w * (hi - lo)) / (frame.x[1] - frame.x[0]));
  }
  const runs = curveFor(part.latex, sub, { width, height: m.h });
  const clipped = runs.flatMap((run) => clipPolyline(run, sub));
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
 * The plot inset that keeps every axis label inside the box: the house margin,
 * grown on any side where labels would hang past the edge (an axis on a frame
 * edge, as in a first-quadrant plane). Labels keep their place outside the
 * axes; the plot shrinks to make room. A few passes settle the mapping.
 */
function labelInset(frame: PlaneFrame, box: Box): Inset {
  const inset = { ...MARGIN_INSET };
  for (let pass = 0; pass < 4; pass++) {
    const texts = axes(frame, mapper(frame, box, inset)).filter(
      (i): i is Extract<SceneItem, { t: "text" }> => i.t === "text"
    );
    const over = { left: 0, right: 0, top: 0, bottom: 0 };
    for (const t of texts) {
      const [l, r, top, bottom] = textBounds(t);
      over.left = Math.max(over.left, -l);
      over.right = Math.max(over.right, r - box.width);
      over.top = Math.max(over.top, -top);
      over.bottom = Math.max(over.bottom, bottom - box.height);
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

/** The Scene of a `plane` FigureSpec drawn in `box`. */
export function buildPlane(spec: FigureSpec, box: Box): Scene {
  const issues: SceneIssue[] = [];
  const frame: PlaneFrame = spec.frame ?? { x: [-10, 10], y: [-10, 10] };
  if (!spec.frame) issues.push({ code: "clipped", detail: "no frame given; using -10 to 10" });
  const m = mapper(frame, box, labelInset(frame, box));
  const points = new Map<string, Pt>();
  for (const p of spec.parts) if (p.kind === "point") points.set(p.id, [p.x, p.y]);

  const items: SceneItem[] = [...grid(frame, m), ...axes(frame, m)];
  const dots: SceneItem[] = [];
  for (const part of spec.parts) {
    switch (part.kind) {
      case "function":
        items.push(...functionItems(part, frame, m, issues));
        break;
      case "segment":
      case "ray":
      case "line": {
        const item = straight(part, points, frame, m, issues);
        if (item) items.push(item);
        break;
      }
      case "point":
        if (clipParam([part.x, part.y], [0, 0], frame, 0, 0)) {
          dots.push(dot([part.x, part.y], m, part.id));
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
  items.push(...dots); // points draw on top of the lines through them
  return {
    width: box.width,
    height: box.height,
    items,
    issues,
    description: describePlane(spec, frame),
  };
}

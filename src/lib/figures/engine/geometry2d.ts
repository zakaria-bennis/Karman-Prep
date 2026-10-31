/**
 * 2D geometry builder: traced points, cleaned up and drawn the Bluebook way.
 *
 * - Coordinates are traced from the original image, in any unit, y-down
 *   (image space, the same as SVG), so nothing is flipped.
 * - snap() projects near-collinear points onto their line and near-concyclic
 *   points onto their circle (HOUSE.snapTolerance of the figure's larger
 *   side), and turns near-90° angles marked right_angle into exact ones.
 * - The figure is scaled to the box less the margin (and room for labels
 *   and the "not to scale" note), then centered.
 * - Rays and lines are clipped to the box with plane.ts's clipParam and end
 *   in arrowheads; segments never do.
 * - Every label goes through placeLabels, with a preferred side computed
 *   here: the outside-angle bisector at a vertex, the outward normal at a
 *   side's midpoint, the inside bisector for an angle.
 */
import { HOUSE } from "./house";
import { placeLabels, textWidth, type PendingLabel } from "./labels";
import {
  add,
  cornersOf,
  cross,
  dot,
  drawMark,
  len,
  mul,
  sub,
  unit,
  type GeoScene,
  type Pt,
} from "./marks";
import { clipParam, fmt } from "./plane";
import type { ScaleOptions, Scene, SceneIssue, SceneItem } from "./scene";
import type { FigureSpec, Label, Part } from "./spec";

type Box = { width: number; height: number };
type TwoPoint = Extract<Part, { kind: "segment" | "ray" | "line" }>;

export const NOT_TO_SCALE = "Note: Figure not drawn to scale.";

/**
 * The note as one line, or as two broken at the space nearest the middle
 * when one line would not fit the box less the margin. Joined with one
 * space, the lines are always exactly NOT_TO_SCALE.
 */
export function noteLines(width: number): string[] {
  if (textWidth(NOT_TO_SCALE) <= width - 2 * HOUSE.margin) return [NOT_TO_SCALE];
  const mid = NOT_TO_SCALE.length / 2;
  let cut = -1;
  for (let i = 0; i < NOT_TO_SCALE.length; i++) {
    if (NOT_TO_SCALE[i] === " " && (cut < 0 || Math.abs(i - mid) < Math.abs(cut - mid))) cut = i;
  }
  return [NOT_TO_SCALE.slice(0, cut), NOT_TO_SCALE.slice(cut + 1)];
}

/** A traced angle this close to 90° is snapped when it is marked right_angle. */
const RIGHT_ANGLE_WINDOW_DEG = 10;
/** Clear space kept between an angle label and the angle's rays. */
const ANGLE_LABEL_GAP = 2;
/** Sides of the polygon that stands in for a circle in label collisions. */
const CIRCLE_STEPS = 48;
/** How far a ray or line runs past its points, as a fraction of the figure's larger side. */
const LINE_EXTENSION = 0.15;
const EPS = 1e-9;

const at = ([x, y]: Pt) => `${fmt(x)} ${fmt(y)}`;
const isTwoPoint = (p: Part): p is TwoPoint =>
  p.kind === "segment" || p.kind === "ray" || p.kind === "line";
const degrees = (u: Pt, v: Pt) =>
  (Math.acos(Math.max(-1, Math.min(1, dot(unit(u), unit(v))))) * 180) / Math.PI;

function pointsOf(spec: FigureSpec): Map<string, Pt> {
  const m = new Map<string, Pt>();
  for (const p of spec.parts) if (p.kind === "point") m.set(p.id, [p.x, p.y]);
  return m;
}

/** Center and radius of a circle or arc in the coordinates of `points`. */
function circleOf(
  p: Extract<Part, { kind: "circle" | "arc" }>,
  points: Map<string, Pt>,
  scale = 1
): { c: Pt; r: number; through?: string } | null {
  const c = points.get(p.center);
  if (!c) return null;
  const through = p.kind === "arc" ? p.from : p.through;
  if (through === undefined) {
    return p.kind === "circle" && p.radius ? { c, r: p.radius * scale } : null;
  }
  const t = points.get(through);
  return t ? { c, r: len(sub(t, c)), through } : null;
}

/** Every point, plus each circle's extremes and each arc's samples. */
function extentPoints(spec: FigureSpec, points: Map<string, Pt>): Pt[] {
  const out = [...points.values()];
  for (const p of spec.parts) {
    if (p.kind === "circle") {
      const k = circleOf(p, points);
      if (k) out.push(...[0, 1, 2, 3].map((q) => arcPoint(k.c, k.r, (q * Math.PI) / 2)));
    } else if (p.kind === "arc") {
      const pts = arcSamples(p, points);
      if (pts) out.push(...pts);
    }
  }
  return out;
}

/**
 * The extent the layout fits: extentPoints, plus room for each ray to run on
 * past its direction point and each line past both of its points, so the
 * arrowheads never sit on a labeled point.
 */
function layoutPoints(spec: FigureSpec, points: Map<string, Pt>): Pt[] {
  const base = extentPoints(spec, points);
  const b = bounds(base);
  const ext = LINE_EXTENSION * Math.max(b.x1 - b.x0, b.y1 - b.y0);
  for (const p of spec.parts) {
    if (p.kind !== "ray" && p.kind !== "line") continue;
    const a = points.get(p.from)!;
    const e = points.get(p.to)!;
    const d = unit(sub(e, a));
    base.push(add(e, mul(d, ext)));
    if (p.kind === "line") base.push(add(a, mul(d, -ext)));
  }
  return base;
}

function bounds(pts: Pt[]) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

const arcPoint = (c: Pt, r: number, a: number): Pt => [
  c[0] + r * Math.cos(a),
  c[1] + r * Math.sin(a),
];

/** Points along an arc part's minor arc, from `from` to `to`. */
function arcSamples(p: Extract<Part, { kind: "arc" }>, points: Map<string, Pt>, steps = 24) {
  const k = circleOf(p, points);
  const b = points.get(p.to);
  const a = points.get(p.from);
  if (!k || !a || !b || k.r < EPS) return null;
  const a0 = Math.atan2(a[1] - k.c[1], a[0] - k.c[0]);
  const u = sub(a, k.c);
  const v = sub(b, k.c);
  const span = Math.atan2(cross(u, v), dot(u, v));
  return Array.from({ length: steps + 1 }, (_, i) => arcPoint(k.c, k.r, a0 + (span * i) / steps));
}

/**
 * Clean up traced coordinates: exact right angles where marked (within 10°),
 * then points within tolerance of a segment, ray, line or polygon side
 * projected onto it, then points within tolerance of a circle or arc
 * projected onto it. A point moves at most once. Returns a new spec.
 */
export function snap(spec: FigureSpec): FigureSpec {
  const points = pointsOf(spec);
  if (points.size === 0) return spec;
  const parts = new Map(spec.parts.map((p) => [p.id, p]));
  const b = bounds(extentPoints(spec, points));
  const tol = HOUSE.snapTolerance * Math.max(b.x1 - b.x0, b.y1 - b.y0);
  const locked = new Set<string>();

  for (const mark of spec.marks) {
    if (mark.kind !== "right_angle") continue;
    for (const c of cornersOf(mark, parts)) {
      const v = points.get(c.vertex);
      const a = points.get(c.from);
      const t = points.get(c.to);
      if (!v || !a || !t) continue;
      const deg = degrees(sub(a, v), sub(t, v));
      if (!(Math.abs(deg - 90) <= RIGHT_ANGLE_WINDOW_DEG)) continue;
      const [move, keep] = !locked.has(c.to)
        ? [c.to, c.from]
        : !locked.has(c.from)
          ? [c.from, c.to]
          : [null, null];
      if (move && keep) {
        const m = points.get(move)!;
        const k = unit(sub(points.get(keep)!, v));
        const side = Math.sign(cross(k, sub(m, v))) || 1;
        points.set(move, add(v, mul([-side * k[1], side * k[0]], len(sub(m, v)))));
      }
      [c.vertex, c.from, c.to].forEach((id) => locked.add(id));
    }
  }

  const lines: { a: string; b: string; lo: number; hi: number }[] = [];
  for (const p of spec.parts) {
    if (isTwoPoint(p)) {
      const lo = p.kind === "line" ? -Infinity : 0;
      const hi = p.kind === "segment" ? 1 : Infinity;
      lines.push({ a: p.from, b: p.to, lo, hi });
    } else if (p.kind === "polygon") {
      p.points.forEach((id, i) => {
        lines.push({ a: id, b: p.points[(i + 1) % p.points.length], lo: 0, hi: 1 });
      });
    }
  }
  for (const [id, pt] of points) {
    if (locked.has(id)) continue;
    for (const l of lines) {
      if (l.a === id || l.b === id) continue;
      const a = points.get(l.a);
      const e = points.get(l.b);
      if (!a || !e) continue;
      const d = sub(e, a);
      const dd = dot(d, d);
      if (dd < EPS) continue;
      const t = dot(sub(pt, a), d) / dd;
      if (t < l.lo || t > l.hi) continue;
      const foot = add(a, mul(d, t));
      const off = len(sub(pt, foot));
      if (off > 0 && off <= tol) {
        points.set(id, foot);
        locked.add(id);
        break;
      }
    }
  }

  for (const p of spec.parts) {
    if (p.kind !== "circle" && p.kind !== "arc") continue;
    const k = circleOf(p, points);
    if (!k || k.r < EPS) continue;
    for (const [id, pt] of points) {
      if (locked.has(id) || id === p.center || id === k.through) continue;
      const r = len(sub(pt, k.c));
      const off = Math.abs(r - k.r);
      if (r > EPS && off > 0 && off <= tol) {
        points.set(id, add(k.c, mul(sub(pt, k.c), k.r / r)));
        locked.add(id);
      }
    }
  }

  return {
    ...spec,
    parts: spec.parts.map((p) => {
      if (p.kind !== "point") return p;
      const [x, y] = points.get(p.id)!;
      return x === p.x && y === p.y ? p : { ...p, x, y };
    }),
  };
}

function circlePath([x, y]: Pt, r: number): string {
  return `M${fmt(x - r)} ${fmt(y)} A${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(x + r)} ${fmt(y)} A${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(x - r)} ${fmt(y)} Z`;
}

const polyline = (pts: Pt[], close = false) =>
  pts.map((p, i) => `${i ? "L" : "M"}${at(p)}`).join(" ") + (close ? " Z" : "");

function pointDot(p: Pt, partId: string): SceneItem {
  return {
    t: "path",
    d: circlePath(p, HOUSE.pointRadius),
    role: "ink",
    weight: "line",
    fill: "ink",
    partId,
  };
}

const centroid = (pts: Pt[]): Pt => mul(pts.reduce(add, [0, 0] as Pt), 1 / (pts.length || 1));

/** Name a point the way the exam does: its label text, else its id. */
function namer(spec: FigureSpec) {
  const names = new Map<string, string>();
  for (const l of spec.labels) {
    const p = spec.parts.find((q) => q.id === l.on);
    if (p?.kind === "point" && !names.has(p.id)) names.set(p.id, l.text);
  }
  return (id: string) => names.get(id) ?? id;
}

const POLYGON_NAMES: Record<number, string> = {
  3: "Triangle",
  4: "Quadrilateral",
  5: "Pentagon",
  6: "Hexagon",
};

/** "Triangle ABC, right angle at C, AB = 13." from the named parts. */
function describe(spec: FigureSpec): string {
  const name = namer(spec);
  const parts = new Map(spec.parts.map((p) => [p.id, p]));
  const out: string[] = [];
  for (const p of spec.parts) {
    if (p.kind === "polygon") {
      out.push(`${POLYGON_NAMES[p.points.length] ?? "Polygon"} ${p.points.map(name).join("")}`);
    } else if (p.kind === "circle") {
      out.push(`circle with center ${name(p.center)}`);
    }
  }
  for (const m of spec.marks) {
    if (m.kind !== "right_angle") continue;
    for (const c of cornersOf(m, parts)) out.push(`right angle at ${name(c.vertex)}`);
  }
  for (const l of spec.labels) {
    const p = parts.get(l.on);
    if (p && isTwoPoint(p)) out.push(`${name(p.from)}${name(p.to)} = ${l.text}`);
    if (p?.kind === "angle")
      out.push(`angle ${name(p.from)}${name(p.vertex)}${name(p.to)} = ${l.text}`);
  }
  if (spec.notToScale) out.push("not drawn to scale");
  if (!out.length) return "A geometry figure.";
  const s = out.join(", ");
  return `${s[0].toUpperCase()}${s.slice(1)}.`;
}

/** Signed area of a polygon (positive when clockwise on screen). */
function signedArea(pts: Pt[]): number {
  let a = 0;
  pts.forEach((p, i) => (a += cross(p, pts[(i + 1) % pts.length])));
  return a / 2;
}

type LabelContext = {
  spec: FigureSpec;
  parts: Map<string, Part>;
  points: Map<string, Pt>;
  /** Unit directions of every drawn line leaving each point. */
  dirs: Map<string, Pt[]>;
  /** The drawn ends of each line and ray, clipped to the figure (from-side, to-side). */
  drawnEnds: Map<string, [Pt, Pt]>;
  center: Pt;
};

function outward(from: Pt, center: Pt): Pt {
  const d = unit(sub(from, center));
  return len(d) ? d : [0, -1];
}

/** The polygon that has a-b as a side, if any. */
function polygonWithSide(spec: FigureSpec, a: string, b: string) {
  return spec.parts.find(
    (p): p is Extract<Part, { kind: "polygon" }> =>
      p.kind === "polygon" &&
      p.points.some((id, i) => {
        const next = p.points[(i + 1) % p.points.length];
        return (id === a && next === b) || (id === b && next === a);
      })
  );
}

function pointLabel(id: string, ctx: LabelContext): { anchor: Pt; preferred: Pt } | null {
  const P = ctx.points.get(id);
  if (!P) return null;
  const poly = ctx.spec.parts.find(
    (p): p is Extract<Part, { kind: "polygon" }> => p.kind === "polygon" && p.points.includes(id)
  );
  if (poly) {
    const pts = poly.points.map((q) => ctx.points.get(q)!);
    const i = poly.points.indexOf(id);
    const prev = pts[(i - 1 + pts.length) % pts.length];
    const next = pts[(i + 1) % pts.length];
    const bis = add(unit(sub(prev, P)), unit(sub(next, P)));
    // Outside the polygon: away from the bisector at a convex vertex, along it at a reflex one.
    const convex = Math.sign(cross(sub(P, prev), sub(next, P))) === Math.sign(signedArea(pts));
    if (len(bis) > 0.05) return { anchor: P, preferred: mul(bis, convex ? -1 : 1) };
  }
  const sum = (ctx.dirs.get(id) ?? []).reduce(add, [0, 0] as Pt);
  if (len(sum) > 0.2) return { anchor: P, preferred: mul(sum, -1) };
  return { anchor: P, preferred: outward(P, ctx.center) };
}

function sideLabel(part: TwoPoint, label: Label, ctx: LabelContext) {
  const a = ctx.points.get(part.from);
  const b = ctx.points.get(part.to);
  if (!a || !b || len(sub(b, a)) < EPS) return null;
  const t = label.at === "start" ? 0.25 : label.at === "end" ? 0.75 : 0.5;
  // A line or ray is named at its drawn end (beside the arrowhead), as on a plane.
  const ends = part.kind === "segment" ? undefined : ctx.drawnEnds.get(part.id);
  const anchor =
    ends && label.at === "end"
      ? ends[1]
      : ends && label.at === "start"
        ? ends[0]
        : add(a, mul(sub(b, a), t));
  const poly = polygonWithSide(ctx.spec, part.from, part.to);
  const c = poly ? centroid(poly.points.map((q) => ctx.points.get(q)!)) : ctx.center;
  const u = unit(sub(b, a));
  let n: Pt = [-u[1], u[0]];
  const side = dot(n, sub(anchor, c));
  if (side < 0 || (Math.abs(side) < EPS && n[1] > 0)) n = mul(n, -1);
  return { anchor, preferred: n };
}

/** Inside the angle on its bisector, far enough out that the label clears both rays. */
function angleLabel(part: Extract<Part, { kind: "angle" }>, label: Label, ctx: LabelContext) {
  const v = ctx.points.get(part.vertex);
  const a = ctx.points.get(part.from);
  const b = ctx.points.get(part.to);
  if (!v || !a || !b) return null;
  const u1 = unit(sub(a, v));
  const u2 = unit(sub(b, v));
  let bis = unit(add(u1, u2));
  if (!len(bis)) bis = [-u1[1], u1[0]];
  const half = Math.acos(Math.max(-1, Math.min(1, dot(u1, u2)))) / 2;
  const hw = textWidth(label.text) / 2;
  const hh = (1.25 * HOUSE.font) / 2;
  let need = 0;
  for (const w of [u1, u2]) {
    const e = hw * Math.abs(w[1]) + hh * Math.abs(w[0]);
    need = Math.max(need, (e + ANGLE_LABEL_GAP) / Math.max(Math.sin(half), 0.05));
  }
  const inside = Math.min(
    Math.abs(bis[0]) < EPS ? Infinity : hw / Math.abs(bis[0]),
    Math.abs(bis[1]) < EPS ? Infinity : hh / Math.abs(bis[1])
  );
  const r0 = Math.max(0, need - HOUSE.labelOffset - inside);
  return { anchor: add(v, mul(bis, r0)), preferred: bis };
}

function pendingLabels(ctx: LabelContext, issues: SceneIssue[]): PendingLabel[] {
  const out: PendingLabel[] = [];
  for (const label of ctx.spec.labels) {
    const part = ctx.parts.get(label.on);
    let spot: { anchor: Pt; preferred: Pt } | null = null;
    if (part?.kind === "point") spot = pointLabel(part.id, ctx);
    else if (part && isTwoPoint(part)) spot = sideLabel(part, label, ctx);
    else if (part?.kind === "angle") spot = angleLabel(part, label, ctx);
    else if (part?.kind === "circle") {
      const k = circleOf(part, ctx.points);
      if (k && label.at === "inside") spot = { anchor: k.c, preferred: [0, -1] };
      else if (k) {
        const d: Pt = [Math.SQRT1_2, -Math.SQRT1_2];
        spot = { anchor: add(k.c, mul(d, k.r)), preferred: d };
      }
    } else if (part?.kind === "arc") {
      const pts = arcSamples(part, ctx.points);
      const c = ctx.points.get(part.center);
      if (pts && c) {
        const mid = pts[Math.floor(pts.length / 2)];
        spot = { anchor: mid, preferred: outward(mid, c) };
      }
    } else if (part?.kind === "polygon") {
      spot = { anchor: centroid(part.points.map((q) => ctx.points.get(q)!)), preferred: [0, -1] };
    }
    if (!spot) {
      issues.push({
        code: "missing_label",
        partId: label.on,
        detail: `label "${label.text}" has no place on this part`,
      });
      continue;
    }
    out.push({
      text: label.text,
      anchor: { x: spot.anchor[0], y: spot.anchor[1] },
      preferred: { dx: spot.preferred[0], dy: spot.preferred[1] },
      partId: label.on,
    });
  }
  return out;
}

/** The Scene of a `geometry2d` FigureSpec drawn in `box`. */
export function buildGeometry2d(input: FigureSpec, box: Box, opts: ScaleOptions = {}): Scene {
  const issues: SceneIssue[] = [];
  const spec = snap(input);
  const world = pointsOf(spec);
  const parts = new Map(spec.parts.map((p) => [p.id, p]));
  const description = describe(spec);
  if (world.size === 0) {
    issues.push({ code: "clipped", detail: "a geometry figure needs at least one point" });
    return { width: box.width, height: box.height, items: [], issues, description };
  }

  // Layout: the box less the margin, room for labels outside the shape, and the note band.
  const font = HOUSE.font;
  const note = spec.notToScale ? noteLines(box.width) : [];
  const noteBand = note.length ? note.length * 1.25 * font + HOUSE.labelOffset : 0;
  const widest = Math.max(0, ...spec.labels.map((l) => textWidth(l.text)));
  const roomX = spec.labels.length ? HOUSE.labelOffset + widest : 0;
  const roomY = spec.labels.length ? HOUSE.labelOffset + 1.25 * font : 0;
  const availW = Math.max(1, box.width - 2 * (HOUSE.margin + roomX));
  const availH = Math.max(1, box.height - noteBand - 2 * (HOUSE.margin + roomY));
  const b = bounds(layoutPoints(spec, world));
  const bw = b.x1 - b.x0;
  const bh = b.y1 - b.y0;
  const fitScale =
    bw < EPS && bh < EPS
      ? 1
      : bw < EPS
        ? availH / bh
        : bh < EPS
          ? availW / bw
          : Math.min(availW / bw, availH / bh);
  // A shared scale (figure choices) maps world units to px the same for every figure in a set.
  const scale = opts.scale ?? fitScale;
  const ox = box.width / 2 - scale * ((b.x0 + b.x1) / 2);
  const oy = (box.height - noteBand) / 2 - scale * ((b.y0 + b.y1) / 2);
  const points = new Map<string, Pt>();
  for (const [id, [x, y]] of world) points.set(id, [ox + scale * x, oy + scale * y]);
  const frame = {
    x: [HOUSE.margin, box.width - HOUSE.margin] as [number, number],
    y: [HOUSE.margin, box.height - noteBand - HOUSE.margin] as [number, number],
  };

  const dashed = new Set(spec.marks.filter((m) => m.kind === "hidden_dashed").flatMap((m) => m.on));
  const weight = (id: string) => (dashed.has(id) ? "dashed" : "line");
  const items: SceneItem[] = [];
  /** Polygon stand-ins for curved paths, since label collisions read arcs as chords. */
  const proxies = new Map<SceneItem, SceneItem>();
  const corners = new Set<string>();
  const drawnEnds = new Map<string, [Pt, Pt]>();
  const dirs = new Map<string, Pt[]>();
  const addDir = (id: string, d: Pt) => dirs.set(id, [...(dirs.get(id) ?? []), unit(d)]);

  for (const part of spec.parts) {
    if (part.kind === "polygon") {
      const pts = part.points.map((q) => points.get(q)!);
      part.points.forEach((q) => corners.add(q));
      items.push({
        t: "path",
        d: polyline(pts, true),
        role: "ink",
        weight: weight(part.id),
        partId: part.id,
      });
    } else if (isTwoPoint(part)) {
      const a = points.get(part.from)!;
      const e = points.get(part.to)!;
      const length = len(sub(e, a));
      if (length < EPS) {
        issues.push({ code: "off_line", partId: part.id, detail: "its two points coincide" });
        continue;
      }
      corners.add(part.from);
      corners.add(part.to);
      const d = unit(sub(e, a));
      addDir(part.from, d);
      addDir(part.to, mul(d, -1));
      if (part.kind !== "segment") addDir(part.to, d);
      if (part.kind === "line") addDir(part.from, mul(d, -1));
      const range =
        part.kind === "segment"
          ? [0, length]
          : part.kind === "ray"
            ? [0, Infinity]
            : [-Infinity, Infinity];
      const c = part.kind === "segment" ? [0, length] : clipParam(a, d, frame, range[0], range[1]);
      if (!c) {
        issues.push({ code: "clipped", partId: part.id, detail: "lies outside the figure" });
        continue;
      }
      drawnEnds.set(part.id, [add(a, mul(d, c[0])), add(a, mul(d, c[1]))]);
      const item: SceneItem = {
        t: "path",
        d: polyline([add(a, mul(d, c[0])), add(a, mul(d, c[1]))]),
        role: "ink",
        weight: weight(part.id),
        partId: part.id,
      };
      if (part.kind === "ray") item.arrows = "end";
      if (part.kind === "line") item.arrows = "both";
      items.push(item);
    } else if (part.kind === "circle") {
      const k = circleOf(part, points, scale);
      if (!k || k.r < EPS) {
        issues.push({ code: "off_line", partId: part.id, detail: "the circle has no radius" });
        continue;
      }
      const item: SceneItem = {
        t: "path",
        d: circlePath(k.c, k.r),
        role: "ink",
        weight: weight(part.id),
        partId: part.id,
      };
      const ring = Array.from({ length: CIRCLE_STEPS }, (_, i) =>
        arcPoint(k.c, k.r, (2 * Math.PI * i) / CIRCLE_STEPS)
      );
      proxies.set(item, { ...item, d: polyline(ring, true) });
      items.push(item);
    } else if (part.kind === "arc") {
      const pts = arcSamples(part, points);
      const k = circleOf(part, points);
      if (!pts || !k) {
        issues.push({ code: "off_line", partId: part.id, detail: "the arc has no radius" });
        continue;
      }
      const a = pts[0];
      const e = pts[pts.length - 1];
      const sweep = cross(sub(a, k.c), sub(e, k.c)) > 0 ? 1 : 0;
      const item: SceneItem = {
        t: "path",
        d: `M${at(a)} A${fmt(k.r)} ${fmt(k.r)} 0 0 ${sweep} ${at(e)}`,
        role: "ink",
        weight: weight(part.id),
        partId: part.id,
      };
      proxies.set(item, { ...item, d: polyline(pts) });
      items.push(item);
    } else if (part.kind !== "point" && part.kind !== "angle") {
      issues.push({
        code: "clipped",
        partId: part.id,
        detail: `a ${part.kind} is not drawn in 2D geometry`,
      });
    }
  }

  const geo: GeoScene = { points, parts };
  for (const mark of spec.marks) {
    if (mark.kind === "right_angle") {
      for (const c of cornersOf(mark, parts)) {
        const [v, a, e] = [c.vertex, c.from, c.to].map((q) => world.get(q)!);
        const deg = degrees(sub(a, v), sub(e, v));
        if (Math.abs(deg - 90) > 0.01) {
          issues.push({
            code: "off_line",
            partId: c.id,
            detail: `marked right angle measures ${fmt(deg)}°`,
          });
        }
      }
    }
    items.push(...drawMark(mark, geo));
  }

  // Dots for points that are not a corner of a drawn line, on top of the lines. An
  // unlabelled point declared on a line (where two lines cross) gets none, as in Bluebook.
  const named = new Set(spec.labels.filter((l) => l.text.trim()).map((l) => l.on));
  for (const part of spec.parts) {
    if (part.kind !== "point" || corners.has(part.id)) continue;
    if (part.on?.length && !named.has(part.id)) continue;
    items.push(pointDot(points.get(part.id)!, part.id));
  }

  // The note's last line sits just above the bottom edge; earlier lines stack above it.
  note.forEach((text, i) => {
    items.push({
      t: "text",
      x: box.width / 2,
      y: box.height - HOUSE.margin / 2 - (note.length - 1 - i) * 1.25 * font,
      text,
      role: "ink",
      anchor: "middle",
    });
  });

  const ctx: LabelContext = {
    spec,
    parts,
    points,
    dirs,
    drawnEnds,
    center: centroid([...points.values()]),
  };
  const pending = pendingLabels(ctx, issues);
  const collision = items.map((i) => proxies.get(i) ?? i);
  const placed = placeLabels(collision, pending, box);
  items.push(...placed.items.slice(collision.length));
  issues.push(...placed.issues);

  return { width: box.width, height: box.height, items, issues, description, scale };
}

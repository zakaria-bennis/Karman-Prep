/**
 * Coordinate-plane builder: grid, axes, tick labels, function graphs, points,
 * segments, rays, lines, circles, arcs, polygons and shaded regions
 * (plane-shapes.ts), as a role-colored Scene. Function graphs are the
 * part's `samples`, world polylines computed when the figure is authored
 * (scripts/figures/sample-functions.ts); the engine never loads the
 * calculator. Polylines, rays and lines are clipped to the frame
 * (Liang–Barsky) and end in arrowheads where they leave it; segments never do.
 * The grid, axes, tick labels and axis names come from plane-axes.ts; part labels are placed clear
 * of them and of every line (plane-labels.ts). Region fills sit under every
 * line; a part marked hidden_dashed draws dashed.
 */
import { planeDetail } from "./describe-detail";
import { HOUSE } from "./house";
import { dimensionItem, isShaded, shadeItem } from "./fills";
import { freeTexts, noteBand, noteItems, specNote } from "./notes";
import { planeLabels } from "./plane-labels";
import { helperPoints, pathOf, regionItems, shapeItems } from "./plane-shapes";
import { fmt, planeAxes, type Box, type Mapper } from "./plane-axes";
import type { Scene, SceneIssue, SceneItem } from "./scene";
import type { FigureSpec, Part, PlaneFrame } from "./spec";

type Pt = [number, number];

const EPS = 1e-9;
/** Coincidence tolerance, relative to the frame's larger span. */
const REL_EPS = 1e-12;

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

/**
 * A clipped segment, ray or line, with arrows where a ray or line leaves the frame
 * (none on a line marked `arrows: false`).
 */
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
  if (part.kind === "line" && part.arrows !== false) item.arrows = "both";
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

/** The frame a plane spec without one is drawn in. */
export const DEFAULT_PLANE_FRAME: PlaneFrame = { x: [-10, 10], y: [-10, 10] };

/**
 * The box a plane's axes are laid out in: `box` less the band its not-to-scale note
 * takes at the foot (the checks map points through the same box).
 */
export function planeAxesBox(spec: FigureSpec, box: Box): Box {
  return { width: box.width, height: box.height - noteBand(specNote(spec, box.width)) };
}

/** The Scene of a `plane` FigureSpec drawn in `box`. */
export function buildPlane(spec: FigureSpec, box: Box): Scene {
  const issues: SceneIssue[] = [];
  const frame: PlaneFrame = spec.frame ?? DEFAULT_PLANE_FRAME;
  if (!spec.frame) issues.push({ code: "clipped", detail: "no frame given; using -10 to 10" });
  const plot = planeAxesBox(spec, box);
  const { items, map: m, issues: frameIssues, thinned } = planeAxes(frame, plot);
  const toPx = ([x, y]: Pt): Pt => [m.px(x), m.py(y)];
  const inFrame = (p: Pt) => clipParam(p, [0, 0], frame, 0, 0) !== null;
  issues.push(...frameIssues);
  const points = new Map<string, Pt>();
  for (const p of spec.parts) if (p.kind === "point") points.set(p.id, [p.x, p.y]);

  const dashed = new Set(spec.marks.filter((k) => k.kind === "hidden_dashed").flatMap((k) => k.on));
  const helpers = helperPoints(spec);
  const fills: SceneItem[] = [];
  const dots: SceneItem[] = [];
  const lines: SceneItem[] = [];
  for (const part of spec.parts) {
    if (isShaded(part)) {
      const fill = shadeItem(part, points, toPx, issues, inFrame);
      if (fill) fills.push(fill);
    }
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
      case "sector":
      case "text":
        break; // a sector is its fill; a text part's label is set at its spot
      case "dimension": {
        const item = dimensionItem(part, points, toPx, issues);
        if (item) lines.push(item);
        break;
      }
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
  items.push(...freeTexts(spec, toPx));
  const labels = planeLabels(spec, items, plot, toPx);
  items.push(...labels.items, ...noteItems(specNote(spec, box.width), box));
  issues.push(...labels.issues);
  const scene: Scene = {
    width: box.width,
    height: box.height,
    items,
    issues,
    description: describePlane(spec, frame),
  };
  if (thinned.length) scene.thinned = thinned;
  return scene;
}

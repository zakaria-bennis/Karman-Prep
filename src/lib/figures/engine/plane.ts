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

const POINT_RADIUS = 3;
const EPS = 1e-9;

/** World-to-pixel mapping for the frame inside the box, less the house margin. */
function mapper(frame: PlaneFrame, box: Box) {
  const m = HOUSE.margin;
  const [x0, x1] = frame.x;
  const [y0, y1] = frame.y;
  const w = box.width - 2 * m;
  const h = box.height - 2 * m;
  return {
    w,
    h,
    px: (x: number) => m + ((x - x0) / (x1 - x0)) * w,
    py: (y: number) => m + ((y1 - y) / (y1 - y0)) * h,
  };
}

const fmt = (n: number) => String(Math.round(n * 100) / 100);

/**
 * Liang–Barsky: the parameter range [t0, t1] of p + t·d that lies inside the
 * frame, starting from [tMin, tMax], or null when none does.
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
    if (Math.abs(q) < EPS) {
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

function grid(frame: PlaneFrame, box: Box): SceneItem[] {
  const { w, h, px, py } = mapper(frame, box);
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

const clamp = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, v));

function axes(frame: PlaneFrame, box: Box): SceneItem[] {
  const { w, h, px, py } = mapper(frame, box);
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
  const xTicks = axisTicks(frame.x[0], frame.x[1], w);
  const yTicks = axisTicks(frame.y[0], frame.y[1], h);
  const tick = HOUSE.tickLength / 2;
  for (const x of xTicks.major) {
    if (Math.abs(x) < EPS) continue;
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
  for (const y of yTicks.major) {
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

function pathOf(pts: Pt[], m: ReturnType<typeof mapper>): string {
  return pts.map(([x, y], i) => `${i ? "L" : "M"}${fmt(m.px(x))} ${fmt(m.py(y))}`).join(" ");
}

/** A clipped segment, ray or line, with arrows where a ray or line leaves the frame. */
function straight(
  part: Extract<Part, { kind: "segment" | "ray" | "line" }>,
  points: Map<string, Pt>,
  frame: PlaneFrame,
  m: ReturnType<typeof mapper>,
  issues: SceneIssue[]
): SceneItem | null {
  const a = points.get(part.from);
  const b = points.get(part.to);
  if (!a || !b) return null;
  const d: Pt = [b[0] - a[0], b[1] - a[1]];
  if (Math.hypot(d[0], d[1]) < EPS) {
    issues.push({ code: "off_line", partId: part.id, detail: "its two points coincide" });
    return null;
  }
  const range =
    part.kind === "segment" ? [0, 1] : part.kind === "ray" ? [0, Infinity] : [-Infinity, Infinity];
  const c = clipParam(a, d, frame, range[0], range[1]);
  if (!c || c[1] - c[0] < EPS) {
    issues.push({ code: "clipped", partId: part.id, detail: "lies outside the frame" });
    return null;
  }
  if (part.kind === "segment" && (c[0] > 0 || c[1] < 1)) {
    issues.push({ code: "clipped", partId: part.id, detail: "runs past the frame" });
  }
  if (part.kind === "ray" && c[0] > 0) {
    issues.push({
      code: "clipped",
      partId: part.id,
      detail: "its start point is outside the frame",
    });
  }
  const pts: Pt[] = [c[0], c[1]].map((t) => [a[0] + t * d[0], a[1] + t * d[1]] as Pt);
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

function dot([x, y]: Pt, m: ReturnType<typeof mapper>, partId: string): SceneItem {
  const X = m.px(x);
  const Y = m.py(y);
  const r = POINT_RADIUS;
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
  m: ReturnType<typeof mapper>,
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

/** The Scene of a `plane` FigureSpec drawn in `box`. */
export function buildPlane(spec: FigureSpec, box: Box): Scene {
  const issues: SceneIssue[] = [];
  const frame: PlaneFrame = spec.frame ?? { x: [-10, 10], y: [-10, 10] };
  if (!spec.frame) issues.push({ code: "clipped", detail: "no frame given; using -10 to 10" });
  const m = mapper(frame, box);
  const points = new Map<string, Pt>();
  for (const p of spec.parts) if (p.kind === "point") points.set(p.id, [p.x, p.y]);

  const items: SceneItem[] = [...grid(frame, box), ...axes(frame, box)];
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

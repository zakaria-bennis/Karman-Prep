/**
 * Circles, arcs, polygons and shaded regions on a coordinate plane, in world
 * units mapped through the plane's Mapper. A circle is sampled at
 * HOUSE.circleSamples points (on an unequal-scale plane it draws as the
 * ellipse it really is); an arc is the minor arc from its start point to the
 * angle of its end point, at the start point's radius; a polygon is a closed
 * path. Anything running past the frame is clipped to it.
 *
 * A region draws only its authored `samples`: closed world-unit rings
 * (scripts/figures/sample-regions.ts), filled with role fill-faint under every
 * line, even-odd so holes stay clear, with no outline of its own. Its edge is
 * drawn by its `boundary` parts, in their own styling. The engine never
 * shades by color alone, so a region with no boundary part and no label is
 * reported as `region_unmarked`.
 */
import { HOUSE } from "./house";
import { clipPolyline, fmt, type Mapper } from "./plane";
import type { SceneIssue, SceneItem } from "./scene";
import type { FigureSpec, Part, PlaneFrame } from "./spec";

type Pt = [number, number];

/** Px path data through world points `pts`, closed with Z when `closed`. */
export function pathOf(pts: Pt[], m: Mapper, closed = false): string {
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${fmt(m.px(x))} ${fmt(m.py(y))}`).join(" ");
  return closed ? `${d} Z` : d;
}

/**
 * Sutherland–Hodgman: the part of closed ring `ring` where a·x + b·y <= c.
 * Crossings are interpolated along each edge, so a vertex on the line is exact
 * to floating point.
 */
export function clipHalfPlane(ring: readonly Pt[], a: number, b: number, c: number): Pt[] {
  const out: Pt[] = [];
  const f = (p: Pt) => a * p[0] + b * p[1] - c;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % ring.length];
    const fp = f(p);
    const fq = f(q);
    if (fp <= 0) out.push(p);
    if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) {
      const t = fp / (fp - fq);
      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  }
  return out;
}

/** The frame as a counter-clockwise ring. */
export function frameRing(frame: PlaneFrame): Pt[] {
  const [x0, x1] = frame.x;
  const [y0, y1] = frame.y;
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
}

/** `ring` clipped to the frame rectangle. */
export function clipRing(ring: readonly Pt[], frame: PlaneFrame): Pt[] {
  let out: Pt[] = [...ring];
  out = clipHalfPlane(out, -1, 0, -frame.x[0]);
  out = clipHalfPlane(out, 1, 0, frame.x[1]);
  out = clipHalfPlane(out, 0, -1, -frame.y[0]);
  return clipHalfPlane(out, 0, 1, frame.y[1]);
}

const inFrame = ([x, y]: Pt, f: PlaneFrame) =>
  x >= f.x[0] && x <= f.x[1] && y >= f.y[0] && y <= f.y[1];

const stroke = (d: string, partId: string): SceneItem => ({
  t: "path",
  d,
  role: "ink",
  weight: "line",
  partId,
});

/**
 * A closed world outline (circle or polygon): one closed path when it stays in
 * the frame, else the runs inside it. Returns [] (and an issue) when nothing is.
 */
function closedOutline(
  pts: Pt[],
  part: Part,
  frame: PlaneFrame,
  m: Mapper,
  issues: SceneIssue[],
  reportPast: boolean
): SceneItem[] {
  const out = pts.findIndex((p) => !inFrame(p, frame));
  if (out < 0) return [stroke(pathOf(pts, m, true), part.id)];
  // Start the run outside the frame so each inside stretch is one run.
  const run = [...pts.slice(out), ...pts.slice(0, out), pts[out]];
  const runs = clipPolyline(run, frame);
  if (runs.length === 0) {
    issues.push({ code: "clipped", partId: part.id, detail: "lies outside the frame" });
    return [];
  }
  if (reportPast) issues.push({ code: "clipped", partId: part.id, detail: "runs past the frame" });
  return runs.map((r) => stroke(pathOf(r, m), part.id));
}

/** World center and radius of a circle or arc, or null when a point is missing. */
export function circleOnPlane(
  part: Extract<Part, { kind: "circle" | "arc" }>,
  points: Map<string, Pt>
): { c: Pt; r: number } | null {
  const c = points.get(part.center);
  if (!c) return null;
  const through = part.kind === "arc" ? part.from : part.through;
  if (through === undefined)
    return part.kind === "circle" && part.radius ? { c, r: part.radius } : null;
  const t = points.get(through);
  return t ? { c, r: Math.hypot(t[0] - c[0], t[1] - c[1]) } : null;
}

/** World points along an arc part's minor arc, from `from` to the angle of `to`. */
export function arcPoints(
  part: Extract<Part, { kind: "arc" }>,
  points: Map<string, Pt>
): Pt[] | null {
  const k = circleOnPlane(part, points);
  const a = points.get(part.from);
  const b = points.get(part.to);
  if (!k || !a || !b || !(k.r > 0)) return null;
  const u: Pt = [a[0] - k.c[0], a[1] - k.c[1]];
  const v: Pt = [b[0] - k.c[0], b[1] - k.c[1]];
  const a0 = Math.atan2(u[1], u[0]);
  const span = Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]);
  const steps = Math.max(8, Math.ceil((HOUSE.circleSamples * Math.abs(span)) / (2 * Math.PI)));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = a0 + (span * i) / steps;
    return [k.c[0] + k.r * Math.cos(t), k.c[1] + k.r * Math.sin(t)] as Pt;
  });
}

/** The ink paths of a circle, arc or polygon part on a plane. */
export function shapeItems(
  part: Extract<Part, { kind: "circle" | "arc" | "polygon" }>,
  points: Map<string, Pt>,
  frame: PlaneFrame,
  m: Mapper,
  issues: SceneIssue[]
): SceneItem[] {
  if (part.kind === "polygon") {
    const pts = part.points.map((id) => points.get(id));
    if (pts.some((p) => !p)) return [];
    return closedOutline(pts as Pt[], part, frame, m, issues, true);
  }
  if (part.kind === "circle") {
    const k = circleOnPlane(part, points);
    if (!k || !(k.r > 0)) {
      issues.push({ code: "off_line", partId: part.id, detail: "the circle has no radius" });
      return [];
    }
    const n = HOUSE.circleSamples;
    const pts = Array.from({ length: n }, (_, i): Pt => {
      const t = (2 * Math.PI * i) / n;
      return [k.c[0] + k.r * Math.cos(t), k.c[1] + k.r * Math.sin(t)];
    });
    return closedOutline(pts, part, frame, m, issues, false);
  }
  const pts = arcPoints(part, points);
  if (!pts) {
    issues.push({ code: "off_line", partId: part.id, detail: "the arc has no radius" });
    return [];
  }
  const runs = clipPolyline(pts, frame);
  if (runs.length === 0) {
    issues.push({ code: "clipped", partId: part.id, detail: "lies outside the frame" });
    return [];
  }
  return runs.map((r) => stroke(pathOf(r, m), part.id));
}

/**
 * The fill of a region part: one even-odd path of its `samples` rings, clipped
 * to the frame, or nothing (with `unsampled_region`) when it has none.
 * Reports `region_unmarked` when neither a boundary part nor a label marks it.
 */
export function regionItems(
  part: Extract<Part, { kind: "region" }>,
  spec: FigureSpec,
  frame: PlaneFrame,
  m: Mapper,
  issues: SceneIssue[]
): SceneItem[] {
  const labelled = spec.labels.some((l) => l.on === part.id && l.text.trim() !== "");
  if (!part.boundary?.length && !labelled) {
    issues.push({
      code: "region_unmarked",
      partId: part.id,
      detail: "is shaded with no boundary part and no label; shading alone is color alone",
    });
  }
  if (!part.samples) {
    issues.push({
      code: "unsampled_region",
      partId: part.id,
      detail: "has no samples; run scripts/figures/sample-spec.ts",
    });
    return [];
  }
  const rings = part.samples.map((r) => clipRing(r, frame)).filter((r) => r.length >= 3);
  if (rings.length === 0) {
    issues.push({ code: "clipped", partId: part.id, detail: "shades nothing inside the frame" });
    return [];
  }
  return [
    {
      t: "path",
      d: rings.map((r) => pathOf(r, m, true)).join(" "),
      role: "fill-faint",
      weight: "line",
      fill: "fill-faint",
      fillRule: "evenodd",
      stroke: false,
      partId: part.id,
    },
  ];
}

/**
 * Points that only place a line, a ray's direction, a circle or an arc
 * (unlabelled, on nothing, and no segment end, ray start or polygon corner): they
 * draw no dot, as Bluebook prints a line "y = 2x + 1" with no points on it.
 */
export function helperPoints(spec: FigureSpec): Set<string> {
  const placing = new Set<string>();
  const shown = new Set(spec.labels.filter((l) => l.text.trim()).map((l) => l.on));
  for (const p of spec.parts) {
    if (p.kind === "line") [p.from, p.to].forEach((id) => placing.add(id));
    if (p.kind === "ray") placing.add(p.to);
    if (p.kind === "circle") [p.center, p.through].forEach((id) => id && placing.add(id));
    if (p.kind === "arc") [p.center, p.from, p.to].forEach((id) => placing.add(id));
  }
  for (const p of spec.parts) {
    if (p.kind === "segment") [p.from, p.to].forEach((id) => shown.add(id));
    if (p.kind === "ray") shown.add(p.from);
    if (p.kind === "polygon") p.points.forEach((id) => shown.add(id));
    if (p.kind === "point" && p.on?.length) shown.add(p.id);
  }
  return new Set([...placing].filter((id) => !shown.has(id)));
}

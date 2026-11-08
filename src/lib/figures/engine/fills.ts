/**
 * Shaded insides and dimension arrows, drawn the same way on a shape
 * (geometry2d) and a coordinate plane:
 *
 * - A polygon or circle with `shade`, and a `sector` (the wedge from its center
 *   between two points, the minor arc), fill in a theme role ("shade":
 *   fill-shade, "faint": fill-faint) with no outline of their own, under every
 *   line; the parts that bound them draw the edges. A fill is no obstacle for
 *   labels, so "pool" sits inside its shading.
 * - A `dimension` is a line between two points with an arrowhead at each end
 *   (the SAT's "x ft" across a path); its label attaches like a side's.
 */
import { HOUSE } from "./house";
import { fmt } from "./plane-axes";
import type { Role, SceneIssue, SceneItem } from "./scene";
import type { Part } from "./spec";

type Pt = [number, number];
type Shaded = Extract<Part, { kind: "polygon" | "circle" | "sector" }>;

const ROLES: Record<"shade" | "faint", Role> = { shade: "fill-shade", faint: "fill-faint" };

/** Does the part fill its inside? A sector always does. */
export const isShaded = (p: Part): p is Shaded =>
  p.kind === "sector" || ((p.kind === "polygon" || p.kind === "circle") && Boolean(p.shade));

/** A closed ring around the part's inside, in the units of `world`; null when it has none. */
export function shadeRing(part: Shaded, world: Map<string, Pt>): Pt[] | null {
  if (part.kind === "polygon") {
    const pts = part.points.map((id) => world.get(id));
    return pts.every(Boolean) ? (pts as Pt[]) : null;
  }
  const c = world.get(part.center);
  if (!c) return null;
  if (part.kind === "circle") {
    const t = part.through ? world.get(part.through) : undefined;
    const r = t ? Math.hypot(t[0] - c[0], t[1] - c[1]) : (part.radius ?? 0);
    if (!(r > 0)) return null;
    const n = HOUSE.circleSamples;
    return Array.from({ length: n }, (_, i): Pt => {
      const a = (2 * Math.PI * i) / n;
      return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
    });
  }
  const a = world.get(part.from);
  const b = world.get(part.to);
  if (!a || !b) return null;
  const u: Pt = [a[0] - c[0], a[1] - c[1]];
  const v: Pt = [b[0] - c[0], b[1] - c[1]];
  const r = Math.hypot(u[0], u[1]);
  if (!(r > 0)) return null;
  const a0 = Math.atan2(u[1], u[0]);
  const span = Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]);
  const steps = Math.max(8, Math.ceil((HOUSE.circleSamples * Math.abs(span)) / (2 * Math.PI)));
  const arc = Array.from({ length: steps + 1 }, (_, i): Pt => {
    const t = a0 + (span * i) / steps;
    return [c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)];
  });
  return [c, ...arc];
}

/**
 * The fill of a shaded part, its ring mapped by `toPx`; `inside` (a plane's frame) refuses
 * a ring that leaves it, since a fill is never clipped. Null and an issue when it cannot fill.
 */
export function shadeItem(
  part: Shaded,
  world: Map<string, Pt>,
  toPx: (p: Pt) => Pt,
  issues: SceneIssue[],
  inside?: (p: Pt) => boolean
): SceneItem | null {
  const ring = shadeRing(part, world);
  if (!ring) {
    issues.push({ code: "off_line", partId: part.id, detail: "has no inside to shade" });
    return null;
  }
  if (inside && !ring.every(inside)) {
    issues.push({
      code: "clipped",
      partId: part.id,
      detail: "its shading runs past the frame; a shaded shape must lie inside it",
    });
    return null;
  }
  const d = `${ring
    .map(toPx)
    .map(([x, y], i) => `${i ? "L" : "M"}${fmt(x)} ${fmt(y)}`)
    .join(" ")} Z`;
  const shade = part.shade ?? "shade";
  return {
    t: "path",
    d,
    role: "ink",
    weight: "line",
    fill: ROLES[shade],
    stroke: false,
    partId: part.id,
  };
}

/** A dimension arrow from `from` to `to` (mapped by `toPx`), arrowheads at both ends. */
export function dimensionItem(
  part: Extract<Part, { kind: "dimension" }>,
  world: Map<string, Pt>,
  toPx: (p: Pt) => Pt,
  issues: SceneIssue[]
): SceneItem | null {
  const a = world.get(part.from);
  const b = world.get(part.to);
  if (!a || !b) return null;
  const [A, B] = [toPx(a), toPx(b)];
  if (Math.hypot(B[0] - A[0], B[1] - A[1]) < 2 * HOUSE.arrowLength) {
    issues.push({
      code: "clipped",
      partId: part.id,
      detail: "is too short for its two arrowheads; draw the figure larger or the gap wider",
    });
  }
  return {
    t: "path",
    d: `M${fmt(A[0])} ${fmt(A[1])} L${fmt(B[0])} ${fmt(B[1])}`,
    role: "ink",
    weight: "line",
    arrows: "both",
    partId: part.id,
  };
}

/**
 * SAT marks: right-angle squares, equal-length ticks, equal-angle arcs and
 * parallel chevrons, drawn on already-resolved geometry. Sizes come from
 * HOUSE. Dashed hidden edges change the weight of the part itself, so the
 * geometry builder applies them and drawMark returns nothing for them.
 */
import { HOUSE } from "./house";
import { fmt } from "./plane";
import type { SceneItem } from "./scene";
import type { Mark, Part } from "./spec";

export type Pt = [number, number];

/**
 * The geometry marks are drawn on: every point by id and every part by id,
 * in one coordinate space (screen px when drawing, the spec's own units when
 * snapping). Scene items carry no part positions, so marks read this instead.
 */
export type GeoScene = { points: Map<string, Pt>; parts: Map<string, Part> };

/** An angle's three points by id: the vertex and one point on each ray. */
export type Corner = { id: string; vertex: string; from: string; to: string };

export const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
export const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
export const mul = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
export const dot = (a: Pt, b: Pt) => a[0] * b[0] + a[1] * b[1];
export const cross = (a: Pt, b: Pt) => a[0] * b[1] - a[1] * b[0];
export const len = (a: Pt) => Math.hypot(a[0], a[1]);
export const unit = (a: Pt): Pt => {
  const l = len(a);
  return l > 0 ? [a[0] / l, a[1] / l] : [0, 0];
};
const at = ([x, y]: Pt) => `${fmt(x)} ${fmt(y)}`;

/**
 * The corner a right_angle or equal_arcs mark points at: an angle part, or
 * two segments, rays or lines that share an endpoint.
 */
export function cornersOf(mark: Mark, parts: Map<string, Part>): Corner[] {
  const first = parts.get(mark.on[0]);
  const second = parts.get(mark.on[1] ?? "");
  const twoPoint = (p?: Part) =>
    p && (p.kind === "segment" || p.kind === "ray" || p.kind === "line") ? p : null;
  const s1 = twoPoint(first);
  const s2 = twoPoint(second);
  if (mark.on.length === 2 && s1 && s2) {
    const shared = [s1.from, s1.to].find((id) => id === s2.from || id === s2.to);
    if (!shared) return [];
    const other = (s: typeof s1) => (s.from === shared ? s.to : s.from);
    return [{ id: s1.id, vertex: shared, from: other(s1), to: other(s2) }];
  }
  return mark.on.flatMap((id) => {
    const p = parts.get(id);
    return p?.kind === "angle" ? [{ id, vertex: p.vertex, from: p.from, to: p.to }] : [];
  });
}

/** Unit vectors from the vertex along each ray, or null for a degenerate angle. */
function rays(c: Corner, points: Map<string, Pt>): { v: Pt; u1: Pt; u2: Pt } | null {
  const v = points.get(c.vertex);
  const a = points.get(c.from);
  const b = points.get(c.to);
  if (!v || !a || !b) return null;
  const u1 = unit(sub(a, v));
  const u2 = unit(sub(b, v));
  if (!len(u1) || !len(u2)) return null;
  return { v, u1, u2 };
}

/** The defining points of a segment, ray or line. */
function ends(id: string, scene: GeoScene): [Pt, Pt] | null {
  const p = scene.parts.get(id);
  if (!p || (p.kind !== "segment" && p.kind !== "ray" && p.kind !== "line")) return null;
  const a = scene.points.get(p.from);
  const b = scene.points.get(p.to);
  return a && b && len(sub(b, a)) > 0 ? [a, b] : null;
}

const path = (d: string, partId: string): SceneItem => ({
  t: "path",
  d,
  role: "ink",
  weight: "line",
  partId,
});

/** Offsets along a segment for `n` repeated marks centered on its midpoint. */
const spread = (n: number) =>
  Array.from({ length: n }, (_, k) => (k - (n - 1) / 2) * HOUSE.markGap);

/** The Scene items for one mark, tagged with the id of the part they mark. */
export function drawMark(mark: Mark, scene: GeoScene): SceneItem[] {
  const n = mark.count ?? 1;
  switch (mark.kind) {
    case "right_angle":
      return cornersOf(mark, scene.parts).flatMap((c) => {
        const r = rays(c, scene.points);
        if (!r) return [];
        const s = HOUSE.rightAngleSide;
        const p1 = add(r.v, mul(r.u1, s));
        const p3 = add(r.v, mul(r.u2, s));
        const p2 = add(p1, mul(r.u2, s));
        return [path(`M${at(p1)} L${at(p2)} L${at(p3)}`, c.id)];
      });
    case "equal_arcs":
      return cornersOf(mark, scene.parts).flatMap((c) => {
        const r = rays(c, scene.points);
        if (!r) return [];
        const sweep = cross(r.u1, r.u2) > 0 ? 1 : 0;
        return Array.from({ length: n }, (_, k) => {
          const rad = HOUSE.angleArcRadius + k * HOUSE.markGap;
          const p1 = add(r.v, mul(r.u1, rad));
          const p2 = add(r.v, mul(r.u2, rad));
          return path(`M${at(p1)} A${fmt(rad)} ${fmt(rad)} 0 0 ${sweep} ${at(p2)}`, c.id);
        });
      });
    case "equal_ticks":
      return mark.on.flatMap((id) => {
        const e = ends(id, scene);
        if (!e) return [];
        const u = unit(sub(e[1], e[0]));
        const nrm: Pt = [-u[1], u[0]];
        const mid = mul(add(e[0], e[1]), 0.5);
        const h = HOUSE.tickLength / 2;
        return spread(n).map((o) => {
          const c = add(mid, mul(u, o));
          return path(`M${at(add(c, mul(nrm, -h)))} L${at(add(c, mul(nrm, h)))}`, id);
        });
      });
    case "parallel":
      return mark.on.flatMap((id) => {
        const e = ends(id, scene);
        if (!e) return [];
        const u = unit(sub(e[1], e[0]));
        const nrm: Pt = [-u[1], u[0]];
        const mid = mul(add(e[0], e[1]), 0.5);
        const l = HOUSE.tickLength;
        // Chevrons point from `from` to `to`, centered on the midpoint.
        return spread(n).map((o) => {
          const tip = add(mid, mul(u, o + l / 2));
          const back = add(tip, mul(u, -l));
          const p1 = add(back, mul(nrm, l / 2));
          const p2 = add(back, mul(nrm, -l / 2));
          return path(`M${at(p1)} L${at(tip)} L${at(p2)}`, id);
        });
      });
    case "hidden_dashed":
      return [];
  }
}

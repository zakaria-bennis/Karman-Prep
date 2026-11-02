/**
 * Part labels on a coordinate plane. Each label gets an anchor and a
 * preferred side from the part it names, then goes through placeLabels with
 * everything already drawn as obstacles (axes, curves, lines, dots and tick
 * labels; grid lines are ignored), so it never overlaps a line or another
 * label. A label with no room is a `label_collision`; one on a part the plane
 * does not draw is a `missing_label`.
 *
 * - point: beside the point, up and to the right first.
 * - segment, ray, line: at its middle (`at: "mid"`, the default) or at its
 *   drawn start or end, offset perpendicular, on the upper side.
 * - function: at the end of the curve inside the frame (`at: "start"` for
 *   its start), offset perpendicular to the curve there.
 * - circle: on its outline up and to the right of the center, outward
 *   (`at: "inside"`: by the center); arc: at its middle, outward.
 * - polygon: at the middle of its highest side, away from its inside
 *   (`at: "inside"`: by its centroid).
 * - region: inside the shaded rings, near the centroid of the largest one (or
 *   the inside spot nearest it when the centroid falls outside); the whole
 *   label must fit inside the shading.
 */
import { placeLabels, type PendingLabel } from "./labels";
import type { SceneIssue, SceneItem } from "./scene";
import type { FigureSpec, Label, Part } from "./spec";

type Box = { width: number; height: number };
type Pt = [number, number];

/** The vertices of a path made only of M/L commands (lines and curves), in px. */
function vertices(d: string): Pt[] {
  const n = (d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
  const out: Pt[] = [];
  for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i], n[i + 1]]);
  return out;
}

/** The unit normal of a→b on the upper side of the figure (y grows downward). */
function upperNormal(a: Pt, b: Pt): Pt {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  const n: Pt = [-dy / l, dx / l];
  return n[1] > 0 || (n[1] === 0 && n[0] < 0) ? [-n[0], -n[1]] : n;
}

/** The closed rings of a path made of M/L/Z commands, in px. */
function rings(d: string): Pt[][] {
  return d
    .split("M")
    .filter((r) => r.trim())
    .map((r) => vertices(r))
    .filter((r) => r.length >= 3);
}

/** Even-odd: is p inside the rings? */
function insideRings(p: Pt, rs: Pt[][]): boolean {
  let inside = false;
  for (const r of rs) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i];
      const [xj, yj] = r[j];
      if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
  }
  return inside;
}

/** Area-weighted centroid and absolute area of a ring. */
function centroidOf(r: Pt[]): { c: Pt; area: number } {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const k = r[j][0] * r[i][1] - r[i][0] * r[j][1];
    a += k;
    cx += (r[j][0] + r[i][0]) * k;
    cy += (r[j][1] + r[i][1]) * k;
  }
  if (Math.abs(a) < 1e-9) {
    const n = r.length;
    return {
      c: [r.reduce((s, p) => s + p[0], 0) / n, r.reduce((s, p) => s + p[1], 0) / n],
      area: 0,
    };
  }
  return { c: [cx / (3 * a), cy / (3 * a)], area: Math.abs(a / 2) };
}

/** Where a region's label goes: the largest ring's centroid, or the inside spot nearest it. */
function regionSpot(rs: Pt[][]): Pt | null {
  const cs = rs.map(centroidOf);
  const at = cs.reduce((a, c, i) => (c.area > cs[a].area ? i : a), 0);
  const best = cs[at];
  if (insideRings(best.c, rs)) return best.c;
  const ring = rs[at];
  const xs = ring.map((p) => p[0]);
  const ys = ring.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const N = 24;
  let spot: Pt | null = null;
  let near = Infinity;
  for (let i = 1; i < N; i++) {
    for (let j = 1; j < N; j++) {
      const p: Pt = [x0 + ((x1 - x0) * i) / N, y0 + ((y1 - y0) * j) / N];
      const d = Math.hypot(p[0] - best.c[0], p[1] - best.c[1]);
      if (d < near && insideRings(p, rs)) [spot, near] = [p, d];
    }
  }
  return spot;
}

const unit = ([x, y]: Pt): Pt => {
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
};

type Spot = {
  anchor: Pt;
  preferred: Pt;
  within?: (box: [number, number, number, number]) => boolean;
};

function spotFor(
  label: Label,
  part: Part,
  drawn: SceneItem[],
  toPx: (p: Pt) => Pt,
  points: Map<string, Pt>
): Spot | null {
  const own = drawn.filter(
    (i): i is Extract<SceneItem, { t: "path" }> => i.t === "path" && i.partId === part.id
  );
  if (own.length === 0) return null;
  if (part.kind === "point") {
    return { anchor: toPx([part.x, part.y]), preferred: [Math.SQRT1_2, -Math.SQRT1_2] };
  }
  if (part.kind === "segment" || part.kind === "ray" || part.kind === "line") {
    const pts = vertices(own[0].d);
    const a = pts[0];
    const b = pts[pts.length - 1];
    const anchor: Pt =
      label.at === "start" ? a : label.at === "end" ? b : [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    return { anchor, preferred: upperNormal(a, b) };
  }
  if (part.kind === "function") {
    const runs = own.map((i) => vertices(i.d)).filter((r) => r.length >= 2);
    if (runs.length === 0) return null;
    if (label.at === "start") {
      const r = runs[0];
      return { anchor: r[0], preferred: upperNormal(r[0], r[1]) };
    }
    const r = runs[runs.length - 1];
    const end = r[r.length - 1];
    return { anchor: end, preferred: upperNormal(r[r.length - 2], end) };
  }
  if (part.kind === "region") {
    const rs = rings(own[0].d);
    const spot = rs.length ? regionSpot(rs) : null;
    if (!spot) return null;
    const within = ([l, r, t, b]: [number, number, number, number]) =>
      (
        [
          [l, t],
          [r, t],
          [l, b],
          [r, b],
        ] as Pt[]
      ).every((p) => insideRings(p, rs));
    return { anchor: spot, preferred: [0, -1], within };
  }
  const outline = own.flatMap((i) => vertices(i.d));
  if (outline.length < 2) return null;
  if (part.kind === "circle" || part.kind === "arc") {
    const c = points.get(part.center);
    if (!c) return null;
    const C = toPx(c);
    if (label.at === "inside") return { anchor: C, preferred: [0, -1] };
    // The drawn outline point furthest up and to the right (a circle), or the middle (an arc).
    const anchor =
      part.kind === "arc"
        ? outline[Math.floor(outline.length / 2)]
        : outline.reduce((a, p) => (p[0] - p[1] > a[0] - a[1] ? p : a));
    return { anchor, preferred: unit([anchor[0] - C[0], anchor[1] - C[1]]) };
  }
  if (part.kind === "polygon") {
    const n = outline.length;
    const mid: Pt = [
      outline.reduce((s, p) => s + p[0], 0) / n,
      outline.reduce((s, p) => s + p[1], 0) / n,
    ];
    if (label.at === "inside") return { anchor: mid, preferred: [0, -1] };
    // The middle of the highest side, offset away from the inside.
    let best: Spot | null = null;
    for (const item of own) {
      const v = vertices(item.d);
      const closed = /Z\s*$/.test(item.d);
      for (let i = 0; i + (closed ? 0 : 1) < v.length; i++) {
        const a = v[i];
        const b = v[(i + 1) % v.length];
        const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        if (best && m[1] >= best.anchor[1]) continue;
        let nrm = upperNormal(a, b);
        if (nrm[0] * (m[0] - mid[0]) + nrm[1] * (m[1] - mid[1]) < 0) nrm = [-nrm[0], -nrm[1]];
        best = { anchor: m, preferred: nrm };
      }
    }
    return best;
  }
  return null;
}

/**
 * Text items for the spec's labels, placed clear of `items` (the plane drawn so
 * far), and the issues met. `toPx` maps world coordinates to the box.
 */
export function planeLabels(
  spec: FigureSpec,
  items: SceneItem[],
  box: Box,
  toPx: (p: Pt) => Pt
): { items: SceneItem[]; issues: SceneIssue[] } {
  const parts = new Map(spec.parts.map((p) => [p.id, p]));
  const points = new Map<string, Pt>();
  for (const p of spec.parts) if (p.kind === "point") points.set(p.id, [p.x, p.y]);
  const issues: SceneIssue[] = [];
  const pending: PendingLabel[] = [];
  for (const label of spec.labels) {
    if (!label.text.trim()) continue;
    const part = parts.get(label.on);
    const spot = part ? spotFor(label, part, items, toPx, points) : null;
    if (!spot) {
      issues.push({
        code: "missing_label",
        partId: label.on,
        detail: `label "${label.text}" has no place on this part on a coordinate plane`,
      });
      continue;
    }
    pending.push({
      text: label.text,
      anchor: { x: spot.anchor[0], y: spot.anchor[1] },
      preferred: { dx: spot.preferred[0], dy: spot.preferred[1] },
      partId: label.on,
      within: spot.within,
    });
  }
  const placed = placeLabels(items, pending, box);
  return { items: placed.items.slice(items.length), issues: [...issues, ...placed.issues] };
}

/**
 * 3D solids, drawn the way Bluebook draws them.
 *
 * - The model: each solid is stored as a real 3D model (solid-model.ts).
 * - The camera: an orthographic view, by default each shape's Bluebook view
 *   (solid-camera.ts); a spec may set `view.turn`, `view.tilt` and `view.lean`.
 * - The lines (solid-draw.ts): hidden edges dashed; a cone's and a cylinder's
 *   sides tangent to their ellipses at the true points; a height dashed from
 *   apex to base center; a radius solid from a dot at its center.
 * - Labels attach to a dimension with `on: "<solid id>.<dimension>"` or to a
 *   named point with `on: "<solid id>.<point id>"`. As Bluebook places them:
 *   an edge's label sits centered off the edge, outside the solid
 *   (2026-03_US_V1_MATH_M2_Q10's ℓ and w); a height's beside its line, on the
 *   right (h there); a cylinder's height beside its right side and a radius's
 *   on the front side of its line (2024-08_US_V5_MATH_M1_Q19's h and r); a
 *   point's away from the middle of the solid or its circle (the cones'
 *   A, B, V, O and P). Single letters print in italic.
 * - Marks: `right_angle` on "<solid id>.height" squares the foot of a cone's
 *   or pyramid's height against the base (the pyramid's mark).
 * - Inner lines (a radius, a cone's or pyramid's height) are drawn when
 *   labeled, or when the solid lists them in `show`.
 */
import { specNote } from "./notes";
import { HOUSE } from "./house";
import { placeLabels, textWidth, type PendingLabel } from "./labels";
import { add, cross, mul, unit, type Pt } from "./marks";
import { fmt } from "./plane-axes";
import type { ScaleOptions, Scene, SceneIssue, SceneItem } from "./scene";
import { cameraFor, type Camera } from "./solid-camera";
import { drawSolid, type Drawing } from "./solid-draw";
import type { SolidPart } from "./solid-model";
import { SOLID_DIMS, type FigureSpec, type SolidShape } from "./spec";

type Box = { width: number; height: number };

/** Fitting applied after projection: scale, then shift. */
export type Fit = { scale: number; x: number; y: number };

const EPS = 1e-9;
/**
 * The largest a solid is drawn, in ems of the label font. Bluebook draws its
 * solids at most about 14 em wide (2025-03_ASIA_V2_MATH_M1_Q21's cone) and
 * 15 em tall (2025-05_ASIA_V2_MATH_M2_Q10's pyramid), measured against the
 * figure note's text, so its labels read large beside the solid.
 */
const MAX_EM = { width: 14, height: 15 };
/** How far along a radius (from its center) its label sits. */
const RADIUS_LABEL_AT = 0.6;

const SHAPE_NAMES: Record<SolidShape, string> = {
  prism: "Rectangular prism",
  cylinder: "Right circular cylinder",
  cone: "Right circular cone",
  pyramid: "Rectangular pyramid",
  sphere: "Sphere",
};

/** "Right circular cylinder, radius r, height 10." from the shape and its labels. */
function describe(
  shape: SolidShape,
  labeled: Map<string, string>,
  notToScale?: boolean | "figures"
): string {
  const out = [SHAPE_NAMES[shape]];
  for (const [d, text] of labeled)
    out.push(`${d.replace(/[A-Z]/g, (c) => ` ${c.toLowerCase()}`)} ${text}`);
  if (notToScale) out.push("not drawn to scale");
  return `${out.join(", ")}.`;
}

function polyline(pts: Pt[], close: boolean): string {
  const body = pts.map(([x, y], i) => `${i ? "L" : "M"}${fmt(x)} ${fmt(y)}`).join(" ");
  return close ? `${body} Z` : body;
}

function dotPath([x, y]: Pt): string {
  const r = HOUSE.pointRadius;
  return `M${fmt(x - r)} ${fmt(y)} A${r} ${r} 0 1 0 ${fmt(x + r)} ${fmt(y)} A${r} ${r} 0 1 0 ${fmt(x - r)} ${fmt(y)} Z`;
}

/** The drawing moved to the box: every screen point scaled, then shifted. */
function fitted(d: Drawing, fit: Fit): Drawing {
  const f = ([x, y]: Pt): Pt => [fit.x + fit.scale * x, fit.y + fit.scale * y];
  const two = ([a, b]: [Pt, Pt]): [Pt, Pt] => [f(a), f(b)];
  return {
    strokes: d.strokes.map((s) => ({ ...s, pts: s.pts.map(f) })),
    dots: d.dots.map((o) => ({ ...o, at: f(o.at) })),
    dims: Object.fromEntries(
      Object.entries(d.dims).map(([k, v]) => [k, { ...v, ends: two(v.ends) }])
    ),
    points: Object.fromEntries(
      Object.entries(d.points).map(([k, v]) => [k, { at: f(v.at), from: f(v.from) }])
    ),
    extent: d.extent.map(f),
    foot: d.foot && { ...d.foot, at: f(d.foot.at) },
  };
}

/** Scene items of a drawing: dashed lines first, so solid lines draw over them. */
function strokeItems(d: Drawing): SceneItem[] {
  const items: SceneItem[] = [];
  for (const hidden of [true, false]) {
    for (const s of d.strokes.filter((x) => x.hidden === hidden)) {
      items.push({
        t: "path",
        d: polyline(s.pts, s.close),
        role: "ink",
        weight: hidden ? "dashed" : "line",
        partId: s.partId,
      });
    }
  }
  for (const o of d.dots) {
    items.push({
      t: "path",
      d: dotPath(o.at),
      role: "ink",
      weight: "line",
      fill: "ink",
      partId: o.partId,
    });
  }
  return items;
}

/**
 * Draw a solid part, by default with its Bluebook camera. Without `fit` the
 * drawing is in world units with the world origin at (0, 0), y down. `lines`
 * names the inner lines to draw.
 */
export function project(
  part: SolidPart,
  options: { camera?: Camera; fit?: Fit; lines?: string[] } = {}
): Scene {
  const camera = options.camera ?? cameraFor(part.shape, part.view, part.dims);
  const raw = drawSolid(part, camera, new Set(options.lines ?? []));
  const d = fitted(raw, options.fit ?? { scale: 1, x: 0, y: 0 });
  const xs = d.extent.map((p) => p[0]);
  const ys = d.extent.map((p) => p[1]);
  return {
    width: Math.max(0, ...xs) - Math.min(0, ...xs),
    height: Math.max(0, ...ys) - Math.min(0, ...ys),
    items: strokeItems(d),
    issues: [],
    description: describe(part.shape, new Map()),
  };
}

/** The right-angle square at the foot of the height, against the base direction most across it. */
function footSquare(d: Drawing, partId: string): SceneItem[] {
  if (!d.foot) return [];
  const up = unit(d.foot.up);
  const across = d.foot.across
    .map(unit)
    .filter((a) => a[0] > EPS)
    .reduce<Pt | null>(
      (b, a) => (!b || Math.abs(cross(up, a)) > Math.abs(cross(up, b)) ? a : b),
      null
    );
  if (!across) return [];
  const s = HOUSE.rightAngleSide;
  const p1 = add(d.foot.at, mul(up, s));
  const p3 = add(d.foot.at, mul(across, s));
  const p2 = add(p1, mul(across, s));
  return [{ t: "path", d: polyline([p1, p2, p3], false), role: "ink", weight: "line", partId }];
}

/** How far a ray from `o` along `dir` runs before it meets a line of the drawing. */
function room(d: Drawing, o: Pt, dir: Pt): number {
  let best = Infinity;
  for (const s of d.strokes) {
    const pts = s.close ? [...s.pts, s.pts[0]] : s.pts;
    for (let i = 0; i + 1 < pts.length; i++) {
      const [a, b] = [pts[i], pts[i + 1]];
      const e: Pt = [b[0] - a[0], b[1] - a[1]];
      const den = cross(dir, e);
      if (Math.abs(den) < EPS) continue;
      const w: Pt = [a[0] - o[0], a[1] - o[1]];
      const t = cross(w, e) / den;
      const u = cross(w, dir) / den;
      if (t > EPS && u >= 0 && u <= 1) best = Math.min(best, t);
    }
  }
  return best;
}

/** Where each label goes: its anchor and the side it prefers. */
function pendingLabel(
  d: Drawing,
  name: string,
  text: string,
  partId: string,
  middle: Pt
): { label: PendingLabel; fallback: PendingLabel } {
  const italic = /^[A-Za-zℓ]$/.test(text) || undefined;
  const point = d.points[name];
  if (point) {
    let dir: Pt = [point.at[0] - point.from[0], point.at[1] - point.from[1]];
    if (Math.hypot(...dir) < EPS) dir = [0, -1];
    const label = {
      text,
      anchor: { x: point.at[0], y: point.at[1] },
      preferred: { dx: dir[0], dy: dir[1] },
      partId,
      italic,
    };
    return { label, fallback: label };
  }
  const dim = d.dims[name];
  const [a, b] = dim.ends;
  const along = dim.kind === "radius" ? RADIUS_LABEL_AT : 0.5;
  const anchor = { x: a[0] + (b[0] - a[0]) * along, y: a[1] + (b[1] - a[1]) * along };
  const l = Math.hypot(a[1] - b[1], b[0] - a[0]) || 1;
  let n: Pt = [(a[1] - b[1]) / l, (b[0] - a[0]) / l];
  if (dim.kind === "edge") {
    // Off the edge, on the side away from the solid.
    const away = n[0] * (anchor.x - middle[0]) + n[1] * (anchor.y - middle[1]);
    if (away < 0) n = [-n[0], -n[1]];
  } else if (dim.kind === "radius") {
    // On the front (lower) side of the radius.
    if (n[1] < 0 || (Math.abs(n[1]) < EPS && n[0] < 0)) n = [-n[0], -n[1]];
  } else if (dim.kind === "inner" || dim.kind === "beside") {
    // A height takes its label on the right, or on its roomier side
    // (2026-03_US_V1_MATH_M2_Q10's h sits left, where the pyramid opens wider).
    if (n[0] < 0 || (Math.abs(n[0]) < EPS && n[1] > 0)) n = [-n[0], -n[1]];
    const o: Pt = [anchor.x, anchor.y];
    if (dim.kind === "inner" && room(d, o, [-n[0], -n[1]]) > room(d, o, n) + HOUSE.labelOffset) {
      n = [-n[0], -n[1]];
    }
  }
  const label = { text, anchor, preferred: { dx: n[0], dy: n[1] }, partId, italic };
  // If that side is crowded (a sphere's radius between the equator's halves),
  // the label tries the line's outer end.
  const far = (p: Pt) => Math.hypot(p[0] - middle[0], p[1] - middle[1]);
  const end = far(a) > far(b) ? a : b;
  const fallback = {
    text,
    anchor: { x: end[0], y: end[1] },
    preferred: { dx: end[0] - middle[0], dy: end[1] - middle[1] },
    partId,
    italic,
  };
  return { label, fallback };
}

/** The Scene of a `solid3d` FigureSpec drawn in `box`. */
export function buildSolid3d(spec: FigureSpec, box: Box, opts: ScaleOptions = {}): Scene {
  const issues: SceneIssue[] = [];
  const solids = spec.parts.filter((p): p is SolidPart => p.kind === "solid");
  for (const p of spec.parts) {
    if (p.kind !== "solid") {
      issues.push({
        code: "clipped",
        partId: p.id,
        detail: `a ${p.kind} is not drawn with 3D solids`,
      });
    }
  }
  const empty = (detail: string, partId?: string): Scene => {
    issues.push({ code: "clipped", partId, detail });
    return { width: box.width, height: box.height, items: [], issues, description: "A 3D figure." };
  };
  if (solids.length === 0) return empty("a solid3d figure needs a solid part");
  for (const extra of solids.slice(1)) {
    issues.push({ code: "clipped", partId: extra.id, detail: "a solid3d figure draws one solid" });
  }
  const part = solids[0];
  const need: readonly string[] = SOLID_DIMS[part.shape];
  if (!need.every((k) => (part.dims[k] ?? 0) > 0)) {
    return empty(`a ${part.shape} needs the positive dims ${need.join(", ")}`, part.id);
  }
  const heightRef = `${part.id}.height`;
  const squared = spec.marks.some((m) => m.kind === "right_angle" && m.on.includes(heightRef));
  for (const m of spec.marks) {
    const onHeight = m.kind === "right_angle" && m.on.every((r) => r === heightRef);
    if (!onHeight || (part.shape !== "cone" && part.shape !== "pyramid")) {
      issues.push({
        code: "clipped",
        detail: `a ${m.kind} mark on a solid can only square a cone's or pyramid's height`,
      });
    }
  }

  const pointIds = new Set((part.points ?? []).map((p) => p.id));
  const labeled = new Map<string, string>();
  for (const l of spec.labels) {
    const name = l.on.startsWith(`${part.id}.`) ? l.on.slice(part.id.length + 1) : "";
    const known = (need.includes(name) || pointIds.has(name)) && !labeled.has(name);
    if (known) labeled.set(name, l.text);
    else {
      issues.push({
        code: "missing_label",
        partId: l.on,
        detail: `label "${l.text}" must name one dimension or point of the solid, like "${part.id}.${need[0]}"`,
      });
    }
  }
  const lines = [...new Set([...labeled.keys(), ...(part.show ?? [])])];
  if (squared) lines.push("height");
  const camera = cameraFor(part.shape, part.view, part.dims);
  const raw = drawSolid(part, camera, new Set(lines));

  // Layout: the box less the margin, room for labels around the solid, and the note band.
  const font = HOUSE.font;
  const note = specNote(spec, box.width);
  const noteBand = note.length ? note.length * 1.25 * font + HOUSE.labelOffset : 0;
  const widest = Math.max(0, ...[...labeled.values()].map(textWidth));
  const roomX = labeled.size ? HOUSE.labelOffset + widest : 0;
  const roomY = labeled.size ? HOUSE.labelOffset + 1.25 * font : 0;
  const availW = Math.max(1, box.width - 2 * (HOUSE.margin + roomX));
  const availH = Math.max(1, box.height - noteBand - 2 * (HOUSE.margin + roomY));
  const xs = raw.extent.map((p) => p[0]);
  const ys = raw.extent.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const fitScale = Math.min(
    availW / Math.max(x1 - x0, EPS),
    availH / Math.max(y1 - y0, EPS),
    (MAX_EM.width * font) / Math.max(x1 - x0, EPS),
    (MAX_EM.height * font) / Math.max(y1 - y0, EPS)
  );
  // A shared scale (figure choices) maps world units to px the same for every figure in a set.
  const scale = opts.scale ?? fitScale;
  // The solid, the room for its labels and the note stand together, centered,
  // so the note sits just under the figure as in Bluebook.
  const group = scale * (y1 - y0) + 2 * roomY + noteBand;
  const top = Math.max(HOUSE.margin, (box.height - group) / 2) + roomY;
  const fit: Fit = { scale, x: box.width / 2 - (scale * (x0 + x1)) / 2, y: top - scale * y0 };
  const noteTop = Math.min(
    top + scale * (y1 - y0) + roomY + HOUSE.labelOffset,
    box.height - HOUSE.margin / 2 - noteBand + HOUSE.labelOffset
  );
  const d = fitted(raw, fit);

  const items = strokeItems(d);
  if (squared) items.push(...footSquare(d, heightRef));
  note.forEach((text, i) => {
    items.push({
      t: "text",
      x: box.width / 2,
      y: noteTop + font + i * 1.25 * font,
      text,
      role: "ink",
      anchor: "middle",
    });
  });

  const middle: Pt = [box.width / 2, top + (scale * (y1 - y0)) / 2];
  const fallback = new Map<string, PendingLabel>();
  const pending = [...labeled].map(([name, text]) => {
    const p = pendingLabel(d, name, text, `${part.id}.${name}`, middle);
    fallback.set(p.label.partId, p.fallback);
    return p.label;
  });
  const first = placeLabels(items, pending, box);
  const retry = first.issues.flatMap((i) => (i.partId ? [fallback.get(i.partId)!] : []));
  const placed = retry.length ? placeLabels(first.items, retry, box) : first;
  issues.push(...placed.issues);

  return {
    width: box.width,
    height: box.height,
    items: placed.items,
    issues,
    description: describe(
      part.shape,
      new Map([...labeled].filter(([name]) => need.includes(name))),
      spec.notToScale
    ),
    scale,
  };
}

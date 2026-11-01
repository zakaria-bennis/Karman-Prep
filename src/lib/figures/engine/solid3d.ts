/**
 * 3D solids: each solid is stored as a real model (vertices, edges, faces)
 * and projected, so rotating it or unfolding it into a net can come later
 * without redrawing it.
 *
 * - World axes: x to the right (length), y up (height), z away from the
 *   viewer (depth, the prism's width). The base of every solid sits on y = 0.
 * - Dims use the SAT's words (SOLID_DIMS in spec.ts): prism length, width,
 *   height; cylinder and cone radius, height; pyramid baseLength, baseWidth,
 *   height; sphere radius.
 * - Views: oblique (the SAT's default) keeps the front face true and draws
 *   depth at HOUSE.obliqueAngle and HOUSE.obliqueDepth; isometric puts the
 *   three axes at 120°. Both are parallel projections.
 * - Hidden lines: a face is visible when its outward normal points at the
 *   viewer. An edge is solid when any face beside it is visible, dashed
 *   otherwise. Curved sides are HOUSE.circleSamples flat faces, and where a
 *   visible one meets a hidden one the shared line is drawn as the outline.
 * - A sphere's outline is the exact circle, and its equator is the only
 *   edge. A true oblique view would stretch a sphere into an ellipse, which
 *   the SAT never prints, so a sphere's oblique view is the orthographic
 *   view whose equator flattens by the same amount as oblique depth.
 * - Labels attach to a dimension with `on: "<solid id>.<dimension>"`. A
 *   dimension that runs through the inside or across a face (a radius, a
 *   cone's or pyramid's height) is a guide line, drawn only when labeled:
 *   solid on a visible face, dashed through the inside or on a hidden face.
 */
import { noteLines } from "./geometry2d";
import { HOUSE } from "./house";
import { placeLabels, textWidth, type PendingLabel } from "./labels";
import type { Pt } from "./marks";
import { fmt } from "./plane";
import type { ScaleOptions, Scene, SceneIssue, SceneItem } from "./scene";
import { SOLID_DIMS, type FigureSpec, type Part, type SolidShape } from "./spec";

type Box = { width: number; height: number };
type SolidPart = Extract<Part, { kind: "solid" }>;

export type V3 = [number, number, number];
export type SolidView = "oblique" | "isometric";

export type SolidDim = {
  /** The two vertices the dimension runs between. */
  ends: [number, number];
  /** An inner line, drawn only when the dimension is labeled. */
  guide: boolean;
};

export type SolidModel = {
  id: string;
  shape: SolidShape;
  vertices: V3[];
  /** Hard edges, always drawn (solid or dashed). */
  edges: [number, number][];
  /** Flat faces, each a cycle of vertex indices. */
  faces: number[][];
  dims: Record<string, SolidDim>;
  /** A sphere: its outline is drawn as the exact circle around this vertex. */
  sphere?: { center: number; radius: number };
};

/** Fitting applied after projection: scale, then shift. */
export type Fit = { scale: number; x: number; y: number };

type Projection = {
  /** Screen x and screen-up rows of the parallel projection. */
  rows: [V3, V3];
  /** The direction toward the viewer, which projects to a point. */
  toViewer: V3;
};

const EPS = 1e-9;
/** A dimension line this close (px) to the figure's middle counts as running through it. */
const INSIDE_PX = 1;
/** The isometric axes sit 30° off the horizontal, so they meet at 120°. */
const ISO_ANGLE = Math.PI / 6;
/** Bands from pole to pole on a sphere, so each meridian is a full circle of samples. */
const SPHERE_BANDS = HOUSE.circleSamples / 2;

const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

function projectionOf(view: SolidView, sphere: boolean): Projection {
  if (view === "isometric") {
    const c = Math.cos(ISO_ANGLE);
    const s = Math.sin(ISO_ANGLE);
    return {
      rows: [
        [c, 0, c],
        [-s, 1, s],
      ],
      toViewer: [1, 1, -1],
    };
  }
  const a = (HOUSE.obliqueAngle * Math.PI) / 180;
  const dx = HOUSE.obliqueDepth * Math.cos(a);
  const dy = HOUSE.obliqueDepth * Math.sin(a);
  if (sphere) {
    // Orthographic, tilted so the equator flattens to the oblique depth's rise.
    const up = Math.sqrt(1 - dy * dy);
    return {
      rows: [
        [1, 0, 0],
        [0, up, dy],
      ],
      toViewer: [0, dy, -up],
    };
  }
  return {
    rows: [
      [1, 0, dx],
      [0, 1, dy],
    ],
    toViewer: [dx, dy, -1],
  };
}

/** World point to screen point (y down), in world units, before fitting. */
export function projector(view: SolidView, sphere = false): (v: V3) => Pt {
  const { rows } = projectionOf(view, sphere);
  return (v) => [dot3(rows[0], v), -dot3(rows[1], v)];
}

/** HOUSE.circleSamples points of a horizontal circle, starting at +x. */
function ring(y: number, r: number): V3[] {
  const n = HOUSE.circleSamples;
  return Array.from({ length: n }, (_, i): V3 => {
    const t = (2 * Math.PI * i) / n;
    return [r * Math.cos(t), y, r * Math.sin(t)];
  });
}

/** Edges around a ring of `n` vertices starting at index `start`. */
const ringEdges = (start: number, n = HOUSE.circleSamples): [number, number][] =>
  Array.from({ length: n }, (_, i) => [start + i, start + ((i + 1) % n)]);

const ringFace = (start: number, n = HOUSE.circleSamples) =>
  Array.from({ length: n }, (_, i) => start + i);

const dim = (a: number, b: number, guide = false): SolidDim => ({ ends: [a, b], guide });

/** The stored 3D model of a solid part, in its own units. */
export function solidModel(part: SolidPart): SolidModel {
  const d = part.dims;
  const n = HOUSE.circleSamples;
  const base = { id: part.id, shape: part.shape };
  switch (part.shape) {
    case "prism": {
      // Vertex i has x, y, z set by bits 1, 2 and 4.
      const vertices = Array.from(
        { length: 8 },
        (_, i): V3 => [i & 1 ? d.length : 0, i & 2 ? d.height : 0, i & 4 ? d.width : 0]
      );
      const edges: [number, number][] = [];
      for (let i = 0; i < 8; i++)
        for (const bit of [1, 2, 4]) if (!(i & bit)) edges.push([i, i | bit]);
      const faces = [
        [0, 2, 6, 4],
        [1, 3, 7, 5],
        [0, 1, 5, 4],
        [2, 3, 7, 6],
        [0, 1, 3, 2],
        [4, 5, 7, 6],
      ];
      // Length along the front bottom, width receding at the bottom right,
      // height up the front left.
      const dims = { length: dim(0, 1), width: dim(1, 5), height: dim(0, 2) };
      return { ...base, vertices, edges, faces, dims };
    }
    case "cylinder": {
      const vertices = [...ring(0, d.radius), ...ring(d.height, d.radius), [0, d.height, 0] as V3];
      const sides = Array.from({ length: n }, (_, i) => [i, (i + 1) % n, n + ((i + 1) % n), n + i]);
      return {
        ...base,
        vertices,
        edges: [...ringEdges(0), ...ringEdges(n)],
        faces: [ringFace(0), ringFace(n), ...sides],
        // The radius runs across the top; the height label sits beside the right side.
        dims: { radius: dim(2 * n, n, true), height: dim(0, n) },
      };
    }
    case "cone": {
      const vertices = [...ring(0, d.radius), [0, 0, 0] as V3, [0, d.height, 0] as V3];
      const center = n;
      const apex = n + 1;
      const sides = Array.from({ length: n }, (_, i) => [apex, i, (i + 1) % n]);
      return {
        ...base,
        vertices,
        edges: ringEdges(0),
        faces: [ringFace(0), ...sides],
        dims: { radius: dim(center, 0, true), height: dim(apex, center, true) },
      };
    }
    case "pyramid": {
      const { baseLength: l, baseWidth: w, height: h } = d;
      const vertices: V3[] = [
        [0, 0, 0],
        [l, 0, 0],
        [l, 0, w],
        [0, 0, w],
        [l / 2, h, w / 2],
        [l / 2, 0, w / 2],
      ];
      const edges: [number, number][] = [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
        [0, 4],
        [1, 4],
        [2, 4],
        [3, 4],
      ];
      const faces = [
        [0, 1, 2, 3],
        [0, 1, 4],
        [1, 2, 4],
        [2, 3, 4],
        [3, 0, 4],
      ];
      const dims = { baseLength: dim(0, 1), baseWidth: dim(1, 2), height: dim(4, 5, true) };
      return { ...base, vertices, edges, faces, dims };
    }
    case "sphere": {
      const r = d.radius;
      // North pole, SPHERE_BANDS - 1 rings of samples, south pole, center.
      const vertices: V3[] = [[0, r, 0]];
      for (let k = 1; k < SPHERE_BANDS; k++) {
        const phi = Math.PI / 2 - (Math.PI * k) / SPHERE_BANDS;
        vertices.push(...ring(r * Math.sin(phi), r * Math.cos(phi)));
      }
      const south = vertices.length;
      vertices.push([0, -r, 0]);
      const center = vertices.length;
      vertices.push([0, 0, 0]);
      const ringStart = (k: number) => 1 + (k - 1) * n;
      const faces: number[][] = [];
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        faces.push([0, ringStart(1) + i, ringStart(1) + j]);
        for (let k = 1; k < SPHERE_BANDS - 1; k++) {
          const a = ringStart(k);
          const b = ringStart(k + 1);
          faces.push([a + i, a + j, b + j, b + i]);
        }
        const last = ringStart(SPHERE_BANDS - 1);
        faces.push([south, last + j, last + i]);
      }
      const equator = ringStart(SPHERE_BANDS / 2);
      return {
        ...base,
        vertices,
        edges: ringEdges(equator),
        faces,
        dims: { radius: dim(center, equator, true) },
        sphere: { center, radius: r },
      };
    }
  }
}

/** Outward unit normals of the faces (Newell's method, flipped away from the inside). */
function outwardNormals(model: SolidModel): V3[] {
  const vs = model.vertices;
  const inside = vs
    .reduce<V3>((s, v) => [s[0] + v[0], s[1] + v[1], s[2] + v[2]], [0, 0, 0])
    .map((c) => c / vs.length) as V3;
  return model.faces.map((f) => {
    const n: V3 = [0, 0, 0];
    const c: V3 = [0, 0, 0];
    f.forEach((i, k) => {
      const a = vs[i];
      const b = vs[f[(k + 1) % f.length]];
      n[0] += (a[1] - b[1]) * (a[2] + b[2]);
      n[1] += (a[2] - b[2]) * (a[0] + b[0]);
      n[2] += (a[0] - b[0]) * (a[1] + b[1]);
      for (let q = 0; q < 3; q++) c[q] += a[q] / f.length;
    });
    const l = Math.hypot(...n) || 1;
    const u: V3 = [n[0] / l, n[1] / l, n[2] / l];
    return dot3(u, sub3(c, inside)) < 0 ? [-u[0], -u[1], -u[2]] : u;
  });
}

const edgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

type Stroke = { a: number; b: number; hidden: boolean; partId?: string };

/** Join strokes into polylines, breaking wherever more or fewer than two meet. */
function chains(strokes: Stroke[]): number[][] {
  const at = new Map<number, number[]>();
  strokes.forEach((s, i) => {
    for (const v of [s.a, s.b]) at.set(v, [...(at.get(v) ?? []), i]);
  });
  const used = strokes.map(() => false);
  const walk = (start: number) => {
    const path = [start];
    let cur = start;
    for (;;) {
      const next = at.get(cur)!.find((i) => !used[i]);
      if (next === undefined) break;
      used[next] = true;
      cur = strokes[next].a === cur ? strokes[next].b : strokes[next].a;
      path.push(cur);
      if (at.get(cur)!.length !== 2) break;
    }
    return path;
  };
  const out: number[][] = [];
  for (const [v, list] of at) {
    if (list.length !== 2) while (list.some((i) => !used[i])) out.push(walk(v));
  }
  strokes.forEach((s, i) => {
    if (!used[i]) out.push(walk(s.a));
  });
  return out;
}

function polyline(pts: Pt[], close: boolean): string {
  const body = pts.map(([x, y], i) => `${i ? "L" : "M"}${fmt(x)} ${fmt(y)}`).join(" ");
  return close ? `${body} Z` : body;
}

type Placed = {
  place: (v: V3) => Pt;
  /** The sphere's outline on screen, when the model is a sphere. */
  outline: Pt[] | null;
};

function placement(model: SolidModel, view: SolidView, fit: Fit): Placed {
  const proj = projector(view, !!model.sphere);
  const place = (v: V3): Pt => {
    const [x, y] = proj(v);
    return [fit.x + fit.scale * x, fit.y + fit.scale * y];
  };
  if (!model.sphere) return { place, outline: null };
  // A parallel orthographic view scales every length by the length of its rows.
  const [row] = projectionOf(view, true).rows;
  const r = fit.scale * model.sphere.radius * Math.hypot(...row);
  const [cx, cy] = place(model.vertices[model.sphere.center]);
  const n = HOUSE.circleSamples;
  const outline = Array.from({ length: n }, (_, i): Pt => {
    const t = (2 * Math.PI * i) / n;
    return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
  });
  return { place, outline };
}

const SHAPE_NAMES: Record<SolidShape, string> = {
  prism: "Rectangular prism",
  cylinder: "Right circular cylinder",
  cone: "Right circular cone",
  pyramid: "Rectangular pyramid",
  sphere: "Sphere",
};

/** "Right circular cylinder, radius r, height 10." from the shape and its labels. */
function describe(model: SolidModel, labeled: Map<string, string>, notToScale = false): string {
  const out = [SHAPE_NAMES[model.shape]];
  for (const [d, text] of labeled)
    out.push(`${d.replace(/[A-Z]/g, (c) => ` ${c.toLowerCase()}`)} ${text}`);
  if (notToScale) out.push("not drawn to scale");
  return `${out.join(", ")}.`;
}

/**
 * Draw a model in a view. Without `fit` the drawing is in world units with
 * the world origin at (0, 0), y down. `guides` names the labeled dimensions
 * whose inner lines are drawn.
 */
export function project(
  model: SolidModel,
  view: SolidView,
  options: { fit?: Fit; guides?: string[] } = {}
): Scene {
  const fit = options.fit ?? { scale: 1, x: 0, y: 0 };
  const { place, outline } = placement(model, view, fit);
  const { toViewer } = projectionOf(view, !!model.sphere);
  const normals = outwardNormals(model);
  const front = normals.map((n) => dot3(n, toViewer) > EPS);

  const beside = new Map<string, number[]>();
  model.faces.forEach((f, fi) => {
    f.forEach((v, k) => {
      const key = edgeKey(v, f[(k + 1) % f.length]);
      beside.set(key, [...(beside.get(key) ?? []), fi]);
    });
  });
  const dimByEdge = new Map<string, string>();
  for (const [name, d] of Object.entries(model.dims)) {
    if (!d.guide) dimByEdge.set(edgeKey(...d.ends), name);
  }
  const tag = (a: number, b: number) => {
    const name = dimByEdge.get(edgeKey(a, b));
    return name ? `${model.id}.${name}` : undefined;
  };

  const strokes: Stroke[] = [];
  const hard = new Set<string>();
  for (const [a, b] of model.edges) {
    const key = edgeKey(a, b);
    hard.add(key);
    const hidden = !(beside.get(key) ?? []).some((f) => front[f]);
    strokes.push({ a, b, hidden, partId: tag(a, b) });
  }
  if (!model.sphere) {
    // The outline of a curved side: where a visible face meets a hidden one.
    for (const [key, fs] of beside) {
      if (hard.has(key) || fs.length !== 2 || front[fs[0]] === front[fs[1]]) continue;
      const [a, b] = key.split("-").map(Number);
      strokes.push({ a, b, hidden: false, partId: tag(a, b) });
    }
  }
  const size = Math.max(...model.vertices.map((v) => Math.hypot(...v)), 1);
  for (const name of options.guides ?? []) {
    const d = model.dims[name];
    if (!d?.guide) continue;
    const [a, b] = d.ends;
    // On a face when both ends lie in its plane (the solids are convex).
    const face = model.faces.findIndex((f, fi) =>
      [a, b].every(
        (v) =>
          Math.abs(dot3(normals[fi], sub3(model.vertices[v], model.vertices[f[0]]))) < EPS * size
      )
    );
    strokes.push({ a, b, hidden: face < 0 || !front[face], partId: `${model.id}.${name}` });
  }

  const items: SceneItem[] = [];
  const emit = (pts: Pt[], close: boolean, hidden: boolean, partId: string) =>
    items.push({
      t: "path",
      d: polyline(pts, close),
      role: "ink",
      weight: hidden ? "dashed" : "line",
      partId,
    });
  // Dashed lines first, so solid lines draw over them where they cross.
  for (const hidden of [true, false]) {
    const group = strokes.filter((s) => s.hidden === hidden);
    for (const s of group.filter((g) => g.partId)) {
      emit([place(model.vertices[s.a]), place(model.vertices[s.b])], false, hidden, s.partId!);
    }
    for (const path of chains(group.filter((g) => !g.partId))) {
      const close = path.length > 2 && path[0] === path[path.length - 1];
      const pts = (close ? path.slice(0, -1) : path).map((i) => place(model.vertices[i]));
      emit(pts, close, hidden, model.id);
    }
    if (!hidden && outline) emit(outline, true, false, model.id);
  }

  const pts = [...model.vertices.map(place), ...(outline ?? [])];
  const width = Math.max(0, ...pts.map((p) => p[0])) - Math.min(0, ...pts.map((p) => p[0]));
  const height = Math.max(0, ...pts.map((p) => p[1])) - Math.min(0, ...pts.map((p) => p[1]));
  return { width, height, items, issues: [], description: describe(model, new Map()) };
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
  for (const m of spec.marks) {
    issues.push({ code: "clipped", detail: `${m.kind} marks are not drawn on 3D solids` });
  }

  const view: SolidView = part.view ?? "oblique";
  const model = solidModel(part);
  const labeled = new Map<string, string>();
  for (const l of spec.labels) {
    const name = l.on.startsWith(`${part.id}.`) ? l.on.slice(part.id.length + 1) : "";
    if (model.dims[name] && !labeled.has(name)) labeled.set(name, l.text);
    else {
      issues.push({
        code: "missing_label",
        partId: l.on,
        detail: `label "${l.text}" must name one dimension of the solid, like "${part.id}.${need[0]}"`,
      });
    }
  }
  const guides = [...labeled.keys()];

  // Layout: the box less the margin, room for labels around the solid, and the note band.
  const font = HOUSE.font;
  const note = spec.notToScale ? noteLines(box.width) : [];
  const noteBand = note.length ? note.length * 1.25 * font + HOUSE.labelOffset : 0;
  const widest = Math.max(0, ...[...labeled.values()].map(textWidth));
  const roomX = labeled.size ? HOUSE.labelOffset + widest : 0;
  const roomY = labeled.size ? HOUSE.labelOffset + 1.25 * font : 0;
  const availW = Math.max(1, box.width - 2 * (HOUSE.margin + roomX));
  const availH = Math.max(1, box.height - noteBand - 2 * (HOUSE.margin + roomY));
  const raw = placement(model, view, { scale: 1, x: 0, y: 0 });
  const rawPts = [...model.vertices.map(raw.place), ...(raw.outline ?? [])];
  const xs = rawPts.map((p) => p[0]);
  const ys = rawPts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const fitScale = Math.min(availW / Math.max(x1 - x0, EPS), availH / Math.max(y1 - y0, EPS));
  // A shared scale (figure choices) maps world units to px the same for every figure in a set.
  const scale = opts.scale ?? fitScale;
  const fit: Fit = {
    scale,
    x: box.width / 2 - (scale * (x0 + x1)) / 2,
    y: (box.height - noteBand) / 2 - (scale * (y0 + y1)) / 2,
  };

  const drawn = project(model, view, { fit, guides });
  const items = [...drawn.items];
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

  // Each label sits beside the middle of its dimension, on the side away from the solid.
  const { place } = placement(model, view, fit);
  const middle: Pt = [box.width / 2, (box.height - noteBand) / 2];
  const drawnEdges = new Set(model.edges.map(([a, b]) => edgeKey(a, b)));
  const right = Math.max(...model.vertices.map((v) => place(v)[0]));
  const fallback = new Map<string, PendingLabel>();
  const pending: PendingLabel[] = [...labeled].map(([name, text]) => {
    const d = model.dims[name];
    const partId = `${part.id}.${name}`;
    let [a, b] = d.ends.map((i) => place(model.vertices[i]));
    // A dimension with no line of its own (a cylinder's height) labels the right side.
    if (!d.guide && !drawnEdges.has(edgeKey(...d.ends))) {
      const shift = right - Math.max(a[0], b[0]);
      a = [a[0] + shift, a[1]];
      b = [b[0] + shift, b[1]];
    }
    // If the middle is crowded (a sphere's radius between the equator's halves),
    // the label tries the line's outer end instead.
    const far = (p: Pt) => Math.hypot(p[0] - middle[0], p[1] - middle[1]);
    const end = far(a) > far(b) ? a : b;
    fallback.set(partId, {
      text,
      anchor: { x: end[0], y: end[1] },
      preferred: { dx: end[0] - middle[0], dy: end[1] - middle[1] },
      partId,
    });
    const anchor = { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 };
    const l = Math.hypot(a[1] - b[1], b[0] - a[0]) || 1;
    let n: Pt = [(a[1] - b[1]) / l, (b[0] - a[0]) / l];
    // A line through the middle (a cone's height) takes its label on the right.
    const away = n[0] * (anchor.x - middle[0]) + n[1] * (anchor.y - middle[1]);
    if (away < -INSIDE_PX || (Math.abs(away) <= INSIDE_PX && n[0] < 0)) n = [-n[0], -n[1]];
    return { text, anchor, preferred: { dx: n[0], dy: n[1] }, partId };
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
    description: describe(model, labeled, spec.notToScale),
    scale,
  };
}

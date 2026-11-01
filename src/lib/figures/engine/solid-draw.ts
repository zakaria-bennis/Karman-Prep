/**
 * Drawing a solid with a camera, in world units before fitting (y down).
 *
 * - Flat solids (prism, pyramid): a face is visible when its outward normal
 *   points at the viewer; an edge is solid when a face beside it is visible,
 *   dashed otherwise.
 * - Curved solids are drawn from their exact circles, not the sampled model:
 *   a cylinder's sides and a cone's sides are the silhouette lines, found
 *   where the side's normal turns away from the viewer, so they meet each
 *   ellipse at its true tangent point. Each circle is split there: the arc
 *   whose side faces the viewer (or whose cap does) is solid, the other
 *   dashed, so the dashed back of a cone's base runs between the two points
 *   where its sides touch it (2026-06_US_V3_MATH_M2_Q06). A sphere is its
 *   outline circle with the back of its equator dashed.
 * - Inner lines, as Bluebook draws them: a height runs dashed from the apex
 *   to the base center (2026-03_US_V1_MATH_M2_Q10); a radius runs solid from
 *   a dot at its center to the rim, even across a cone's base
 *   (2024-08_US_V5_MATH_M1_Q19, 2026-06_US_V3_MATH_M2_Q06).
 */
import type { Pt } from "./marks";
import {
  cameraMatrix,
  dot3,
  onCircle,
  projectWith,
  sub3,
  toViewer,
  type Camera,
  type V3,
} from "./solid-camera";
import {
  pointPosition,
  radiusCircle,
  RADIUS_ANGLE,
  solidModel,
  type SolidModel,
  type SolidPart,
} from "./solid-model";

const EPS = 1e-9;
/** Steps around a full circle when an exact circle is drawn as a polyline. */
const CIRCLE_STEPS = 192;

export type Stroke = { pts: Pt[]; close: boolean; hidden: boolean; partId: string };

/** How a dimension's label finds its place. */
export type DimLine = {
  ends: [Pt, Pt];
  /** edge: an outside edge; inner: a line through the solid; radius; beside: no line of its own. */
  kind: "edge" | "inner" | "radius" | "beside";
};

export type Drawing = {
  strokes: Stroke[];
  dots: { at: Pt; partId: string }[];
  dims: Record<string, DimLine>;
  /** Named points on screen, with the point they are labeled away from. */
  points: Record<string, { at: Pt; from: Pt }>;
  /** Every screen point the drawing covers, for fitting. */
  extent: Pt[];
  /** Screen geometry of the height's foot, for a right-angle mark. */
  foot?: { at: Pt; up: Pt; across: Pt[] };
};

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

type Edge = { a: number; b: number };

/** Join edges into polylines, breaking wherever more or fewer than two meet. */
function chains(edges: Edge[]): number[][] {
  const at = new Map<number, number[]>();
  edges.forEach((s, i) => {
    for (const v of [s.a, s.b]) at.set(v, [...(at.get(v) ?? []), i]);
  });
  const used = edges.map(() => false);
  const walk = (start: number) => {
    const path = [start];
    let cur = start;
    for (;;) {
      const next = at.get(cur)!.find((i) => !used[i]);
      if (next === undefined) break;
      used[next] = true;
      cur = edges[next].a === cur ? edges[next].b : edges[next].a;
      path.push(cur);
      if (at.get(cur)!.length !== 2) break;
    }
    return path;
  };
  const out: number[][] = [];
  for (const [v, list] of at) {
    if (list.length !== 2) while (list.some((i) => !used[i])) out.push(walk(v));
  }
  edges.forEach((s, i) => {
    if (!used[i]) out.push(walk(s.a));
  });
  return out;
}

/** Angles in [0, 2π) where a cos t + b sin t = c, sorted; none when it never holds. */
function solveTrig(a: number, b: number, c: number): number[] {
  const r = Math.hypot(a, b);
  if (r < EPS || Math.abs(c) >= r) return [];
  const phi = Math.atan2(b, a);
  const d = Math.acos(c / r);
  const wrap = (t: number) => ((t % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return [wrap(phi - d), wrap(phi + d)].sort((x, y) => x - y);
}

type Ctx = { part: SolidPart; m: ReturnType<typeof cameraMatrix>; place: (v: V3) => Pt };

/**
 * One level circle split at `cuts` into arcs, each solid when `visible` holds
 * at its middle. With no cuts the whole circle is one closed stroke.
 */
function circleStrokes(
  ctx: Ctx,
  center: V3,
  r: number,
  cuts: number[],
  visible: (t: number) => boolean
): Stroke[] {
  const arc = (t0: number, t1: number): Pt[] => {
    const n = Math.max(2, Math.ceil(((t1 - t0) / (2 * Math.PI)) * CIRCLE_STEPS));
    return Array.from({ length: n + 1 }, (_, i) =>
      ctx.place(onCircle(center, r, t0 + ((t1 - t0) * i) / n))
    );
  };
  const id = ctx.part.id;
  if (cuts.length === 0) {
    const pts = arc(0, 2 * Math.PI).slice(0, -1);
    return [{ pts, close: true, hidden: !visible(0), partId: id }];
  }
  return cuts.map((t0, i) => {
    const t1 = i + 1 < cuts.length ? cuts[i + 1] : cuts[0] + 2 * Math.PI;
    return { pts: arc(t0, t1), close: false, hidden: !visible((t0 + t1) / 2), partId: id };
  });
}

function flatStrokes(ctx: Ctx, model: SolidModel, dims: Record<string, DimLine>): Stroke[] {
  const tv = toViewer(ctx.m);
  const normals = outwardNormals(model);
  const front = normals.map((n) => dot3(n, tv) > EPS);
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
  const strokes: Stroke[] = [];
  const plain: Record<"true" | "false", Edge[]> = { true: [], false: [] };
  for (const [a, b] of model.edges) {
    const key = edgeKey(a, b);
    const hidden = !(beside.get(key) ?? []).some((f) => front[f]);
    const name = dimByEdge.get(key);
    const ends: [Pt, Pt] = [ctx.place(model.vertices[a]), ctx.place(model.vertices[b])];
    if (name) {
      dims[name] = { ends, kind: "edge" };
      strokes.push({ pts: ends, close: false, hidden, partId: `${model.id}.${name}` });
    } else plain[`${hidden}`].push({ a, b });
  }
  for (const hidden of [true, false]) {
    for (const path of chains(plain[`${hidden}`])) {
      const close = path.length > 2 && path[0] === path[path.length - 1];
      const pts = (close ? path.slice(0, -1) : path).map((i) => ctx.place(model.vertices[i]));
      strokes.push({ pts, close, hidden, partId: model.id });
    }
  }
  return strokes;
}

/** The outline, rims and side lines of a cylinder, cone or sphere. */
function curvedStrokes(ctx: Ctx, dims: Record<string, DimLine>): Stroke[] {
  const { part, m } = ctx;
  const tv = toViewer(m);
  const { radius: r = 0, height: h = 0 } = part.dims;
  const lateral = (t: number): V3 => [Math.cos(t), 0, Math.sin(t)];
  const sees = (n: V3) => dot3(n, tv) > EPS;
  const id = part.id;
  if (part.shape === "sphere") {
    // An orthographic view draws a sphere as a circle of its own radius.
    const c = ctx.place([0, 0, 0]);
    const k = Math.hypot(...m[0]);
    const outline = Array.from({ length: CIRCLE_STEPS }, (_, i): Pt => {
      const t = (2 * Math.PI * i) / CIRCLE_STEPS;
      return [c[0] + r * k * Math.cos(t), c[1] + r * k * Math.sin(t)];
    });
    const cuts = solveTrig(tv[0], tv[2], 0);
    return [
      { pts: outline, close: true, hidden: false, partId: id },
      ...circleStrokes(ctx, [0, 0, 0], r, cuts, (t) => sees(lateral(t))),
    ];
  }
  if (part.shape === "cylinder") {
    // Sides where the side's normal is edge-on: tangent to both ellipses at once.
    const cuts = solveTrig(tv[0], tv[2], 0);
    const sides = cuts.map((t): Stroke => {
      const pts: Pt[] = [
        ctx.place(onCircle([0, 0, 0], r, t)),
        ctx.place(onCircle([0, h, 0], r, t)),
      ];
      return { pts, close: false, hidden: false, partId: id };
    });
    // The height is labeled beside the side line farther right.
    const right = sides.reduce<Stroke | null>(
      (best, s) => (!best || s.pts[0][0] > best.pts[0][0] ? s : best),
      null
    );
    if (right) dims.height = { ends: [right.pts[0], right.pts[1]], kind: "beside" };
    return [
      ...circleStrokes(ctx, [0, 0, 0], r, cuts, (t) => sees([0, -1, 0]) || sees(lateral(t))),
      ...circleStrokes(ctx, [0, h, 0], r, cuts, (t) => sees([0, 1, 0]) || sees(lateral(t))),
      ...sides,
    ];
  }
  // Cone: its side's outward normal at angle t is (h cos t, r, h sin t).
  const normal = (t: number): V3 => [h * Math.cos(t), r, h * Math.sin(t)];
  const cuts = solveTrig(h * tv[0], h * tv[2], -r * tv[1]);
  const apex = ctx.place([0, h, 0]);
  const sides = cuts.map(
    (t): Stroke => ({
      pts: [apex, ctx.place(onCircle([0, 0, 0], r, t))],
      close: false,
      hidden: false,
      partId: id,
    })
  );
  const base = circleStrokes(ctx, [0, 0, 0], r, cuts, (t) => sees([0, -1, 0]) || sees(normal(t)));
  return [...base, ...sides];
}

/**
 * Draw a solid part with a camera. `lines` names the inner lines to draw
 * (labeled or shown dimensions).
 */
export function drawSolid(part: SolidPart, camera: Camera, lines: Set<string>): Drawing {
  const m = cameraMatrix(camera);
  const place = projectWith(m);
  const ctx: Ctx = { part, m, place };
  const model = solidModel(part);
  const dims: Record<string, DimLine> = {};
  const curved = part.shape === "cylinder" || part.shape === "cone" || part.shape === "sphere";
  const strokes = curved ? curvedStrokes(ctx, dims) : flatStrokes(ctx, model, dims);
  const dots: Drawing["dots"] = [];
  let foot: Drawing["foot"];

  const apexPos = pointPosition(part, "apex");
  const centerPos = pointPosition(part, "center");
  if ("height" in model.dims && model.dims.height.guide) {
    const ends: [Pt, Pt] = [place(apexPos), place(centerPos)];
    dims.height = { ends, kind: "inner" };
    if (lines.has("height")) {
      strokes.push({ pts: ends, close: false, hidden: true, partId: `${part.id}.height` });
    }
    // Directions along the base from the foot, for a right-angle mark: the
    // base edges of a pyramid, every level direction of a cone.
    const dirs: V3[] =
      part.shape === "pyramid"
        ? [
            [1, 0, 0],
            [-1, 0, 0],
            [0, 0, 1],
            [0, 0, -1],
          ]
        : Array.from({ length: 24 }, (_, i) => onCircle([0, 0, 0], 1, (Math.PI * i) / 12));
    const at = ends[1];
    const screen = (v: V3): Pt => {
      const q = place(v);
      const o = place([0, 0, 0]);
      return [q[0] - o[0], q[1] - o[1]];
    };
    foot = { at, up: screen([0, 1, 0]), across: dirs.map(screen) };
  }
  if ("radius" in model.dims) {
    const { center, r } = radiusCircle(part);
    const angle = ((part.radiusAngle ?? RADIUS_ANGLE[part.shape] ?? 0) * Math.PI) / 180;
    const ends: [Pt, Pt] = [place(center), place(onCircle(center, r, angle))];
    dims.radius = { ends, kind: "radius" };
    if (lines.has("radius")) {
      strokes.push({ pts: ends, close: false, hidden: false, partId: `${part.id}.radius` });
      dots.push({ at: ends[0], partId: `${part.id}.radius` });
    }
  }

  const points: Drawing["points"] = {};
  const middle = place(centerPos);
  for (const p of part.points ?? []) {
    const at = place(pointPosition(part, p.at, p.angle));
    // Where its label goes: a rim point's straight out from its circle as if
    // seen from above (front points below, 2025-08_US_V1_MATH_M2_Q18's B; side
    // points beside, 2026-06_US_V3_MATH_M2_Q06's P), an apex's away from the
    // base, a center's below to the right (O there).
    const t = ((p.angle ?? 0) * Math.PI) / 180;
    const out: Pt =
      p.at === "rim" || p.at === "topRim"
        ? [Math.cos(t), -Math.sin(t)]
        : p.at === "apex"
          ? [at[0] - middle[0], at[1] - middle[1]]
          : [1, 1];
    points[p.id] = { at, from: [at[0] - out[0], at[1] - out[1]] };
    if (p.dot !== false) dots.push({ at, partId: `${part.id}.${p.id}` });
  }

  const extent = strokes.flatMap((s) => s.pts);
  return { strokes, dots, dims, points, extent, foot };
}

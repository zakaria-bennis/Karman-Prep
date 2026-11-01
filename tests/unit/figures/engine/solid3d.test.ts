import { describe, expect, it } from "vitest";
import { HOUSE } from "@/lib/figures/engine/house";
import { textBox } from "@/lib/figures/engine/labels";
import type { SceneItem } from "@/lib/figures/engine/scene";
import {
  buildSolid3d,
  project,
  projector,
  solidModel,
  type SolidModel,
  type V3,
} from "@/lib/figures/engine/solid3d";
import {
  FIGURE_SPEC_VERSION,
  parseFigureSpec,
  type FigureSpec,
  type Label,
  type Part,
} from "@/lib/figures/engine/spec";

const BOX = { width: 400, height: 300 };

type SolidPart = Extract<Part, { kind: "solid" }>;
type PathItem = Extract<SceneItem, { t: "path" }>;
type TextItem = Extract<SceneItem, { t: "text" }>;
type P2 = [number, number];

const solid = (
  id: string,
  shape: SolidPart["shape"],
  dims: Record<string, number>,
  view?: SolidPart["view"]
): SolidPart => ({ kind: "solid", id, shape, dims, ...(view ? { view } : {}) });

const spec3d = (part: SolidPart, labels: Label[] = []): FigureSpec => ({
  version: FIGURE_SPEC_VERSION,
  type: "solid3d",
  parts: [part],
  labels,
  marks: [],
});

const paths = (items: SceneItem[]) => items.filter((i): i is PathItem => i.t === "path");
const texts = (items: SceneItem[]) => items.filter((i): i is TextItem => i.t === "text");

/** The vertices of an M/L/Z path, in order. */
function pointsOf(d: string): P2[] {
  const nums = (d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
  const out: P2[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) out.push([nums[i], nums[i + 1]]);
  return out;
}

/** Number of line segments a polyline path draws (a Z adds the closing one). */
function segmentCount(d: string): number {
  const n = pointsOf(d).length;
  return n - 1 + (/Z\s*$/.test(d) ? 1 : 0);
}

/** Index of the model vertex that projects to `p` (project() works in world units). */
function vertexAt(model: SolidModel, view: "oblique" | "isometric", p: P2): number {
  const proj = projector(view);
  let best = -1;
  let bestD = Infinity;
  model.vertices.forEach((v, i) => {
    const q = proj(v);
    const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  expect(bestD).toBeLessThan(0.01);
  return best;
}

function distToSegment(p: P2, a: P2, b: P2): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(
    0,
    Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy))
  );
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

const angleDeg = (u: P2, v: P2) =>
  (Math.acos((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v))) * 180) / Math.PI;

describe("solidModel", () => {
  it("stores a prism as 8 vertices, 12 edges and 6 faces", () => {
    const m = solidModel(solid("box", "prism", { length: 5, width: 3, height: 4 }));
    expect(m.vertices).toHaveLength(8);
    expect(m.edges).toHaveLength(12);
    expect(m.faces).toHaveLength(6);
  });

  it("samples 64 points around each circle of a curved solid", () => {
    const ring = (m: SolidModel, y: number, r: number) =>
      m.vertices.filter(
        (v) => Math.abs(v[1] - y) < 1e-9 && Math.abs(Math.hypot(v[0], v[2]) - r) < 1e-9
      );
    const cyl = solidModel(solid("c", "cylinder", { radius: 2, height: 5 }));
    expect(ring(cyl, 0, 2)).toHaveLength(64);
    expect(ring(cyl, 5, 2)).toHaveLength(64);
    const cone = solidModel(solid("k", "cone", { radius: 3, height: 4 }));
    expect(ring(cone, 0, 3)).toHaveLength(64);
    const ball = solidModel(solid("s", "sphere", { radius: 2 }));
    expect(ring(ball, 0, 2)).toHaveLength(64);
    // Every meridian of the sphere is a 64-point circle too: 32 bands pole to pole.
    const meridian = ball.vertices.filter(
      (v) => Math.abs(v[2]) < 1e-9 && Math.abs(Math.hypot(v[0], v[1]) - 2) < 1e-9
    );
    expect(meridian).toHaveLength(64);
  });
});

describe("buildSolid3d", () => {
  it("rectangular prism has 12 edges and exactly 3 dashed in oblique view", () => {
    const part = solid("box", "prism", { length: 5, width: 3, height: 4 });
    expect(solidModel(part).edges).toHaveLength(12);
    const scene = buildSolid3d(spec3d(part), BOX);
    const drawn = paths(scene.items);
    const total = drawn.reduce((n, p) => n + segmentCount(p.d), 0);
    const dashed = drawn
      .filter((p) => p.weight === "dashed")
      .reduce((n, p) => n + segmentCount(p.d), 0);
    expect(total).toBe(12);
    expect(dashed).toBe(3);
    expect(scene.issues).toEqual([]);

    // The three dashed edges meet at the hidden back-bottom-left corner.
    const model = solidModel(part);
    const raw = project(model, "oblique");
    const hidden = new Set(
      paths(raw.items)
        .filter((p) => p.weight === "dashed")
        .flatMap((p) => pointsOf(p.d).map((q) => vertexAt(model, "oblique", q)))
    );
    const corner = model.vertices.findIndex((v) => v[0] === 0 && v[1] === 0 && v[2] === 3);
    expect(hidden.has(corner)).toBe(true);
    expect(hidden.size).toBe(4);
  });

  it("cylinder draws two ellipses, with the back half of the bottom ellipse dashed", () => {
    const part = solid("can", "cylinder", { radius: 2, height: 5 });
    const model = solidModel(part);
    const raw = project(model, "oblique");
    const isRing = (y: number) => (i: number) => {
      const v = model.vertices[i];
      return Math.abs(v[1] - y) < 1e-9 && Math.abs(Math.hypot(v[0], v[2]) - 2) < 1e-9;
    };
    const solidVerts = new Set<number>();
    const dashedVerts = new Set<number>();
    for (const p of paths(raw.items)) {
      const ids = pointsOf(p.d).map((q) => vertexAt(model, "oblique", q));
      for (const i of ids) (p.weight === "dashed" ? dashedVerts : solidVerts).add(i);
    }
    const all = new Set([...solidVerts, ...dashedVerts]);
    const top = [...all].filter(isRing(5));
    const bottom = [...all].filter(isRing(0));
    // Two full ellipses of 64 points each.
    expect(top).toHaveLength(64);
    expect(bottom).toHaveLength(64);
    // The top ellipse is fully solid.
    expect([...dashedVerts].filter(isRing(5))).toHaveLength(0);
    // Only bottom-ring vertices are dashed, about half of them, and they are the back half.
    const back = [...dashedVerts];
    expect(back.every(isRing(0))).toBe(true);
    expect(back.length).toBeGreaterThanOrEqual(32);
    expect(back.length).toBeLessThanOrEqual(34);
    const meanZ = back.reduce((s, i) => s + model.vertices[i][2], 0) / back.length;
    expect(meanZ).toBeGreaterThan(1);
    // The front half of the bottom ellipse is drawn solid.
    const front = [...solidVerts].filter(isRing(0));
    expect(front.length).toBeGreaterThanOrEqual(31);
    expect(front.every((i) => model.vertices[i][2] < 1.5)).toBe(true);
  });

  it("cone apex above the base center", () => {
    const part = solid("k", "cone", { radius: 3, height: 4 });
    const model = solidModel(part);
    const apex = model.vertices.findIndex((v) => v[1] === 4);
    expect(model.vertices[apex]).toEqual([0, 4, 0]);
    const base = model.vertices.filter((v) => v[1] === 0 && Math.hypot(v[0], v[2]) > 0);
    const c = base.reduce<V3>((s, v) => [s[0] + v[0], s[1] + v[1], s[2] + v[2]], [0, 0, 0]);
    expect(c[0] / base.length).toBeCloseTo(0, 9);
    expect(c[2] / base.length).toBeCloseTo(0, 9);

    // Drawn: the topmost point of the figure sits straight above the base ellipse's center.
    const scene = buildSolid3d(spec3d(part), BOX);
    const pts = paths(scene.items).flatMap((p) => pointsOf(p.d));
    const top = pts.reduce((a, b) => (b[1] < a[1] ? b : a));
    const maxY = Math.max(...pts.map((p) => p[1]));
    const rim = pts.filter((p) => p[1] > top[1] + 1);
    const xs = rim.map((p) => p[0]);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    // The base ellipse's center is the midpoint of its left and right extremes.
    expect(top[0]).toBeCloseTo(centerX, 0);
    expect(top[1]).toBeLessThan(maxY);
    expect(scene.issues).toEqual([]);
  });

  it("labels for dims attach to the matching edge", () => {
    const part = solid("box", "prism", { length: 6, width: 3, height: 4 });
    const labels: Label[] = [
      { text: "6", on: "box.length" },
      { text: "3", on: "box.width" },
      { text: "4", on: "box.height" },
    ];
    const scene = buildSolid3d(spec3d(part, labels), BOX);
    expect(scene.issues).toEqual([]);
    const dims = ["length", "width", "height"];
    const edgeOf = (dim: string) => {
      const p = paths(scene.items).find((q) => q.partId === `box.${dim}`);
      expect(p, dim).toBeDefined();
      const [a, b] = pointsOf(p!.d);
      return [a, b] as [P2, P2];
    };
    for (const dim of dims) {
      const t = texts(scene.items).find((q) => q.partId === `box.${dim}`);
      expect(t, dim).toBeDefined();
      const [l, r, top, bottom] = textBox(t!);
      const center: P2 = [(l + r) / 2, (top + bottom) / 2];
      const own = distToSegment(center, ...edgeOf(dim));
      // Near its own edge, and nearer to it than to the other dimension edges.
      expect(own).toBeLessThan(HOUSE.labelOffset * 3 + HOUSE.font * 1.5);
      for (const other of dims.filter((d) => d !== dim)) {
        expect(own).toBeLessThan(distToSegment(center, ...edgeOf(other)));
      }
      // Inside the box.
      expect(l).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(BOX.width);
    }
  });

  it("isometric view keeps the three axes at 120°", () => {
    const proj = projector("isometric");
    const o = proj([1, 1, 0]);
    // From the corner nearest the viewer, the three edges run to -x, -y and +z.
    const dirs = (
      [
        [0, 1, 0],
        [1, 0, 0],
        [1, 1, 1],
      ] as V3[]
    ).map((v): P2 => {
      const q = proj(v);
      return [q[0] - o[0], q[1] - o[1]];
    });
    expect(angleDeg(dirs[0], dirs[1])).toBeCloseTo(120, 6);
    expect(angleDeg(dirs[1], dirs[2])).toBeCloseTo(120, 6);
    expect(angleDeg(dirs[0], dirs[2])).toBeCloseTo(120, 6);
    // Equal foreshortening on every axis.
    const lens = dirs.map((d) => Math.hypot(...d));
    expect(lens[1]).toBeCloseTo(lens[0], 9);
    expect(lens[2]).toBeCloseTo(lens[0], 9);

    // An isometric cube still hides exactly three edges.
    const cube = solid("cube", "prism", { length: 2, width: 2, height: 2 }, "isometric");
    const dashed = paths(buildSolid3d(spec3d(cube), BOX).items)
      .filter((p) => p.weight === "dashed")
      .reduce((n, p) => n + segmentCount(p.d), 0);
    expect(dashed).toBe(3);
  });

  it("fits the solid inside the box less the margin, centered", () => {
    for (const part of [
      solid("box", "prism", { length: 5, width: 3, height: 4 }),
      solid("c", "cylinder", { radius: 2, height: 5 }),
      solid("k", "cone", { radius: 3, height: 4 }),
      solid("p", "pyramid", { baseLength: 4, baseWidth: 4, height: 5 }),
      solid("s", "sphere", { radius: 3 }),
    ]) {
      const scene = buildSolid3d(spec3d(part), BOX);
      const pts = paths(scene.items).flatMap((p) => pointsOf(p.d));
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      expect(x0, part.shape).toBeGreaterThanOrEqual(HOUSE.margin - 0.01);
      expect(x1, part.shape).toBeLessThanOrEqual(BOX.width - HOUSE.margin + 0.01);
      expect(y0, part.shape).toBeGreaterThanOrEqual(HOUSE.margin - 0.01);
      expect(y1, part.shape).toBeLessThanOrEqual(BOX.height - HOUSE.margin + 0.01);
      expect((x0 + x1) / 2, part.shape).toBeCloseTo(BOX.width / 2, 0);
      expect((y0 + y1) / 2, part.shape).toBeCloseTo(BOX.height / 2, 0);
      expect(scene.issues, part.shape).toEqual([]);
      expect(scene.items.every((i) => i.t !== "path" || i.role === "ink")).toBe(true);
    }
  });

  it("draws a sphere as a circle with the back half of its equator dashed", () => {
    const part = solid("s", "sphere", { radius: 3 });
    const scene = buildSolid3d(spec3d(part), BOX);
    const dashed = paths(scene.items).filter((p) => p.weight === "dashed");
    expect(dashed.length).toBeGreaterThan(0);
    expect(scene.description).toBe("Sphere.");
  });

  it("places a sphere's radius label even where the equator crowds the radius", () => {
    for (const box of [BOX, { width: 300, height: 240 }, { width: 240, height: 200 }]) {
      const part = solid("s", "sphere", { radius: 3 });
      const scene = buildSolid3d(spec3d(part, [{ text: "r", on: "s.radius" }]), box);
      expect(scene.issues, `${box.width}`).toEqual([]);
      expect(texts(scene.items).map((t) => t.partId)).toEqual(["s.radius"]);
      // The radius is drawn as a dashed guide because a label names it.
      expect(paths(scene.items).find((p) => p.partId === "s.radius")?.weight).toBe("dashed");
    }
  });

  it("reports a label that names no dimension instead of drawing it", () => {
    const part = solid("box", "prism", { length: 5, width: 3, height: 4 });
    const scene = buildSolid3d(spec3d(part, [{ text: "x", on: "box" }]), BOX);
    expect(scene.issues.map((i) => i.code)).toEqual(["missing_label"]);
    expect(texts(scene.items)).toHaveLength(0);
  });
});

describe("solid dims in the spec", () => {
  const base = (part: unknown, labels: Label[] = []) => ({
    version: FIGURE_SPEC_VERSION,
    type: "solid3d",
    parts: [part],
    labels,
    marks: [],
  });

  it("accepts the SAT dimension names and a dimension label", () => {
    const r = parseFigureSpec(
      base(solid("c", "cylinder", { radius: 2, height: 5 }), [{ text: "r", on: "c.radius" }])
    );
    expect(r.ok).toBe(true);
  });

  it("rejects missing, unknown or non-positive dims, unknown views and unknown dimension labels", () => {
    const bad = [
      base(solid("c", "cylinder", { radius: 2 })),
      base(solid("c", "cylinder", { radius: 2, height: 5, depth: 1 })),
      base(solid("c", "cylinder", { radius: -2, height: 5 })),
      base({ kind: "solid", id: "c", shape: "sphere", dims: { radius: 1 }, view: "top" }),
      base(solid("c", "sphere", { radius: 2 }), [{ text: "h", on: "c.height" }]),
    ];
    for (const input of bad) expect(parseFigureSpec(input).ok).toBe(false);
  });
});

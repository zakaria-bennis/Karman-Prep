import { describe, expect, it } from "vitest";
import { HOUSE } from "@/lib/figures/engine/house";
import { textBox } from "@/lib/figures/engine/labels";
import type { SceneItem } from "@/lib/figures/engine/scene";
import {
  BLUEBOOK_VIEW,
  CIRCLE_FLATTENING,
  cameraFor,
  cameraMatrix,
  dot3,
  projector,
  type Camera,
  type V3,
} from "@/lib/figures/engine/solid-camera";
import { solidModel, type SolidModel, type SolidPart } from "@/lib/figures/engine/solid-model";
import { buildSolid3d, project } from "@/lib/figures/engine/solid3d";
import {
  FIGURE_SPEC_VERSION,
  parseFigureSpec,
  type FigureSpec,
  type Label,
  type Mark,
} from "@/lib/figures/engine/spec";

const BOX = { width: 400, height: 300 };
/** Large enough that the scene's 0.01 px rounding is far below every tolerance here. */
const BIG = 10000;

type PathItem = Extract<SceneItem, { t: "path" }>;
type TextItem = Extract<SceneItem, { t: "text" }>;
type P2 = [number, number];

const solid = (
  id: string,
  shape: SolidPart["shape"],
  dims: Record<string, number>,
  extra: Partial<SolidPart> = {}
): SolidPart => ({ kind: "solid", id, shape, dims, ...extra });

const spec3d = (part: SolidPart, labels: Label[] = [], marks: Mark[] = []): FigureSpec => ({
  version: FIGURE_SPEC_VERSION,
  type: "solid3d",
  parts: [part],
  labels,
  marks,
});

const paths = (items: SceneItem[]) => items.filter((i): i is PathItem => i.t === "path");
const texts = (items: SceneItem[]) => items.filter((i): i is TextItem => i.t === "text");
const lines = (items: SceneItem[]) => paths(items).filter((p) => !p.fill);

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
  (Math.acos(
    Math.min(1, Math.abs(u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v)))
  ) *
    180) /
  Math.PI;

const near = (a: P2, b: P2) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/**
 * A level circle seen by `camera`, drawn at BIG px per unit, worked out here
 * from the projector alone (not from the engine's drawing code).
 */
function screenCircle(camera: Camera, center: V3, r: number) {
  const proj = projector(camera);
  const at = (t: number): P2 => {
    const q = proj([center[0] + r * Math.cos(t), center[1], center[2] + r * Math.sin(t)]);
    return [BIG * q[0], BIG * q[1]];
  };
  const tangent = (t: number): P2 => {
    const h = 1e-6;
    const a = at(t - h);
    const b = at(t + h);
    return [b[0] - a[0], b[1] - a[1]];
  };
  /** The circle's angle nearest a screen point, and how far the point is from the circle. */
  const nearest = (p: P2) => {
    let best = { t: 0, d: Infinity };
    for (let i = 0; i < 3600; i++) {
      const t = (2 * Math.PI * i) / 3600;
      const d = near(at(t), p);
      if (d < best.d) best = { t, d };
    }
    // Refine by bisection on the distance.
    let [lo, hi] = [best.t - 0.002, best.t + 0.002];
    for (let k = 0; k < 60; k++) {
      const m1 = lo + (hi - lo) / 3;
      const m2 = hi - (hi - lo) / 3;
      if (near(at(m1), p) < near(at(m2), p)) hi = m2;
      else lo = m1;
    }
    const t = (lo + hi) / 2;
    return { t, d: near(at(t), p) };
  };
  return { at, tangent, nearest };
}

const raw = (part: SolidPart, camera: Camera, lineNames: string[] = []) =>
  project(part, { camera, fit: { scale: BIG, x: 0, y: 0 }, lines: lineNames });

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
    const meridian = ball.vertices.filter(
      (v) => Math.abs(v[2]) < 1e-9 && Math.abs(Math.hypot(v[0], v[1]) - 2) < 1e-9
    );
    expect(meridian).toHaveLength(64);
  });
});

describe("the Bluebook camera", () => {
  it("flattens a curved solid's circles to 1/3 by default, long axis level", () => {
    const cam = cameraFor("cylinder");
    const c = screenCircle(cam, [0, 0, 0], 1);
    const right = c.at(0);
    const back = c.at(Math.PI / 2);
    const front = c.at((3 * Math.PI) / 2);
    expect(right[1]).toBeCloseTo(0, 6);
    expect((front[1] - back[1]) / 2 / right[0]).toBeCloseTo(CIRCLE_FLATTENING, 9);
  });

  it("is a true orthographic view: its rows are orthonormal", () => {
    for (const cam of Object.values(BLUEBOOK_VIEW)) {
      const m = cameraMatrix(cam);
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) expect(dot3(m[i], m[j])).toBeCloseTo(i === j ? 1 : 0, 12);
    }
  });

  it("turn 45 and tilt 35.26 is the isometric view: axes at 120°, equal lengths", () => {
    const proj = projector({
      turn: 45,
      tilt: (Math.atan(1 / Math.SQRT2) * 180) / Math.PI,
      lean: 0,
    });
    const o = proj([0, 0, 0]);
    const dirs = (
      [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, -1],
      ] as V3[]
    ).map((v): P2 => {
      const q = proj(v);
      return [q[0] - o[0], q[1] - o[1]];
    });
    const full = (u: P2, v: P2) =>
      (Math.acos((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v))) * 180) /
      Math.PI;
    expect(full(dirs[0], dirs[1])).toBeCloseTo(120, 6);
    expect(full(dirs[1], dirs[2])).toBeCloseTo(120, 6);
    expect(full(dirs[0], dirs[2])).toBeCloseTo(120, 6);
    const lens = dirs.map((d) => Math.hypot(...d));
    expect(lens[1]).toBeCloseTo(lens[0], 9);
    expect(lens[2]).toBeCloseTo(lens[0], 9);
  });

  it("sees a squat pyramid from lower, so its apex stays above the back corner", () => {
    expect(
      cameraFor("pyramid", undefined, { baseLength: 9.75, baseWidth: 5.7, height: 18 })
    ).toEqual(BLUEBOOK_VIEW.pyramid);
    const squat = cameraFor("pyramid", undefined, { baseLength: 6, baseWidth: 6, height: 4 });
    expect(squat.tilt).toBeLessThan(BLUEBOOK_VIEW.pyramid.tilt);
    // A spec's own tilt always wins.
    expect(
      cameraFor("pyramid", { tilt: 60 }, { baseLength: 6, baseWidth: 6, height: 4 }).tilt
    ).toBe(60);
  });
});

describe("cone and cylinder silhouettes", () => {
  const tilts = [5, 19.47, 34, 60];

  it("draws a cone's sides tangent to its base ellipse at the true tangent points", () => {
    for (const tilt of tilts) {
      for (const [r, h] of [
        [3, 4],
        [1.4, 1],
        [0.4, 1],
      ]) {
        const cam = { turn: 0, tilt, lean: 0 };
        const part = solid("k", "cone", { radius: r, height: h });
        const scene = raw(part, cam);
        const steep = Math.tan((tilt * Math.PI) / 180) >= h / r;
        if (steep) {
          // Seen from above its side, the apex falls inside the base: no sides, all solid.
          expect(lines(scene.items).every((p) => p.weight === "line")).toBe(true);
          expect(lines(scene.items)).toHaveLength(1);
          continue;
        }
        const proj = projector(cam);
        const apexQ = proj([0, h, 0]);
        const apex: P2 = [BIG * apexQ[0], BIG * apexQ[1]];
        const base = screenCircle(cam, [0, 0, 0], r);
        const sides = lines(scene.items).filter((p) => {
          const pts = pointsOf(p.d);
          return pts.length === 2 && near(pts[0], apex) < 0.02;
        });
        expect(sides, `tilt ${tilt}`).toHaveLength(2);
        for (const s of sides) {
          const t = pointsOf(s.d)[1];
          const hit = base.nearest(t);
          // The tangent point lies on the ellipse...
          expect(hit.d, `tilt ${tilt}`).toBeLessThan(0.05);
          // ...and the side runs along the ellipse's tangent there.
          const along: P2 = [t[0] - apex[0], t[1] - apex[1]];
          expect(angleDeg(along, base.tangent(hit.t)), `tilt ${tilt}`).toBeLessThan(0.5);
          expect(s.weight).toBe("line");
        }
        // The dashed back of the base runs exactly between the two tangent points.
        const dashed = lines(scene.items).filter((p) => p.weight === "dashed");
        expect(dashed).toHaveLength(1);
        const arc = pointsOf(dashed[0].d);
        const ends = sides.map((s) => pointsOf(s.d)[1]);
        const first = arc[0];
        const last = arc[arc.length - 1];
        expect(Math.min(...ends.map((e) => near(e, first)))).toBeLessThan(0.02);
        expect(Math.min(...ends.map((e) => near(e, last)))).toBeLessThan(0.02);
        // It is the back: above the ellipse's center on screen.
        const mid = arc[Math.floor(arc.length / 2)];
        expect(mid[1]).toBeLessThan(0);
      }
    }
  });

  it("puts a cone's tangent points b²/H above the base center, as Bluebook does", () => {
    // 2026-06_US_V3_MATH_M2_Q06: the sides touch the base ellipse above its widest points.
    const cam = { turn: 0, tilt: 34, lean: 0 };
    const [r, h] = [0.4, 1];
    const scene = raw(solid("k", "cone", { radius: r, height: h }), cam);
    const b = BIG * r * Math.sin((34 * Math.PI) / 180);
    const H = BIG * h * Math.cos((34 * Math.PI) / 180);
    const apexY = -H;
    const ends = lines(scene.items)
      .map((p) => pointsOf(p.d))
      .filter((pts) => pts.length === 2 && Math.abs(pts[0][1] - apexY) < 0.02)
      .map((pts) => pts[1]);
    expect(ends).toHaveLength(2);
    for (const e of ends) expect(e[1]).toBeCloseTo(-(b * b) / H, 1);
  });

  it("draws a cylinder's sides tangent to both ellipses, with the bottom's back dashed", () => {
    for (const tilt of tilts) {
      const cam = { turn: 0, tilt, lean: 0 };
      const part = solid("c", "cylinder", { radius: 2, height: 5 });
      const scene = raw(part, cam);
      const bottom = screenCircle(cam, [0, 0, 0], 2);
      const top = screenCircle(cam, [0, 5, 0], 2);
      const sides = lines(scene.items).filter((p) => pointsOf(p.d).length === 2);
      expect(sides).toHaveLength(2);
      for (const s of sides) {
        const [a, b] = pointsOf(s.d);
        const along: P2 = [b[0] - a[0], b[1] - a[1]];
        const hb = bottom.nearest(a);
        const ht = top.nearest(b);
        expect(hb.d).toBeLessThan(0.05);
        expect(ht.d).toBeLessThan(0.05);
        expect(angleDeg(along, bottom.tangent(hb.t))).toBeLessThan(0.5);
        expect(angleDeg(along, top.tangent(ht.t))).toBeLessThan(0.5);
      }
      const dashed = lines(scene.items).filter((p) => p.weight === "dashed");
      expect(dashed).toHaveLength(1);
      const arc = pointsOf(dashed[0].d);
      // The dashed arc is the bottom's back half, from one side line to the other.
      for (const p of arc) expect(bottom.nearest(p).d).toBeLessThan(0.05);
      const ends = sides.map((s) => pointsOf(s.d)[0]);
      expect(Math.min(...ends.map((e) => near(e, arc[0])))).toBeLessThan(0.02);
      expect(Math.min(...ends.map((e) => near(e, arc[arc.length - 1])))).toBeLessThan(0.02);
    }
  });

  it("draws a sphere as its outline circle with the back of its equator dashed", () => {
    const scene = buildSolid3d(spec3d(solid("s", "sphere", { radius: 3 })), BOX);
    const dashed = lines(scene.items).filter((p) => p.weight === "dashed");
    expect(dashed).toHaveLength(1);
    expect(scene.description).toBe("Sphere.");
    expect(scene.issues).toEqual([]);
  });
});

describe("inner lines", () => {
  it("runs a cone's height dashed from the apex exactly to the base center", () => {
    const cam = cameraFor("cone");
    const scene = raw(solid("k", "cone", { radius: 3, height: 4 }), cam, ["height"]);
    const proj = projector(cam);
    const height = paths(scene.items).find((p) => p.partId === "k.height")!;
    expect(height.weight).toBe("dashed");
    const [a, b] = pointsOf(height.d);
    const apex = proj([0, 4, 0]);
    const center = proj([0, 0, 0]);
    expect(near(a, [BIG * apex[0], BIG * apex[1]])).toBeLessThan(0.01);
    expect(near(b, [BIG * center[0], BIG * center[1]])).toBeLessThan(0.01);
  });

  it("runs a pyramid's height dashed from the apex to the base's center", () => {
    const part = solid("p", "pyramid", { baseLength: 6, baseWidth: 4, height: 9 });
    const cam = cameraFor("pyramid", undefined, part.dims);
    const scene = raw(part, cam, ["height"]);
    const proj = projector(cam);
    const [a, b] = pointsOf(paths(scene.items).find((p) => p.partId === "p.height")!.d);
    const apex = proj([3, 9, 2]);
    const foot = proj([3, 0, 2]);
    expect(near(a, [BIG * apex[0], BIG * apex[1]])).toBeLessThan(0.01);
    expect(near(b, [BIG * foot[0], BIG * foot[1]])).toBeLessThan(0.01);
  });

  it("runs a radius solid from a dot at the center to the rim at its angle", () => {
    for (const [shape, angle, y] of [
      ["cylinder", 65, 5],
      ["cylinder", 200, 5],
      ["cone", 180, 0],
      ["cone", 300, 0],
    ] as const) {
      const part = solid("s", shape, { radius: 2, height: 5 }, { radiusAngle: angle });
      const cam = cameraFor(shape);
      const scene = raw(part, cam, ["radius"]);
      const radius = paths(scene.items).filter((p) => p.partId === "s.radius");
      const line = radius.find((p) => !p.fill)!;
      expect(line.weight).toBe("line");
      const [a, b] = pointsOf(line.d);
      const circle = screenCircle(cam, [0, y, 0], 2);
      const proj = projector(cam);
      const c = proj([0, y, 0]);
      expect(near(a, [BIG * c[0], BIG * c[1]])).toBeLessThan(0.01);
      const end = circle.at((angle * Math.PI) / 180);
      expect(near(b, end), `${shape} ${angle}`).toBeLessThan(0.01);
      // A dot marks the center.
      expect(radius.some((p) => p.fill === "ink")).toBe(true);
    }
  });

  it("uses Bluebook's radius directions by default", () => {
    // Back to the right across a cylinder's top; straight left on a cone's base.
    const cyl = buildSolid3d(
      spec3d(solid("c", "cylinder", { radius: 2, height: 3 }), [{ text: "r", on: "c.radius" }]),
      BOX
    );
    const [ca, cb] = pointsOf(lines(cyl.items).find((p) => p.partId === "c.radius")!.d);
    expect(cb[0]).toBeGreaterThan(ca[0]);
    expect(cb[1]).toBeLessThan(ca[1]);
    const cone = buildSolid3d(
      spec3d(solid("k", "cone", { radius: 2, height: 3 }), [{ text: "r", on: "k.radius" }]),
      BOX
    );
    const [ka, kb] = pointsOf(lines(cone.items).find((p) => p.partId === "k.radius")!.d);
    expect(kb[0]).toBeLessThan(ka[0]);
    expect(kb[1]).toBeCloseTo(ka[1], 1);
  });
});

describe("right-angle marks on solids", () => {
  const square = (part: SolidPart) => {
    const scene = buildSolid3d(
      spec3d(
        part,
        [{ text: "h", on: `${part.id}.height` }],
        [{ kind: "right_angle", on: [`${part.id}.height`] }]
      ),
      BOX
    );
    expect(scene.issues).toEqual([]);
    const own = paths(scene.items).filter((p) => p.partId === `${part.id}.height`);
    const height = own.find((p) => p.weight === "dashed")!;
    const mark = own.find((p) => p.weight === "line")!;
    return { height: pointsOf(height.d), mark: pointsOf(mark.d) };
  };

  it("squares the foot of a pyramid's height against a base edge", () => {
    const part = solid("p", "pyramid", { baseLength: 9.75, baseWidth: 5.7, height: 18 });
    const { height, mark } = square(part);
    const [apex, foot] = height;
    expect(mark).toHaveLength(3);
    const [p1, p2, p3] = mark;
    const s = HOUSE.rightAngleSide;
    // p1 lies on the height line, one side's length up from the foot.
    expect(near(p1, foot)).toBeCloseTo(s, 1);
    expect(distToSegment(p1, apex, foot)).toBeLessThan(0.02);
    // p3 is one side along a base edge; p2 closes the square.
    expect(near(p3, foot)).toBeCloseTo(s, 1);
    expect(near(p2, [p1[0] + p3[0] - foot[0], p1[1] + p3[1] - foot[1]])).toBeLessThan(0.02);
    // The base leg runs along one of the base edges on screen.
    const cam = cameraFor("pyramid", undefined, part.dims);
    const proj = projector(cam);
    const o = proj([0, 0, 0]);
    const edges = (
      [
        [1, 0, 0],
        [0, 0, 1],
      ] as V3[]
    ).map((v): P2 => {
      const q = proj(v);
      return [q[0] - o[0], q[1] - o[1]];
    });
    const leg: P2 = [p3[0] - foot[0], p3[1] - foot[1]];
    expect(Math.min(...edges.map((e) => angleDeg(leg, e)))).toBeLessThan(0.5);
  });

  it("squares a cone's height against the level radius", () => {
    const { height, mark } = square(solid("k", "cone", { radius: 3, height: 5 }));
    const [, foot] = height;
    const [p1, , p3] = mark;
    expect(near(p1, foot)).toBeCloseTo(HOUSE.rightAngleSide, 1);
    expect(p3[1]).toBeCloseTo(foot[1], 1);
    expect(p3[0]).toBeGreaterThan(foot[0]);
  });

  it("reports a mark it cannot draw on a solid", () => {
    const part = solid("c", "cylinder", { radius: 2, height: 5 });
    const scene = buildSolid3d(spec3d(part, [], [{ kind: "right_angle", on: ["c.height"] }]), BOX);
    expect(scene.issues.map((i) => i.code)).toEqual(["clipped"]);
  });
});

describe("buildSolid3d", () => {
  it("rectangular prism has 12 edges and exactly 3 dashed, meeting at the far corner", () => {
    const part = solid("box", "prism", { length: 5, width: 3, height: 4 });
    const scene = buildSolid3d(spec3d(part), BOX);
    const drawn = lines(scene.items);
    const total = drawn.reduce((n, p) => n + segmentCount(p.d), 0);
    const dashed = drawn.filter((p) => p.weight === "dashed");
    expect(total).toBe(12);
    expect(dashed.reduce((n, p) => n + segmentCount(p.d), 0)).toBe(3);
    expect(scene.issues).toEqual([]);
    // The three dashed edges share the corner farthest from the viewer.
    const cam = cameraFor("prism");
    const m = cameraMatrix(cam);
    const model = solidModel(part);
    const far = model.vertices.reduce((a, b) => (dot3(m[2], b) > dot3(m[2], a) ? b : a));
    const proj = projector(cam);
    const rawScene = raw(part, cam);
    const farQ = proj(far);
    const corner: P2 = [BIG * farQ[0], BIG * farQ[1]];
    for (const p of lines(rawScene.items).filter((q) => q.weight === "dashed")) {
      const pts = pointsOf(p.d);
      expect(pts.some((q) => near(q, corner) < 0.02)).toBe(true);
    }
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
      expect(own).toBeLessThan(HOUSE.labelOffset * 3 + HOUSE.font * 1.5);
      for (const other of dims.filter((d) => d !== dim)) {
        expect(own).toBeLessThan(distToSegment(center, ...edgeOf(other)));
      }
      expect(l).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(BOX.width);
    }
  });

  it("puts a cylinder's r on the front side of its radius and h beside its right side", () => {
    const part = solid("c", "cylinder", { radius: 5, height: 5.2 });
    const scene = buildSolid3d(
      spec3d(part, [
        { text: "r", on: "c.radius" },
        { text: "h", on: "c.height" },
      ]),
      BOX
    );
    expect(scene.issues).toEqual([]);
    const r = texts(scene.items).find((t) => t.partId === "c.radius")!;
    const h = texts(scene.items).find((t) => t.partId === "c.height")!;
    expect(r.italic).toBe(true);
    const [a, b] = pointsOf(lines(scene.items).find((p) => p.partId === "c.radius")!.d);
    // Below the radius line where the label sits.
    const lineY = a[1] + ((b[1] - a[1]) * (r.x - a[0])) / (b[0] - a[0]);
    expect(textBox(r)[2]).toBeGreaterThan(lineY);
    const rightmost = Math.max(
      ...lines(scene.items).flatMap((p) => pointsOf(p.d).map((q) => q[0]))
    );
    expect(textBox(h)[0]).toBeGreaterThan(rightmost);
  });

  it("draws named points as dots with their letters outside the solid", () => {
    const part = solid(
      "k",
      "cone",
      { radius: 1.32, height: 1 },
      {
        view: { tilt: 5.8 },
        points: [
          { id: "A", at: "apex" },
          { id: "B", at: "rim", angle: 232 },
        ],
      }
    );
    const scene = buildSolid3d(
      spec3d(part, [
        { text: "A", on: "k.A" },
        { text: "B", on: "k.B" },
      ]),
      BOX
    );
    expect(scene.issues).toEqual([]);
    const dot = (id: string) =>
      pointsOf(paths(scene.items).find((p) => p.partId === id && p.fill)!.d);
    const center = (pts: P2[]): P2 => [(pts[0][0] + pts[1][0]) / 2, pts[0][1]];
    const a = center(dot("k.A"));
    const b = center(dot("k.B"));
    const label = (id: string) => textBox(texts(scene.items).find((t) => t.partId === id)!);
    // A above the apex, B below the rim point (2025-08_US_V1_MATH_M2_Q18).
    expect(label("k.A")[3]).toBeLessThan(a[1]);
    expect(label("k.B")[2]).toBeGreaterThan(b[1]);
  });

  it("leaves a dot off a point marked dot: false", () => {
    const part = solid(
      "k",
      "cone",
      { radius: 1, height: 2 },
      {
        points: [
          { id: "V", at: "apex", dot: false },
          { id: "O", at: "center" },
        ],
      }
    );
    const scene = buildSolid3d(spec3d(part), BOX);
    expect(
      paths(scene.items)
        .filter((p) => p.fill)
        .map((p) => p.partId)
    ).toEqual(["k.O"]);
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
      // Never larger than Bluebook draws a solid against its text: 14 em by 15 em.
      expect(x1 - x0, part.shape).toBeLessThanOrEqual(14 * HOUSE.font + 0.01);
      expect(y1 - y0, part.shape).toBeLessThanOrEqual(15 * HOUSE.font + 0.01);
      expect(scene.issues, part.shape).toEqual([]);
      expect(scene.items.every((i) => i.t !== "path" || i.role === "ink")).toBe(true);
    }
  });

  it("places a sphere's radius label even where the equator crowds the radius", () => {
    for (const box of [BOX, { width: 300, height: 240 }, { width: 240, height: 200 }]) {
      const part = solid("s", "sphere", { radius: 3 });
      const scene = buildSolid3d(spec3d(part, [{ text: "r", on: "s.radius" }]), box);
      expect(scene.issues, `${box.width}`).toEqual([]);
      expect(texts(scene.items).map((t) => t.partId)).toEqual(["s.radius"]);
      expect(lines(scene.items).find((p) => p.partId === "s.radius")?.weight).toBe("line");
    }
  });

  it("reports a label that names no dimension or point instead of drawing it", () => {
    const part = solid("box", "prism", { length: 5, width: 3, height: 4 });
    const scene = buildSolid3d(spec3d(part, [{ text: "x", on: "box" }]), BOX);
    expect(scene.issues.map((i) => i.code)).toEqual(["missing_label"]);
    expect(texts(scene.items)).toHaveLength(0);
  });
});

describe("solids in the spec", () => {
  const base = (part: unknown, labels: Label[] = [], marks: Mark[] = []) => ({
    version: FIGURE_SPEC_VERSION,
    type: "solid3d",
    parts: [part],
    labels,
    marks,
  });

  it("accepts dims, a camera, points, a radius angle and a mark on the height", () => {
    const r = parseFigureSpec(
      base(
        solid(
          "k",
          "cone",
          { radius: 2, height: 5 },
          {
            view: { tilt: 30 },
            radiusAngle: 180,
            show: ["radius"],
            points: [
              { id: "V", at: "apex", dot: false },
              { id: "P", at: "rim", angle: 180 },
            ],
          }
        ),
        [
          { text: "r", on: "k.radius" },
          { text: "V", on: "k.V" },
        ],
        [{ kind: "right_angle", on: ["k.height"] }]
      )
    );
    expect(r.ok).toBe(true);
  });

  it("rejects bad dims, views, points and labels", () => {
    const bad = [
      base(solid("c", "cylinder", { radius: 2 })),
      base(solid("c", "cylinder", { radius: 2, height: 5, depth: 1 })),
      base(solid("c", "cylinder", { radius: -2, height: 5 })),
      base({ kind: "solid", id: "c", shape: "sphere", dims: { radius: 1 }, view: "isometric" }),
      base(solid("c", "sphere", { radius: 1 }, { view: { tilt: 95 } })),
      base(solid("c", "sphere", { radius: 2 }), [{ text: "h", on: "c.height" }]),
      // A cylinder has no apex; a rim point needs its angle; a center takes none.
      base(solid("c", "cylinder", { radius: 2, height: 5 }, { points: [{ id: "A", at: "apex" }] })),
      base(solid("c", "cone", { radius: 2, height: 5 }, { points: [{ id: "B", at: "rim" }] })),
      base(
        solid(
          "c",
          "cone",
          { radius: 2, height: 5 },
          { points: [{ id: "O", at: "center", angle: 3 }] }
        )
      ),
      // A point may not reuse a dimension's name.
      base(
        solid("c", "cone", { radius: 2, height: 5 }, { points: [{ id: "radius", at: "center" }] })
      ),
    ];
    for (const input of bad) expect(parseFigureSpec(input).ok, JSON.stringify(input)).toBe(false);
  });
});

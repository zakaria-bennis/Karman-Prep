/**
 * Studio shading of a 3D solid, from its stored 3D model and the exact camera
 * and fit Bluebook drew it with (solidLayoutFor), so every shaded surface sits
 * precisely inside the Bluebook lines drawn over it.
 *
 * - Flat faces (prism, pyramid): Lambert per face from the key light, each with
 *   a gentle falloff across it.
 * - Cylinder: the side is one gradient sampled from the light at each angle
 *   around it (a specular band included); the top is a lit cap.
 * - Cone: a fan of thin slices, each lit by its own normal.
 * - Sphere: a radial gradient from the highlight, lit point by point.
 * - Under every solid: a soft cast shadow and a darker contact shadow on the ground.
 */
import type { Pt } from "../marks";
import type { Scene } from "../scene";
import {
  cameraMatrix,
  dot3,
  onCircle,
  projectWith,
  sub3,
  toViewer,
  type V3,
} from "../solid-camera";
import { solidModel } from "../solid-model";
import { solidLayoutFor } from "../solid3d";
import type { FigureSpec } from "../spec";
import {
  bodyPaint,
  hull,
  KEY_LIGHT,
  LayerBuilder,
  LIGHT_ON_SCREEN,
  lightAt,
  litPaint,
  polyPath,
  role,
  stopsOf,
} from "./paint";
import type { StudioShape } from "./types";

const EPS = 1e-9;
const TAU = 2 * Math.PI;
/** Toward the light that casts the ground shadow: high, from the front left. */
const SHADOW_LIGHT: V3 = [-0.32, 1, -0.3];

const norm = (v: V3): V3 => {
  const l = Math.hypot(...v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

/** Outward unit normals of flat faces (Newell's method). */
function faceNormals(vs: V3[], faces: number[][]): V3[] {
  const inside = vs
    .reduce<V3>((s, v) => [s[0] + v[0], s[1] + v[1], s[2] + v[2]], [0, 0, 0])
    .map((c) => c / vs.length) as V3;
  return faces.map((f) => {
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
    const u = norm(n);
    return dot3(u, sub3(c, inside)) < 0 ? [-u[0], -u[1], -u[2]] : u;
  });
}

/** Angles in [0, 2π) where a cos t + b sin t = c. */
function solveTrig(a: number, b: number, c: number): number[] {
  const r = Math.hypot(a, b);
  if (r < EPS || Math.abs(c) >= r) return [];
  const phi = Math.atan2(b, a);
  const d = Math.acos(c / r);
  const wrap = (t: number) => ((t % TAU) + TAU) % TAU;
  return [wrap(phi - d), wrap(phi + d)].sort((x, y) => x - y);
}

/** The visible run of angles [t0, t1] (t1 > t0) between two cuts, holding `visible` at its middle. */
function visibleRun(cuts: number[], visible: (t: number) => boolean): [number, number] | null {
  if (cuts.length < 2) return visible(0) ? [0, TAU] : null;
  const [a, b] = cuts;
  if (visible((a + b) / 2)) return [a, b];
  return [b, a + TAU];
}

const range = (t0: number, t1: number, n: number) =>
  Array.from({ length: n + 1 }, (_, i) => t0 + ((t1 - t0) * i) / n);

/** Paint the solid of a solid3d scene into the layer. */
export function solidStudio(spec: FigureSpec, scene: Scene, b: LayerBuilder): void {
  const [ox, oy] = scene.offset ?? [0, 0];
  const box = { width: scene.width - 2 * ox, height: scene.height - 2 * oy };
  const layout = solidLayoutFor(spec, box, { scale: scene.scale });
  if (!layout) return;
  const { part, camera, fit } = layout;
  const m = cameraMatrix(camera);
  const project = projectWith(m);
  const P = (v: V3): Pt => {
    const [x, y] = project(v);
    return [fit.x + fit.scale * x, fit.y + fit.scale * y];
  };
  /** A world normal in camera space (z toward the viewer). */
  const cam = (n: V3): V3 => [dot3(m[0], n), dot3(m[1], n), -dot3(m[2], n)];
  const tv = toViewer(m);
  const sees = (n: V3) => dot3(n, tv) > EPS;
  const model = solidModel(part);
  const { radius: r = 0, height: h = 0 } = part.dims;

  const shapes: StudioShape[] = [];
  shapes.push(...groundShadows(model.vertices, P, box));

  /** A light falloff across a flat region of the screen: lit toward the light, a little darker away. */
  const falloff = (pts: Pt[], n: V3) => {
    const along = (p: Pt) => p[0] * LIGHT_ON_SCREEN[0] + p[1] * LIGHT_ON_SCREEN[1];
    const lit = pts.reduce((a, p) => (along(p) > along(a) ? p : a));
    const dark = pts.reduce((a, p) => (along(p) < along(a) ? p : a));
    return b.gradient({
      kind: "linear",
      units: "user",
      x1: lit[0],
      y1: lit[1],
      x2: dark[0],
      y2: dark[1],
      stops: [
        { offset: 0, color: litPaint(cam(n), 0.07) },
        { offset: 1, color: litPaint(cam(n), -0.07) },
      ],
    });
  };

  if (part.shape === "prism" || part.shape === "pyramid") {
    const normals = faceNormals(model.vertices, model.faces);
    model.faces.forEach((f, i) => {
      if (!sees(normals[i])) return;
      const pts = f.map((v) => P(model.vertices[v]));
      const fill = falloff(pts, normals[i]);
      shapes.push({ kind: "face", d: polyPath(pts), fill, stroke: fill, strokeWidth: 0.6 });
    });
  } else if (part.shape === "cylinder") {
    const lateral = (t: number): V3 => [Math.cos(t), 0, Math.sin(t)];
    const cuts = solveTrig(tv[0], tv[2], 0);
    const run = visibleRun(cuts, (t) => sees(lateral(t)));
    if (run) {
      const ts = range(run[0], run[1], 96);
      const bottom = ts.map((t) => P(onCircle([0, 0, 0], r, t)));
      const top = ts.map((t) => P(onCircle([0, h, 0], r, t))).reverse();
      const [a, z] = [bottom[0], bottom[bottom.length - 1]];
      const axis: Pt = [z[0] - a[0], z[1] - a[1]];
      const l2 = axis[0] ** 2 + axis[1] ** 2 || 1;
      const at = (p: Pt) => ((p[0] - a[0]) * axis[0] + (p[1] - a[1]) * axis[1]) / l2;
      const samples = range(run[0], run[1], 40)
        .map((t) => ({ o: at(P(onCircle([0, 0, 0], r, t))), t }))
        .sort((p, q) => p.o - q.o);
      const fill = b.gradient({
        kind: "linear",
        units: "user",
        x1: a[0],
        y1: a[1],
        x2: z[0],
        y2: z[1],
        stops: samples.map(({ o, t }) => ({
          offset: Math.round(Math.min(1, Math.max(0, o)) * 1000) / 1000,
          color: litPaint(cam(lateral(t))),
        })),
      });
      shapes.push({
        kind: "side",
        d: polyPath([...bottom, ...top]),
        fill,
        stroke: fill,
        strokeWidth: 0.6,
      });
    }
    const capY = sees([0, 1, 0]) ? h : sees([0, -1, 0]) ? 0 : null;
    if (capY !== null) {
      const n: V3 = [0, capY ? 1 : -1, 0];
      const pts = range(0, TAU, 160)
        .slice(0, -1)
        .map((t) => P(onCircle([0, capY, 0], r, t)));
      const fill = falloff(pts, n);
      shapes.push({ kind: "cap", d: polyPath(pts), fill, stroke: fill, strokeWidth: 0.6 });
    }
  } else if (part.shape === "cone") {
    const normal = (t: number): V3 => norm([h * Math.cos(t), r, h * Math.sin(t)]);
    const apex = P([0, h, 0]);
    const ts = range(0, TAU, 240);
    for (let i = 0; i + 1 < ts.length; i++) {
      const mid = (ts[i] + ts[i + 1]) / 2;
      if (!sees(normal(mid))) continue;
      const fill = litPaint(cam(normal(mid)));
      const pts = [apex, P(onCircle([0, 0, 0], r, ts[i])), P(onCircle([0, 0, 0], r, ts[i + 1]))];
      shapes.push({ kind: "slice", d: polyPath(pts), fill, stroke: fill, strokeWidth: 0.7 });
    }
  } else if (part.shape === "sphere") {
    const c = P([0, 0, 0]);
    const R = r * fit.scale * Math.hypot(...m[0]);
    // The highlight sits where the normal is halfway between the light and the viewer.
    const half = norm([KEY_LIGHT[0], KEY_LIGHT[1], KEY_LIGHT[2] + 1]);
    const [hx, hy] = [half[0], -half[1]];
    const F: Pt = [c[0] + hx * R, c[1] + hy * R];
    const away = Math.hypot(hx, hy);
    const E: Pt = [c[0] - (hx / away) * R, c[1] - (hy / away) * R];
    const stops = stopsOf(14, (t) => {
      const p: Pt = [F[0] + (E[0] - F[0]) * t, F[1] + (E[1] - F[1]) * t];
      const dx = (p[0] - c[0]) / R;
      const dy = (p[1] - c[1]) / R;
      const dz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy));
      const { diffuse: d, specular: s } = lightAt([dx, -dy, dz]);
      return bodyPaint(d, s);
    });
    const fill = b.gradient({
      kind: "radial",
      units: "user",
      cx: c[0],
      cy: c[1],
      r: R,
      fx: F[0],
      fy: F[1],
      stops,
    });
    const circle = range(0, TAU, 160)
      .slice(0, -1)
      .map((t): Pt => [c[0] + R * Math.cos(t), c[1] + R * Math.sin(t)]);
    shapes.push({ kind: "sphere", d: polyPath(circle), fill });
  }
  b.before(0, ...shapes);
}

/**
 * A soft shadow cast on the ground plane by the high front-left light, and a
 * tight contact shadow where the solid meets the ground. Kept inside the box.
 */
function groundShadows(
  vs: V3[],
  P: (v: V3) => Pt,
  box: { width: number; height: number }
): StudioShape[] {
  const y0 = Math.min(...vs.map((v) => v[1]));
  const L = SHADOW_LIGHT;
  const cast = (k: number) =>
    hull(
      vs.flatMap((v) => {
        const t = ((v[1] - y0) / L[1]) * k;
        return [P([v[0] - L[0] * t, y0, v[2] - L[2] * t]), P([v[0], y0, v[2]])];
      })
    );
  const inside = (pts: Pt[]) =>
    pts.every(([x, y]) => x > 6 && x < box.width - 6 && y > 6 && y < box.height - 6);
  let k = 0.7;
  let shadow = cast(k);
  while (k > 0.2 && !inside(shadow)) shadow = cast((k *= 0.8));

  // Contact: the footprint on the ground (a small disc under a sphere).
  const foot = vs.filter((v) => Math.abs(v[1] - y0) < 1e-6);
  const spread = Math.max(...vs.map((v) => Math.hypot(v[0], v[2])));
  const ring =
    foot.length >= 3 ? foot : range(0, TAU, 48).map((t) => onCircle([0, y0, 0], spread * 0.42, t));
  const contact = hull(ring.map(P));
  const ground = role("studio-ground");
  return [
    { kind: "cast-shadow", d: polyPath(shadow), fill: ground, opacity: 0.42, filter: "blur7" },
    { kind: "contact-shadow", d: polyPath(contact), fill: ground, opacity: 0.7, filter: "blur2" },
  ];
}

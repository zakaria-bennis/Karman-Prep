/**
 * The camera every 3D solid is drawn with: an orthographic (parallel,
 * undistorted) view, which is what Bluebook prints. Measured from real exam
 * figures (docs/superpowers/specs/2026-10-31-figure-engine-design.md, "solid3d"):
 *
 * - A circle prints as an ellipse centered straight under the apex, its long
 *   axis level, and a cone's sides touch it exactly where a true projection
 *   puts the tangent points (2026-06_US_V3_MATH_M2_Q06: tangent 10 px above
 *   the ellipse's center, as b²/H predicts). An oblique view would skew the
 *   ellipse, which Bluebook never does.
 * - Every Bluebook cylinder flattens its circles to 1/3 (2024-08_US_V5_MATH_M1_Q19
 *   0.33, 2026-06_ASIA_V1_MATH_M2_Q21 0.34 and 0.34), so curved solids look
 *   down at asin(1/3). Cones vary with the art (0.10 to 0.55); a spec sets
 *   `view.tilt` to match one.
 * - Bluebook's pyramid (2026-03_US_V1_MATH_M2_Q10, 2026-06_US_V3_MATH_M1_Q17,
 *   2025-05_ASIA_V2_MATH_M2_Q10, one drawing) fits turn 29°, tilt 50° and
 *   lean -21° to within 2 px: the front corner points down, length runs up to
 *   the left and width up to the right.
 *
 * World axes: x right (length), y up (height), z away from the viewer
 * (depth). Angles are degrees.
 */
import type { Pt } from "./marks";
import type { SolidShape } from "./spec";

export type V3 = [number, number, number];
/** Rows: screen right, screen up, and depth away from the viewer. */
export type M3 = [V3, V3, V3];
export type Camera = { turn: number; tilt: number; lean: number };

/** A circle seen by a curved solid's camera flattens to this fraction. */
export const CIRCLE_FLATTENING = 1 / 3;
const CURVED_TILT = (Math.asin(CIRCLE_FLATTENING) * 180) / Math.PI;

/**
 * Each shape's default camera, from Bluebook. No prism appears in the real
 * figures checked, so the prism uses the pyramid's turn and tilt, level
 * (a box drawn leaning reads as falling over).
 */
export const BLUEBOOK_VIEW: Record<SolidShape, Camera> = {
  cylinder: { turn: 0, tilt: CURVED_TILT, lean: 0 },
  cone: { turn: 0, tilt: CURVED_TILT, lean: 0 },
  sphere: { turn: 0, tilt: CURVED_TILT, lean: 0 },
  pyramid: { turn: 29, tilt: 50, lean: -21 },
  prism: { turn: 29, tilt: 24, lean: 0 },
};

export const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale3 = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];

const RAD = Math.PI / 180;

function mul(a: M3, b: M3): M3 {
  return a.map((row) =>
    [0, 1, 2].map((j) => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j])
  ) as M3;
}

/** The camera's rows: turn about y, then tilt down, then lean on the page. */
export function cameraMatrix({ turn, tilt, lean }: Camera): M3 {
  const [t, p, r] = [turn * RAD, tilt * RAD, lean * RAD];
  const azimuth: M3 = [
    [Math.cos(t), 0, Math.sin(t)],
    [0, 1, 0],
    [-Math.sin(t), 0, Math.cos(t)],
  ];
  const elevation: M3 = [
    [1, 0, 0],
    [0, Math.cos(p), Math.sin(p)],
    [0, -Math.sin(p), Math.cos(p)],
  ];
  const roll: M3 = [
    [Math.cos(r), -Math.sin(r), 0],
    [Math.sin(r), Math.cos(r), 0],
    [0, 0, 1],
  ];
  return mul(roll, mul(elevation, azimuth));
}

/** The apex stands at least this many times the base's half diagonal above the back corner. */
const APEX_CLEARANCE = 2.5;

/**
 * The camera for a shape, with any of the spec's own view settings. Every
 * Bluebook pyramid shows its apex well above the back corner of the base, so
 * a squat pyramid is seen from lower than the default tilt: never so high
 * that the apex drops inside the base's outline.
 */
export function cameraFor(
  shape: SolidShape,
  view?: Partial<Camera>,
  dims: Record<string, number> = {}
): Camera {
  const camera = { ...BLUEBOOK_VIEW[shape], ...view };
  if (shape === "pyramid" && view?.tilt === undefined) {
    const { baseLength = 0, baseWidth = 0, height = 0 } = dims;
    const half = Math.hypot(baseLength, baseWidth) / 2;
    const clear = (Math.atan2(height, APEX_CLEARANCE * half) * 180) / Math.PI;
    if (clear < camera.tilt) {
      // Seen lower, the drawing leans less too, or a back edge lines up with the apex.
      const f = clear / camera.tilt;
      camera.tilt = clear;
      if (view?.lean === undefined) camera.lean *= f * f;
    }
  }
  return camera;
}

/** World point to screen point (y down), in world units. */
export const projectWith =
  (m: M3) =>
  (v: V3): Pt => [dot3(m[0], v), -dot3(m[1], v)];

/** The unit direction from the solid toward the viewer. */
export const toViewer = (m: M3): V3 => scale3(m[2], -1);

/** World point to screen point for a camera. */
export function projector(camera: Camera): (v: V3) => Pt {
  return projectWith(cameraMatrix(camera));
}

/** A point on a level circle: angle 0 is +x (the viewer's right at turn 0), 90 is +z (back). */
export const onCircle = (center: V3, r: number, angle: number): V3 => [
  center[0] + r * Math.cos(angle),
  center[1],
  center[2] + r * Math.sin(angle),
];

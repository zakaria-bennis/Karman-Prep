// Tracing a curve by press and drag (POI-TRACE-21 to POI-TRACE-26). Each explicit branch is sampled
// once a px across the view into a polyline in CSS px; the pointer's distance to it decides hits,
// and the trace point blends only the independent coordinate: u = u_near·(1 − m) + u_pointer·m with
// m = (d₁/d₂)², d₁ ≤ d₂ the distances to the nearest polyline point before and after the pointer
// along that coordinate. The independent value then moves to the simplest decimal within half a px
// (less where the curve is steep) and the dependent value is the branch at it, exactly. No snapping.

import type { ViewSpec } from "@/lib/calculator/plot/viewport";
import { formatPoiLabel, type FormattedLabel } from "@/lib/calculator/poi/format";
import { simplestDecimal } from "@/lib/calculator/poi/simplest";
import type { PoiBranch } from "@/lib/calculator/poi/types";

type Point = readonly [number, number];

const HALF_PX = 0.5;
const isNum = Number.isFinite;

/** A branch as a polyline in CSS px: u along its independent axis, w along the other; NaN breaks. */
interface Polyline {
  u: Float64Array;
  w: Float64Array;
}

/** The px ↔ world maps of a branch's axes: `u` is the independent coordinate's px. */
interface Axes {
  toU(t: number): number;
  fromU(u: number): number;
  toW(v: number): number;
  span: number; // px along u
}

function axesOf(b: PoiBranch, view: ViewSpec): Axes {
  const { viewport: v, size } = view;
  if (b.independent === "x") {
    const k = size.width / (v.right - v.left),
      kw = size.height / (v.top - v.bottom);
    return {
      toU: (t) => (t - v.left) * k,
      fromU: (u) => v.left + u / k,
      toW: (y) => (v.top - y) * kw,
      span: size.width,
    };
  }
  const k = size.height / (v.top - v.bottom),
    kw = size.width / (v.right - v.left);
  return {
    toU: (t) => (v.top - t) * k,
    fromU: (u) => v.top - u / k,
    toW: (x) => (x - v.left) * kw,
    span: size.height,
  };
}

/** The branch sampled once a px along its independent axis across the view. */
function polylineOf(b: PoiBranch, axes: Axes): Polyline {
  const n = Math.max(2, Math.ceil(axes.span)) + 1,
    u = new Float64Array(n),
    w = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    u[k] = (k * axes.span) / (n - 1);
    w[k] = axes.toW(b.f(axes.fromU(u[k])));
  }
  return { u, w };
}

/** The pointer `a` (u, w) in a branch's px axes. */
const pointerOf = (b: PoiBranch, a: Point): Point => (b.independent === "x" ? a : [a[1], a[0]]);

/** The nearest polyline point before and after the pointer along u, with their distances. */
function nearest(p: Polyline, a: Point) {
  let before = Infinity,
    after = Infinity,
    best: Point | null = null,
    bestD = Infinity;
  for (let k = 0; k + 1 < p.u.length; k++) {
    const w0 = p.w[k],
      w1 = p.w[k + 1];
    if (!isNum(w0) || !isNum(w1)) continue;
    const u0 = p.u[k],
      du = p.u[k + 1] - u0,
      dw = w1 - w0,
      len = du * du + dw * dw;
    const s = len === 0 ? 0 : Math.max(0, Math.min(1, ((a[0] - u0) * du + (a[1] - w0) * dw) / len));
    const cu = u0 + s * du,
      cw = w0 + s * dw,
      d = Math.hypot(cu - a[0], cw - a[1]);
    if (cu - a[0] < 0) before = Math.min(before, d);
    else after = Math.min(after, d);
    if (d < bestD) [bestD, best] = [d, [cu, cw]];
  }
  return best === null
    ? null
    : { point: best, d1: Math.min(before, after), d2: Math.max(before, after) };
}

/** POI-TRACE-21: the distance in px from `at` to the branch's centreline (Infinity off screen). */
export function branchDistance(b: PoiBranch, view: ViewSpec, at: Point): number {
  return nearest(polylineOf(b, axesOf(b, view)), pointerOf(b, at))?.d1 ?? Infinity;
}

export interface TracePoint {
  x: number; // the dot, in world units
  y: number;
  label: FormattedLabel; // the dependent value is undefined at a hole (POI-TRACE-24)
  hole: boolean;
  distance: number; // px from the pointer to the branch
}

/** POI-TRACE-23: the trace point on branch `b` for the pointer at `at` (CSS px), or null. */
export function traceBranch(b: PoiBranch, view: ViewSpec, at: Point): TracePoint | null {
  const axes = axesOf(b, view),
    a = pointerOf(b, at);
  const near = nearest(polylineOf(b, axes), a);
  if (near === null) return null;
  const m = isNum(near.d2) && near.d2 > 0 ? (near.d1 / near.d2) ** 2 : 0;
  const u = near.point[0] * (1 - m) + a[0] * m;
  const wAt = (uu: number) => axes.toW(b.f(axes.fromU(uu)));
  const w = wAt(u);
  const half = (side: number) => {
    const h = HALF_PX * Math.min(1, HALF_PX / Math.abs(wAt(u + side * HALF_PX) - w));
    return isNum(h) ? h : HALF_PX;
  };
  const ends = [axes.fromU(u - half(-1)), axes.fromU(u + half(1))];
  const t = simplestDecimal(Math.min(...ends), Math.max(...ends));
  let v = b.f(t);
  const value = v;
  let hole = false;
  if (!isNum(axes.toW(v))) {
    // A hole: the dot sits on the neighbour half a px away nearer the pointer; the label says so.
    hole = true;
    const tu = axes.toU(t);
    const [vl, vr] = [b.f(axes.fromU(tu - HALF_PX)), b.f(axes.fromU(tu + HALF_PX))];
    v = Math.abs(axes.toW(vl) - a[1]) < Math.abs(axes.toW(vr) - a[1]) ? vl : vr;
    if (!isNum(v)) return null;
  }
  const [x, y] = b.independent === "x" ? [t, v] : [v, t];
  const [lx, ly] = b.independent === "x" ? [t, value] : [value, t];
  return { x, y, hole, label: formatPoiLabel({ x: lx, y: ly }, view), distance: near.d1 };
}

/** POI-TRACE-26: the trace point on the row's nearest branch (a list jumps between elements). */
export function traceAt(
  branches: readonly PoiBranch[],
  view: ViewSpec,
  at: Point
): TracePoint | null {
  let best: TracePoint | null = null;
  for (const b of branches) {
    const p = traceBranch(b, view, at);
    if (p !== null && (best === null || p.distance < best.distance)) best = p;
  }
  return best;
}

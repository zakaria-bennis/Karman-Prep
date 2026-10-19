// Implicit-curve helpers for points of interest: the curve's polylines over the search box, its
// top and bottom points (POI-2: horizontal tangents, found as extrema of y along the curve) and
// the intersections of two implicit curves (2D Newton from sign changes along one curve's
// polylines). Pure TypeScript: no DOM.

import type { Deadline } from "../core/deadline";
import { plotImplicit } from "../plot/implicit";
import type { Viewport, ViewSpec } from "../plot/viewport";

const isNum = Number.isFinite;
const GOLDEN = (Math.sqrt(5) - 1) / 2;
/** The contour's resolution: the search box at about this many px wide. */
const CONTOUR_WIDTH_PX = 480;

export type Fn2 = (x: number, y: number) => number;
export interface Polyline {
  xs: number[];
  ys: number[];
}

/** F's zero set over `box` as runs of world points, contoured at about 480 px wide. */
export function implicitPolylines(
  F: Fn2,
  box: Viewport,
  view: ViewSpec,
  deadline: Deadline
): Polyline[] {
  const aspect = view.size.height / view.size.width,
    width = CONTOUR_WIDTH_PX,
    height = Math.max(1, Math.round(width * aspect));
  const g = plotImplicit("poi", F, { viewport: box, size: { width, height }, dpr: 1 }, deadline);
  const runs: Polyline[] = [];
  let run: Polyline = { xs: [], ys: [] };
  for (let k = 0; k + 1 < g.polylines.length; k += 2) {
    const x = g.polylines[k],
      y = g.polylines[k + 1];
    if (Number.isNaN(x) || Number.isNaN(y)) {
      if (run.xs.length > 1) runs.push(run);
      run = { xs: [], ys: [] };
    } else {
      run.xs.push(x);
      run.ys.push(y);
    }
  }
  if (run.xs.length > 1) runs.push(run);
  return runs;
}

/** The root of t ↦ g(t) in [a, b] by bisection on a sign change, or NaN when there is none. */
function bracketRoot(g: (t: number) => number, a: number, b: number): number {
  let ga = g(a),
    gb = g(b);
  if (!isNum(ga) || !isNum(gb)) return NaN;
  if (ga === 0) return a;
  if (gb === 0) return b;
  if (ga > 0 === gb > 0) return NaN;
  for (let k = 0; k < 100; k++) {
    const m = (a + b) / 2;
    if (m === a || m === b) break;
    const gm = g(m);
    if (!isNum(gm)) return NaN;
    if (gm === 0) return m;
    if (gm > 0 === ga > 0) [a, ga] = [m, gm];
    else [b, gb] = [m, gm];
  }
  return (a + b) / 2;
}

/** Golden-section maximum of h on [a, b]; null when it lands on an end (no interior extremum). */
function goldenMax(h: (t: number) => number, a: number, b: number): number | null {
  const lo = a,
    hi = b;
  let x1 = b - GOLDEN * (b - a),
    x2 = a + GOLDEN * (b - a),
    h1 = h(x1),
    h2 = h(x2);
  for (let k = 0; k < 200 && b - a > 1e-15 * Math.max(1, Math.abs(a)); k++) {
    if (h1 >= h2) {
      b = x2;
      x2 = x1;
      h2 = h1;
      x1 = b - GOLDEN * (b - a);
      h1 = h(x1);
    } else {
      a = x1;
      x1 = x2;
      h1 = h2;
      x2 = a + GOLDEN * (b - a);
      h2 = h(x2);
    }
  }
  const t = h1 >= h2 ? x1 : x2,
    edge = 1e-3 * (hi - lo);
  return t - lo < edge || hi - t < edge ? null : t;
}

/**
 * POI-2: the top and bottom points of the curve. Each polyline vertex higher (or lower) than its
 * neighbours seeds a golden-section search for the extremum of y(x), the curve's height near the
 * seed found by bisection in a small window; a search that ends on its window's edge is no
 * extremum.
 */
export function implicitTopsAndBottoms(
  F: Fn2,
  runs: readonly Polyline[],
  unit: { x: number; y: number }
): { x: number; y: number; kind: "top" | "bottom" }[] {
  const out: { x: number; y: number; kind: "top" | "bottom" }[] = [];
  const dx = 4 * unit.x,
    dy = 4 * unit.y;
  for (const { xs, ys } of runs) {
    for (let k = 0; k < xs.length; k++) {
      const prev = k > 0 ? ys[k - 1] : null,
        next = k + 1 < ys.length ? ys[k + 1] : null;
      if (prev === null && next === null) continue;
      const y = ys[k],
        top = (prev === null || y > prev) && (next === null || y >= next),
        bottom = (prev === null || y < prev) && (next === null || y <= next);
      for (const kind of [top ? "top" : null, bottom ? "bottom" : null] as const) {
        if (kind === null) continue;
        const sign = kind === "top" ? 1 : -1,
          y0 = y;
        const height = (x: number): number => {
          const r = bracketRoot((t) => F(x, t), y0 - dy, y0 + dy);
          return isNum(r) ? sign * r : -Infinity;
        };
        const x = goldenMax(height, xs[k] - dx, xs[k] + dx);
        if (x === null) continue;
        const yy = sign * height(x);
        if (!isNum(yy)) continue;
        if (
          !out.some(
            (p) => p.kind === kind && Math.abs(p.x - x) < unit.x && Math.abs(p.y - yy) < unit.y
          )
        ) {
          out.push({ x, y: yy, kind });
        }
      }
    }
  }
  return out;
}

/** 2D Newton for {F = 0, G = 0} from (x, y) with central-difference Jacobians; null if it fails. */
export function newton2(
  F: Fn2,
  G: Fn2,
  x: number,
  y: number,
  maxMove: number
): [number, number] | null {
  const x0 = x,
    y0 = y;
  for (let k = 0; k < 50; k++) {
    const f = F(x, y),
      g = G(x, y);
    if (!isNum(f) || !isNum(g)) return null;
    const hx = 1e-7 * Math.max(1, Math.abs(x)),
      hy = 1e-7 * Math.max(1, Math.abs(y));
    const fx = (F(x + hx, y) - F(x - hx, y)) / (2 * hx),
      fy = (F(x, y + hy) - F(x, y - hy)) / (2 * hy),
      gx = (G(x + hx, y) - G(x - hx, y)) / (2 * hx),
      gy = (G(x, y + hy) - G(x, y - hy)) / (2 * hy);
    const det = fx * gy - fy * gx;
    if (!isNum(det) || det === 0) return null;
    const sx = (f * gy - fy * g) / det,
      sy = (fx * g - f * gx) / det;
    x -= sx;
    y -= sy;
    if (Math.hypot(x - x0, y - y0) > maxMove) return null;
    if (
      Math.abs(sx) <= 1e-14 * Math.max(1, Math.abs(x)) &&
      Math.abs(sy) <= 1e-14 * Math.max(1, Math.abs(y))
    ) {
      return [x, y];
    }
  }
  const f = F(x, y),
    g = G(x, y);
  return isNum(f) && isNum(g) ? [x, y] : null;
}

/** POI-4: where G changes sign along F's polylines, refined on both curves by newton2. */
export function implicitCrossings(
  F: Fn2,
  G: Fn2,
  runs: readonly Polyline[],
  unit: { x: number; y: number }
): [number, number][] {
  const out: [number, number][] = [];
  const maxMove = 6 * Math.hypot(unit.x, unit.y);
  for (const { xs, ys } of runs) {
    let prev = G(xs[0], ys[0]);
    for (let k = 1; k < xs.length; k++) {
      const cur = G(xs[k], ys[k]);
      if (isNum(prev) && isNum(cur) && (cur === 0 || prev > 0 !== cur > 0)) {
        const p = newton2(F, G, (xs[k - 1] + xs[k]) / 2, (ys[k - 1] + ys[k]) / 2, maxMove);
        if (
          p !== null &&
          !out.some((q) => Math.abs(q[0] - p[0]) < unit.x && Math.abs(q[1] - p[1]) < unit.y)
        ) {
          out.push(p);
        }
      }
      prev = cur;
    }
  }
  return out;
}

// Test-only measuring helpers for the plot package (G-9 to G-13): views, polyline splitting and
// pixel distances to a reference graph. Never imported by production code.

import { expect } from "vitest";
import type { CurveGeometry, RealFn1, RegionGeometry } from "../geometry";
import {
  defaultViewport,
  worldToPx,
  type PixelSize,
  type Viewport,
  type ViewSpec,
} from "../viewport";

export type Pt = [number, number];
/** True for a pixel column `[x0, x1]` that `columnCoverage` leaves out (NaN). */
export type Skip = (x0: number, x1: number) => boolean;

/** A view of `viewport` at dpr 1, 800×600 unless `size` is given. */
export function viewOf(
  viewport: Viewport,
  size: PixelSize = { width: 800, height: 600 }
): ViewSpec {
  return { viewport, size, dpr: 1 };
}

/** The default view for `size`. */
export function at(size: PixelSize): ViewSpec {
  return viewOf(defaultViewport(size), size);
}

export const VIEW_800: ViewSpec = at({ width: 800, height: 600 });
/** The default view shifted 0.003 left, so samples miss x = 0, 1, 2, 3 and ±1. */
export const SHIFTED: ViewSpec = viewOf({ left: -10.003, right: 9.997, bottom: -7.5, top: 7.5 });
export const UP_TO_1080: ViewSpec[] = [
  VIEW_800,
  at({ width: 1440, height: 900 }),
  at({ width: 1920, height: 1080 }),
];

/** Splits world polylines into runs at each NaN, NaN pair. */
export function runsOf(polylines: Float64Array): Pt[][] {
  const runs: Pt[][] = [];
  let run: Pt[] = [];
  for (let k = 0; k + 1 < polylines.length; k += 2) {
    if (Number.isNaN(polylines[k]) && Number.isNaN(polylines[k + 1])) {
      if (run.length > 0) runs.push(run);
      run = [];
    } else {
      run.push([polylines[k], polylines[k + 1]]);
    }
  }
  if (run.length > 0) runs.push(run);
  return runs;
}

/** Every segment of every run, as its two endpoints. */
export function segmentsOf(polylines: Float64Array): [Pt, Pt][] {
  const segments: [Pt, Pt][] = [];
  for (const run of runsOf(polylines)) {
    for (let k = 1; k < run.length; k++) segments.push([run[k - 1], run[k]]);
  }
  return segments;
}

export function mid(a: Pt, b: Pt): Pt {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

/** CSS px distance between two world points. */
export function pxDistance(view: ViewSpec, a: Pt, b: Pt): number {
  const [ax, ay] = worldToPx(view, a[0], a[1]);
  const [bx, by] = worldToPx(view, b[0], b[1]);
  return Math.hypot(bx - ax, by - ay);
}

/** Distance from (px, py) to the segment (ax, ay)–(bx, by), all in px. */
function segmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const length2 = dx * dx + dy * dy;
  const s = length2 > 0 ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / length2)) : 0;
  return Math.hypot(px - (ax + s * dx), py - (ay + s * dy));
}

/** CSS px distance from the world point `p` to the world segment `a`–`b`. */
export function pointToSegmentPx(view: ViewSpec, p: Pt, a: Pt, b: Pt): number {
  const [px, py] = worldToPx(view, p[0], p[1]);
  const [ax, ay] = worldToPx(view, a[0], a[1]);
  const [bx, by] = worldToPx(view, b[0], b[1]);
  return segmentDistance(px, py, ax, ay, bx, by);
}

/**
 * The least px distance from `p` to the polyline through (x, f(x)) at 1/256 px steps of x within
 * ±0.75 px of p; non-finite values of f break that polyline.
 */
export function distanceToGraphPx(view: ViewSpec, f: RealFn1, p: Pt): number {
  const { left, right, bottom, top } = view.viewport;
  const { width, height } = view.size;
  const toPxX = (x: number) => ((x - left) / (right - left)) * width;
  const toPxY = (y: number) => ((top - y) / (top - bottom)) * height;
  const [px, py] = [toPxX(p[0]), toPxY(p[1])];
  const step = (right - left) / width / 256;
  let best = Infinity;
  let previous: Pt | null = null;
  for (let k = -192; k <= 192; k++) {
    const x = p[0] + k * step;
    const y = f(x);
    const q: Pt | null = Number.isFinite(y) ? [toPxX(x), toPxY(y)] : null;
    if (q !== null) {
      const d = previous
        ? segmentDistance(px, py, previous[0], previous[1], q[0], q[1])
        : Math.hypot(px - q[0], py - q[1]);
      best = Math.min(best, d);
    }
    previous = q;
  }
  return best;
}

/** G-11: each segment's endpoints and midpoint lie within 0.5 px of the graph of f. */
export function expectG11(view: ViewSpec, f: RealFn1, segments: [Pt, Pt][]): void {
  for (const [a, b] of segments) {
    for (const p of [a, b, mid(a, b)]) {
      expect(distanceToGraphPx(view, f, p), `(${p[0]}, ${p[1]})`).toBeLessThanOrEqual(0.5);
    }
  }
}

/**
 * G-12, per pixel column [x0, x1]: NaN when `skip(x0, x1)`, when a reference sample at
 * x0 + (k + 0.5)·w/64 (k < 64) is not finite, or when the samples' [min, max] ∩ [bottom, top] is
 * empty or a point; else |hull ∩ ref| / |ref|, the hull being the y-extent of every polyline
 * segment clipped to [x0, x1] and every band overlapping (x0, x1), clipped to the view.
 */
export function columnCoverage(view: ViewSpec, g: CurveGeometry, f: RealFn1, skip: Skip): number[] {
  const { left, right, bottom, top } = view.viewport;
  const w = (right - left) / view.size.width;
  const segments = segmentsOf(g.polylines);
  const ratios: number[] = [];
  for (let i = 0; i < view.size.width; i++) {
    const x0 = left + i * w;
    const x1 = left + (i + 1) * w;
    if (skip(x0, x1)) {
      ratios.push(NaN);
      continue;
    }
    let refMin = Infinity;
    let refMax = -Infinity;
    let defined = true;
    for (let k = 0; k < 64; k++) {
      const y = f(x0 + ((k + 0.5) * w) / 64);
      if (!Number.isFinite(y)) defined = false;
      refMin = Math.min(refMin, y);
      refMax = Math.max(refMax, y);
    }
    const refLo = Math.max(refMin, bottom);
    const refHi = Math.min(refMax, top);
    if (!defined || !(refLo < refHi)) {
      ratios.push(NaN);
      continue;
    }
    let hullLo = Infinity;
    let hullHi = -Infinity;
    for (const [[xa, ya], [xb, yb]] of segments) {
      const lo = Math.max(x0, Math.min(xa, xb));
      const hi = Math.min(x1, Math.max(xa, xb));
      if (lo > hi) continue;
      const yAt = (x: number) => ya + ((x - xa) / (xb - xa)) * (yb - ya);
      const ys = xa === xb ? [ya, yb] : [yAt(lo), yAt(hi)];
      hullLo = Math.min(hullLo, ...ys);
      hullHi = Math.max(hullHi, ...ys);
    }
    for (let k = 0; k + 3 < g.bands.length; k += 4) {
      if (g.bands[k] < x1 && g.bands[k + 1] > x0) {
        hullLo = Math.min(hullLo, g.bands[k + 2]);
        hullHi = Math.max(hullHi, g.bands[k + 3]);
      }
    }
    const lo = Math.max(hullLo, bottom, refLo);
    const hi = Math.min(hullHi, top, refHi);
    ratios.push(Math.max(0, hi - lo) / (refHi - refLo));
  }
  return ratios;
}

/**
 * G-17: a row-major mask of `size`'s pixels, 1 where the pixel centre (i + 0.5, j + 0.5) lies in
 * a span [yTop, yBottom, x0, x1] of `g` (yTop ≤ centre < yBottom and x0 ≤ centre < x1), else 0.
 */
export function shadedMask(g: RegionGeometry, size: PixelSize): Uint8Array {
  const width = Math.max(0, Math.ceil(size.width));
  const height = Math.max(0, Math.ceil(size.height));
  const mask = new Uint8Array(width * height);
  // The first pixel whose centre is at or past the px coordinate c, kept within [0, n].
  const firstFrom = (c: number, n: number) => Math.min(n, Math.max(0, Math.ceil(c - 0.5)));
  const { spans } = g;
  for (let s = 0; s + 3 < spans.length; s += 4) {
    const [j0, j1] = [firstFrom(spans[s], height), firstFrom(spans[s + 1], height)];
    const [i0, i1] = [firstFrom(spans[s + 2], width), firstFrom(spans[s + 3], width)];
    for (let j = j0; j < j1; j++) {
      if (i0 < i1) mask.fill(1, j * width + i0, j * width + i1);
    }
  }
  return mask;
}

/** Wraps `fn` so a test can count its calls. */
export function counted<A extends unknown[]>(
  fn: (...a: A) => number
): { fn: (...a: A) => number; calls(): number } {
  let calls = 0;
  return {
    fn: (...a: A) => {
      calls++;
      return fn(...a);
    },
    calls: () => calls,
  };
}

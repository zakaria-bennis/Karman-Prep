// The polyline a trace measures against (POI-LIVE-10, POI-LIVE-11): an explicit branch sampled the
// way the reference samples a curve it draws, so the trace point and the curve hit match it to the
// pixel. The independent axis is sampled every quarter px across the view (at least 5 samples);
// where a run meets an undefined sample its edge is found by bisection; a jump through a pole
// breaks the run; and points the line already passes within a quarter px on each axis are dropped
// (a straight line keeps only its two ends). Coordinates are CSS px: u along the independent axis,
// w along the other. Pure: no DOM.

import type { PoiBranch } from "@/lib/calculator/poi/types";

export interface Polyline {
  u: Float64Array;
  w: Float64Array; // NaN at u = NaN between runs
}

/** The px ↔ world maps of a branch's axes: `u` is the independent coordinate's px. */
export interface Axes {
  toU(t: number): number;
  fromU(u: number): number;
  toW(v: number): number;
  span: number; // px along u
  wSpan: number; // px along w
  /** Sampling starts at u = span: the axis minimum, at the bottom for an x=g(y) branch. */
  fromEnd: boolean;
}

export const SAMPLE_PX = 0.25;
export const TOLERANCE_PX = 0.25;
const MIN_SAMPLES = 5;
const EDGE_BISECTIONS = 40;

const isNum = Number.isFinite;

/**
 * Keeps a polyline's runs, dropping each point the line from the last kept point through the
 * pending pivot already passes within TOLERANCE_PX on both axes, unless the line turns back.
 */
class Accumulator {
  readonly u: number[] = [];
  readonly w: number[] = [];
  private run: number[] = [];
  private pivot: [number, number] | null = null;
  private pending: [number, number] | null = null;

  private last(): [number, number] {
    const n = this.run.length;
    return [this.run[n - 2], this.run[n - 1]];
  }

  private colinear(r: [number, number], p: [number, number], t: [number, number]): boolean {
    const dx = p[0] - r[0],
      dy = p[1] - r[1],
      len2 = dx * dx + dy * dy;
    if (len2 === 0) return false;
    const a = ((t[0] - r[0]) * dx + (t[1] - r[1]) * dy) / len2;
    if (a < 1) return false;
    return (
      Math.abs(t[0] - (r[0] + a * dx)) <= TOLERANCE_PX &&
      Math.abs(t[1] - (r[1] + a * dy)) <= TOLERANCE_PX
    );
  }

  add(u: number, w: number): void {
    const t: [number, number] = [u, w];
    if (this.run.length === 0) {
      this.run.push(u, w);
      return;
    }
    const r = this.last();
    if (u === r[0] && w === r[1]) return;
    if (this.pivot === null || this.pending === null) {
      this.pivot = this.pending = t;
      return;
    }
    const back =
      Math.hypot(r[0] - u, r[1] - w) < Math.hypot(r[0] - this.pending[0], r[1] - this.pending[1]);
    if (!this.colinear(r, this.pivot, t) || back) {
      this.flush();
      this.pivot = t;
    }
    this.pending = t;
  }

  private flush(): void {
    if (this.pending !== null) this.run.push(...this.pending);
    this.pivot = this.pending = null;
  }

  breakRun(): void {
    this.flush();
    if (this.run.length > 2) {
      if (this.u.length > 0) {
        this.u.push(NaN);
        this.w.push(NaN);
      }
      for (let k = 0; k < this.run.length; k += 2) {
        this.u.push(this.run[k]);
        this.w.push(this.run[k + 1]);
      }
    }
    this.run = [];
  }
}

/** The px u in [a, b] where w turns from finite to not (or back), by bisection. */
function edge(a: number, b: number, w: (u: number) => number): number {
  const finiteAtA = isNum(w(a));
  for (let k = 0; k < EDGE_BISECTIONS; k++) {
    const m = (a + b) / 2;
    if (isNum(w(m)) === finiteAtA) a = m;
    else b = m;
  }
  return finiteAtA ? a : b;
}

/**
 * Whether the curve jumps between finite samples (u0, w0) and (u1, w1): both beyond the view
 * on opposite sides, or a midpoint outside the pair's range by more than the view's height.
 */
function jumps(
  u0: number,
  w0: number,
  u1: number,
  w1: number,
  w: (u: number) => number,
  h: number
) {
  if (Math.abs(w1 - w0) <= h) return false;
  const m = w((u0 + u1) / 2);
  return !isNum(m) || m > Math.max(w0, w1) + h || m < Math.min(w0, w1) - h;
}

/** POI-LIVE-10: branch `b` sampled across the view as the reference samples a drawn curve. */
export function tracePolyline(b: PoiBranch, axes: Axes): Polyline {
  const wAt = (u: number) => axes.toW(b.f(axes.fromU(u)));
  const n = Math.max(MIN_SAMPLES, 1 + Math.ceil(axes.span / SAMPLE_PX));
  const acc = new Accumulator();
  const uAt = (k: number) => ((axes.fromEnd ? n - 1 - k : k) * axes.span) / (n - 1);
  let pu = uAt(0),
    pw = wAt(pu);
  if (isNum(pw)) acc.add(pu, pw);
  for (let k = 1; k < n; k++) {
    let u = uAt(k),
      w = wAt(u);
    if (!isNum(w) && k < n - 1) {
      // An undefined sample is tried a tenth of a step either side, forward first.
      const m = Math.abs(pu - u) / 10;
      for (const v of axes.fromEnd ? [u - m, u + m] : [u + m, u - m]) {
        const wv = wAt(v);
        if (isNum(wv)) {
          [u, w] = [v, wv];
          break;
        }
      }
    }
    if (isNum(w) && isNum(pw)) {
      if (jumps(pu, pw, u, w, wAt, axes.wSpan)) acc.breakRun();
      acc.add(u, w);
    } else if (isNum(w)) {
      const e = edge(pu, u, wAt);
      if (e !== u) acc.add(e, wAt(e));
      acc.add(u, w);
    } else if (isNum(pw)) {
      const e = edge(pu, u, wAt);
      if (e !== pu) acc.add(e, wAt(e));
      acc.breakRun();
    }
    pu = u;
    pw = w;
  }
  acc.breakRun();
  return { u: Float64Array.from(acc.u), w: Float64Array.from(acc.w) };
}

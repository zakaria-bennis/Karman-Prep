// Explicit curves y = f(x) and x = f(y) (G-9 to G-13, G-15). The independent axis t is sampled
// every half pixel; pairs that jump are bisected to find poles, pairs that meet an undefined sample
// are bisected to find the domain edge, and the rest join into polylines clipped to a guard band
// half a view beyond each edge. Pure TypeScript, no DOM (AR-44).

import type { Deadline } from "../core/deadline";
import { EvaluationBudget, EXPLICIT_BUDGET } from "./budget";
import type { CurveGeometry, RealFn1 } from "./geometry";
import type { ViewSpec } from "./viewport";

/** t runs t0..t1 over tPx px, v runs v0..v1 over vPx px. */
export type ExplicitFrame = Record<"t0" | "t1" | "tPx" | "v0" | "v1" | "vPx", number>;
/**
 * In frame coordinates: polyline [t, v, …] with NaN, NaN between runs; bands
 * [tStart, tEnd, vMin, vMax, …].
 */
export type ExplicitSamples = { polyline: number[]; bands: number[] };

export const MAX_COLUMNS = 4096;
export const POLE_BISECTIONS = 30;
export const EDGE_BISECTIONS = 12;
export const GUARD_FRACTION = 0.5;

/** The sampling frame of an explicit curve whose independent variable is `independent`. */
export function explicitFrame(view: ViewSpec, independent: "x" | "y"): ExplicitFrame {
  const { viewport: v, size } = view;
  return independent === "x"
    ? { t0: v.left, t1: v.right, tPx: size.width, v0: v.bottom, v1: v.top, vPx: size.height }
    : { t0: v.bottom, t1: v.top, tPx: size.height, v0: v.left, v1: v.right, vPx: size.width };
}

/**
 * Samples kept in one t-sorted singly linked list. Sample 0 is t0; samples 0 … 2C are the base
 * grid, so base sample 2c is the left boundary of column c. A pair is a sample and its successor.
 */
class ExplicitSampler {
  private readonly t: number[] = [];
  private readonly v: number[] = []; // NaN where f is not finite
  private readonly next: number[] = []; // -1 after the last sample
  private readonly col: number[] = []; // column of the pair a sample starts, -1 for the last
  private readonly poleBreak: number[] = []; // 1 when the pair a sample starts is never joined
  private readonly f: RealFn1;
  private readonly frame: ExplicitFrame;
  private readonly budget: EvaluationBudget;
  private readonly columns: number;
  private readonly band: Uint8Array;
  private readonly vScale: number;
  private readonly guardLow: number;
  private readonly guardHigh: number;

  constructor(f: RealFn1, frame: ExplicitFrame, budget: EvaluationBudget) {
    this.f = f;
    this.frame = frame;
    this.budget = budget;
    const px = Number.isFinite(frame.tPx) ? Math.ceil(frame.tPx) : 1;
    this.columns = Math.max(1, Math.min(px, MAX_COLUMNS, Math.floor((budget.remaining - 1) / 2)));
    this.band = new Uint8Array(this.columns);
    const span = frame.v1 - frame.v0;
    this.vScale = frame.vPx / span;
    this.guardLow = frame.v0 - GUARD_FRACTION * span;
    this.guardHigh = frame.v1 + GUARD_FRACTION * span;
  }

  /** One evaluation: undefined when the budget refuses it, NaN when f is not finite. */
  private evaluate(t: number): number | undefined {
    if (!this.budget.take()) return undefined;
    const y = this.f(t);
    return Number.isFinite(y) ? y : NaN;
  }

  private push(t: number, v: number, next: number, col: number): number {
    this.t.push(t);
    this.v.push(v);
    this.next.push(next);
    this.col.push(col);
    this.poleBreak.push(0);
    return this.t.length - 1;
  }

  /** Inserts a sample inside the pair starting at `a`; both halves stay in a's column. */
  private insertAfter(a: number, t: number, v: number): number {
    const m = this.push(t, v, this.next[a], this.col[a]);
    this.next[a] = m;
    return m;
  }

  /** |Δv| of the pair starting at `a`, in px. */
  private jumpPx(a: number): number {
    return Math.abs(this.v[this.next[a]] - this.v[a]) * this.vScale;
  }

  /** Both values beyond the same guard line: never drawn, so never refined. */
  private offView(va: number, vb: number): boolean {
    return (
      (va > this.guardHigh && vb > this.guardHigh) || (va < this.guardLow && vb < this.guardLow)
    );
  }

  /** The midpoint of the pair (a, b), or NaN when no number lies strictly between them. */
  private midpoint(a: number, b: number): number {
    const tm = 0.5 * (this.t[a] + this.t[b]);
    return tm > this.t[a] && tm < this.t[b] ? tm : NaN;
  }

  /** Phase 1: the half-pixel base grid, sample t0 + j·w/2 for j = 0 … 2C (j = 2C is t1). */
  grid(): void {
    const { t0, t1 } = this.frame;
    const last = 2 * this.columns;
    const w = (t1 - t0) / this.columns;
    for (let j = 0; j <= last; j++) {
      const t = j === last ? t1 : t0 + (j * w) / 2;
      const v = this.evaluate(t);
      if (v === undefined) {
        this.band[Math.max(0, Math.floor((j - 1) / 2))] = 1;
        this.band[Math.min(this.columns - 1, Math.floor(j / 2))] = 1;
      }
      this.push(t, v ?? NaN, j < last ? j + 1 : -1, j < last ? Math.floor(j / 2) : -1);
    }
  }

  /**
   * Phase 4 for one phase: refines `items` in t order, skipping those in band columns. When the
   * budget refuses, the columns of the item in progress and of every later item become bands.
   */
  private refineAll(items: number[], refine: (a: number) => boolean): void {
    for (let k = 0; k < items.length; k++) {
      if (this.band[this.col[items[k]]] === 1) continue;
      if (!refine(items[k])) {
        for (let r = k; r < items.length; r++) this.band[this.col[items[r]]] = 1;
        return;
      }
    }
  }

  /** Phase 2: bisect pairs that jump more than the view height or cross zero by more than 1 px. */
  poles(): void {
    const candidates: number[] = [];
    for (let a = 0; this.next[a] >= 0; a = this.next[a]) {
      const va = this.v[a];
      const vb = this.v[this.next[a]];
      if (Number.isNaN(va) || Number.isNaN(vb) || this.offView(va, vb)) continue;
      const jump = this.jumpPx(a);
      if (jump > this.frame.vPx || (va * vb < 0 && jump > 1)) candidates.push(a);
    }
    this.refineAll(candidates, (a) => this.bisectPole(a));
  }

  /**
   * Halves the pair starting at `start` up to POLE_BISECTIONS times, keeping the half with the
   * larger |Δv|; the other half stays an ordinary pair. A pair too narrow to halve (deep zoom)
   * ends the halving early, as if every bisection were spent. False when the budget refuses.
   */
  private bisectPole(start: number): boolean {
    let a = start;
    for (let n = 0; n < POLE_BISECTIONS; n++) {
      const b = this.next[a];
      const tm = this.midpoint(a, b);
      if (Number.isNaN(tm)) break;
      const vm = this.evaluate(tm);
      if (vm === undefined) return false;
      const m = this.insertAfter(a, tm, vm);
      if (Number.isNaN(vm)) return true; // split at an undefined point: both mixed pairs are edges
      if (Math.abs(this.v[b] - vm) > Math.abs(vm - this.v[a])) a = m;
      if (this.jumpPx(a) <= 1) return true; // continuous
    }
    if (this.jumpPx(a) > this.frame.vPx) this.poleBreak[a] = 1;
    else this.band[this.col[a]] = 1;
    return true;
  }

  /** Phase 3: bisect each pair with exactly one undefined value toward the domain edge. */
  edges(): void {
    const mixed: number[] = [];
    for (let a = 0; this.next[a] >= 0; a = this.next[a]) {
      if (Number.isNaN(this.v[a]) !== Number.isNaN(this.v[this.next[a]])) mixed.push(a);
    }
    this.refineAll(mixed, (a) => this.bisectEdge(a));
  }

  /** Halves a mixed pair EDGE_BISECTIONS times, keeping the half that is still mixed. */
  private bisectEdge(start: number): boolean {
    let a = start;
    for (let n = 0; n < EDGE_BISECTIONS; n++) {
      const tm = this.midpoint(a, this.next[a]);
      if (Number.isNaN(tm)) break;
      const vm = this.evaluate(tm);
      if (vm === undefined) return false;
      const m = this.insertAfter(a, tm, vm);
      if (Number.isNaN(vm) === Number.isNaN(this.v[a])) a = m;
    }
    return true;
  }

  /** The point of segment (a, b) where v reaches `target`. */
  private crossing(a: number, b: number, target: number): [number, number] {
    const [ta, va] = [this.t[a], this.v[a]];
    return [ta + ((target - va) / (this.v[b] - va)) * (this.t[b] - ta), target];
  }

  /** The endpoint `end` of segment (a, b), moved along it to the guard line it lies beyond. */
  private endpoint(a: number, b: number, end: number): [number, number, boolean] {
    const y = this.v[end];
    if (y > this.guardHigh) return [...this.crossing(a, b, this.guardHigh), true];
    if (y < this.guardLow) return [...this.crossing(a, b, this.guardLow), true];
    return [this.t[end], y, false];
  }

  /** Phase 5: bands for band columns, segments for every drawable pair of the other columns. */
  assemble(): ExplicitSamples {
    const { v0, v1 } = this.frame;
    const polyline: number[] = [];
    const low = new Float64Array(this.columns).fill(Infinity);
    const high = new Float64Array(this.columns).fill(-Infinity);
    let joint = -1; // the unmoved sample the last segment ended on
    for (let a = 0; this.next[a] >= 0; a = this.next[a]) {
      const b = this.next[a];
      const c = this.col[a];
      const [va, vb] = [this.v[a], this.v[b]];
      if (this.band[c] === 1) {
        for (const y of [va, vb]) {
          if (Number.isNaN(y)) continue;
          low[c] = Math.min(low[c], y);
          high[c] = Math.max(high[c], y);
        }
        joint = -1;
        continue;
      }
      const hidden = (va > v1 && vb > v1) || (va < v0 && vb < v0);
      if (Number.isNaN(va) || Number.isNaN(vb) || this.poleBreak[a] === 1 || hidden) continue;
      const [ts, vs] = this.endpoint(a, b, a);
      const [te, ve, endMoved] = this.endpoint(a, b, b);
      if (joint !== a) {
        if (polyline.length > 0) polyline.push(NaN, NaN);
        polyline.push(ts, vs);
      }
      polyline.push(te, ve);
      joint = endMoved ? -1 : b;
    }
    const bands: number[] = [];
    for (let c = 0; c < this.columns; c++) {
      if (this.band[c] === 0 || low[c] > high[c]) continue;
      const vMin = Math.max(low[c], this.guardLow);
      const vMax = Math.min(high[c], this.guardHigh);
      if (vMin <= vMax) bands.push(this.t[2 * c], this.t[2 * c + 2], vMin, vMax);
    }
    return { polyline, bands };
  }
}

/** Samples f over the frame within the budget (G-9 to G-13); results are in frame coordinates. */
export function sampleExplicit(
  f: RealFn1,
  frame: ExplicitFrame,
  budget: EvaluationBudget
): ExplicitSamples {
  const sampler = new ExplicitSampler(f, frame, budget);
  sampler.grid();
  sampler.poles();
  sampler.edges();
  return sampler.assemble();
}

/** y = f(x) for independent "x", x = f(y) for "y", within EXPLICIT_BUDGET evaluations (G-15). */
export function plotExplicit(
  rowId: string,
  independent: "x" | "y",
  f: RealFn1,
  view: ViewSpec,
  deadline: Deadline
): CurveGeometry {
  const budget = new EvaluationBudget(EXPLICIT_BUDGET, deadline);
  const { polyline, bands } = sampleExplicit(f, explicitFrame(view, independent), budget);
  if (independent === "y") {
    for (let k = 0; k + 1 < polyline.length; k += 2) {
      [polyline[k], polyline[k + 1]] = [polyline[k + 1], polyline[k]];
    }
    for (let k = 0; k + 3 < bands.length; k += 4) {
      [bands[k], bands[k + 1], bands[k + 2], bands[k + 3]] = [
        bands[k + 2],
        bands[k + 3],
        bands[k],
        bands[k + 1],
      ];
    }
  }
  return {
    rowId,
    kind: "curve",
    polylines: Float64Array.from(polyline),
    bands: Float64Array.from(bands),
    dashed: false,
    evaluations: budget.used,
  };
}

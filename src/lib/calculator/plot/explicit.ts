// Explicit curves y = f(x) and x = f(y) (G-9 to G-13, G-15). The independent axis t is sampled
// every half pixel; pairs that jump are bisected to find poles and jumps (floor, mod, sign and
// piecewise seams break there instead of drawing a riser, as in Desmos), extrema closer than
// BAND_EXTREMA_PX turn their columns into filled bands, pairs that meet an undefined sample are
// bisected to find the domain edge, the remaining extrema are refined, band columns are sampled
// across their width, and the rest join into polylines clipped to a guard band half a view beyond
// each edge. Pure TypeScript, no DOM (AR-44).

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
/** A pair is bisected as a possible jump when its |Δv| is over this many times both neighbours'. */
export const JUMP_SPIKE = 3;
/** A jump is clean when the halves set aside in this many final halvings each moved ≤ 1 px. */
export const CLEAN_JUMP_ROUNDS = 10;
export const EDGE_BISECTIONS = 12;
/**
 * Past EDGE_BISECTIONS, a domain edge keeps halving (up to EDGE_BISECTIONS_MAX) while its defined
 * end still moves more than EDGE_SETTLE_PX and lies inside the guard band, so log(sin x) runs its
 * spikes off the view as Desmos does.
 */
export const EDGE_BISECTIONS_MAX = 64;
const EDGE_SETTLE_PX = 0.5;
export const GUARD_FRACTION = 0.5;
export const BAND_EXTREMA_PX = 2;
export const EXTREMUM_ROUNDS = 5;
export const BAND_SAMPLES_PER_COLUMN = 64;
/**
 * Deviation from Task 3's turn rule, which counts any sign change of Δv: a function that is
 * constant up to rounding (sin²x + cos²x, 2^x·2^−x) turns at almost every sample. Two turns band
 * their columns only when v swings at least BAND_SWING_PX between them, so a band is never thinner
 * than a pixel, and a turn whose two pairs both move less than TURN_NOISE_PX is not refined, as no
 * refinement can move it a visible amount.
 */
const BAND_SWING_PX = 1;
const TURN_NOISE_PX = 1e-6;

/**
 * A local extremum: sample `k` inside a finite run, `prev` the sample before it when found (an
 * earlier refinement may insert samples between them), `run` its finite run's ordinal.
 */
type Turn = { k: number; prev: number; max: boolean; run: number };

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

  /** The column of the pair starting at `a`, as the one-column range [first, last]. */
  private readonly pairColumn = (a: number): [number, number] => [this.col[a], this.col[a]];

  /**
   * Phase 4 for one phase: refines `items` in t order, skipping those whose columns
   * (`columns(item)` gives the first and last) are all bands. When the budget refuses, the columns
   * of the item in progress and of every later item become bands.
   */
  private refineAll<T>(
    items: T[],
    refine: (item: T) => boolean,
    columns: (item: T) => [number, number]
  ): void {
    for (let k = 0; k < items.length; k++) {
      const [first, last] = columns(items[k]);
      if (this.band.subarray(first, last + 1).every((b) => b === 1)) continue;
      if (!refine(items[k])) {
        for (let r = k; r < items.length; r++) {
          const [from, to] = columns(items[r]);
          this.band.fill(1, from, to + 1);
        }
        return;
      }
    }
  }

  /**
   * Phase 2: bisect pairs that jump more than the view height, cross or meet zero by more than
   * 1 px, or jump more than 1 px and more than JUMP_SPIKE times both neighbouring pairs (a step, a
   * sawtooth wrap or a piecewise seam, where the curve on either side is flat or gentle).
   */
  poles(): void {
    const candidates: number[] = [];
    const jumps: number[] = []; // the base pairs' |Δv| in px, NaN for a pair with an undefined value
    for (let a = 0; this.next[a] >= 0; a = this.next[a]) {
      const va = this.v[a];
      const vb = this.v[this.next[a]];
      jumps.push(Number.isNaN(va) || Number.isNaN(vb) ? NaN : this.jumpPx(a));
    }
    const near = (k: number) => (k >= 0 && k < jumps.length && jumps[k] >= 0 ? jumps[k] : 0);
    for (let a = 0; this.next[a] >= 0; a = this.next[a]) {
      const va = this.v[a];
      const vb = this.v[this.next[a]];
      if (Number.isNaN(va) || Number.isNaN(vb) || this.offView(va, vb)) continue;
      const jump = jumps[a];
      const spike = jump > 1 && jump > JUMP_SPIKE * Math.max(near(a - 1), near(a + 1));
      if (jump > this.frame.vPx || (va * vb <= 0 && jump > 1) || spike) candidates.push(a);
    }
    this.refineAll(candidates, (a) => this.bisectPole(a), this.pairColumn);
  }

  /**
   * Halves the pair starting at `start` up to POLE_BISECTIONS times, keeping the half with the
   * larger |Δv|; the other half stays an ordinary pair. A pair too narrow to halve (deep zoom)
   * ends the halving early, as if every bisection were spent. A jump still over 1 px at the end is
   * a break when it is over the view height (a pole) or when every half set aside in the last
   * CLEAN_JUMP_ROUNDS halvings moved at most 1 px (a jump between flat or gentle pieces: floor,
   * mod, sign, a piecewise seam); otherwise (wild oscillation) its column becomes a band. False
   * when the budget refuses.
   */
  private bisectPole(start: number): boolean {
    let a = start;
    let messy = 0; // the last halving whose set-aside half moved more than 1 px
    let n = 0;
    for (; n < POLE_BISECTIONS; n++) {
      const b = this.next[a];
      const tm = this.midpoint(a, b);
      if (Number.isNaN(tm)) break;
      const vm = this.evaluate(tm);
      if (vm === undefined) return false;
      const m = this.insertAfter(a, tm, vm);
      if (Number.isNaN(vm)) return true; // split at an undefined point: both mixed pairs are edges
      const right = Math.abs(this.v[b] - vm) > Math.abs(vm - this.v[a]);
      const aside = right ? a : m;
      if (right) a = m;
      if (this.jumpPx(aside) > 1) messy = n + 1;
      if (this.jumpPx(a) <= 1) return true; // continuous
    }
    if (this.jumpPx(a) > this.frame.vPx || n - messy >= Math.min(n, CLEAN_JUMP_ROUNDS)) {
      this.poleBreak[a] = 1;
    } else {
      this.band[this.col[a]] = 1;
    }
    return true;
  }

  /** Phase 3: bisect each pair with exactly one undefined value toward the domain edge. */
  edges(): void {
    const mixed: number[] = [];
    for (let a = 0; this.next[a] >= 0; a = this.next[a]) {
      if (Number.isNaN(this.v[a]) !== Number.isNaN(this.v[this.next[a]])) mixed.push(a);
    }
    this.refineAll(mixed, (a) => this.bisectEdge(a), this.pairColumn);
  }

  /**
   * Halves a mixed pair EDGE_BISECTIONS times, keeping the half that is still mixed, then goes on
   * up to EDGE_BISECTIONS_MAX while the defined end keeps moving more than EDGE_SETTLE_PX and is
   * not beyond a guard line; a value that leaps more than the view height is not kept.
   */
  private bisectEdge(start: number): boolean {
    let a = start;
    for (let n = 0; n < EDGE_BISECTIONS_MAX; n++) {
      const b = this.next[a];
      const defined = Number.isNaN(this.v[a]) ? this.v[b] : this.v[a];
      if (n >= EDGE_BISECTIONS && (defined > this.guardHigh || defined < this.guardLow)) break;
      const tm = this.midpoint(a, b);
      if (Number.isNaN(tm)) break;
      const vm = this.evaluate(tm);
      if (vm === undefined) return false;
      const move = Math.abs(vm - defined) * this.vScale;
      if (n >= EDGE_BISECTIONS && move > this.frame.vPx) break; // a leap, not a settling edge
      const m = this.insertAfter(a, tm, vm);
      if (Number.isNaN(vm) === Number.isNaN(this.v[a])) a = m;
      const settled = !Number.isNaN(vm) && move <= EDGE_SETTLE_PX;
      if (n + 1 >= EDGE_BISECTIONS && settled) break;
    }
    return true;
  }

  /** True when the pair starting at `a` ends a finite run: a value is NaN or it is a pole break. */
  private breaks(a: number): boolean {
    return Number.isNaN(this.v[a]) || Number.isNaN(this.v[this.next[a]]) || this.poleBreak[a] === 1;
  }

  /**
   * The turns in t order: samples k inside a finite run with v_k − v_{k−1} > 0 and
   * v_{k+1} − v_k ≤ 0 (a maximum) or < 0 and ≥ 0 (a minimum).
   */
  private turns(): Turn[] {
    const turns: Turn[] = [];
    let run = 0;
    for (let p = -1, k = 0; this.next[k] >= 0; p = k, k = this.next[k]) {
      if (this.breaks(k)) run++;
      if (p < 0 || this.breaks(p) || this.breaks(k)) continue;
      const before = this.v[k] - this.v[p];
      const after = this.v[this.next[k]] - this.v[k];
      if ((before > 0 && after <= 0) || (before < 0 && after >= 0)) {
        turns.push({ k, prev: p, max: before > 0, run });
      }
    }
    return turns;
  }

  /** The columns of a turn's two pairs, the one ending at it and the one starting at it. */
  private readonly turnColumns = (turn: Turn): [number, number] => [
    this.col[turn.prev],
    this.col[turn.k],
  ];

  /**
   * After phase 2 (G-12): for consecutive turns p, q of one run less than BAND_EXTREMA_PX apart
   * whose values differ by at least BAND_SWING_PX, every column meeting [t_p, t_q] becomes a band.
   */
  oscillation(): void {
    const turns = this.turns();
    const pxPerT = this.frame.tPx / (this.frame.t1 - this.frame.t0);
    for (let i = 1; i < turns.length; i++) {
      const [p, q] = [turns[i - 1], turns[i]];
      if (p.run !== q.run || !((this.t[q.k] - this.t[p.k]) * pxPerT < BAND_EXTREMA_PX)) continue;
      if (!(Math.abs(this.v[q.k] - this.v[p.k]) * this.vScale >= BAND_SWING_PX)) continue;
      this.band.fill(1, this.col[p.prev], this.col[q.k] + 1);
    }
  }

  /** Inserts the midpoint of the pair starting at `a`: its index, -1 when none, undefined when refused. */
  private split(a: number): number | undefined {
    const tm = this.midpoint(a, this.next[a]);
    if (Number.isNaN(tm)) return -1;
    const vm = this.evaluate(tm);
    return vm === undefined ? undefined : this.insertAfter(a, tm, vm);
  }

  /**
   * After phase 3: each turn in a non-band column whose two pairs are not both off-view and not
   * both under TURN_NOISE_PX gets EXTREMUM_ROUNDS rounds; phase 4 applies.
   */
  extrema(): void {
    const turns = this.turns().filter(
      ({ k, prev }) =>
        (!this.offView(this.v[prev], this.v[k]) ||
          !this.offView(this.v[k], this.v[this.next[k]])) &&
        Math.max(this.jumpPx(prev), this.jumpPx(k)) >= TURN_NOISE_PX
    );
    this.refineAll(turns, (turn) => this.refineTurn(turn), this.turnColumns);
  }

  /**
   * A round samples the midpoints between the turn and its neighbours and moves the turn to the
   * most extreme of the three (an undefined midpoint never wins). False when the budget refuses.
   */
  private refineTurn(turn: Turn): boolean {
    let k = turn.k;
    let a = turn.prev;
    while (this.next[a] !== k) a = this.next[a]; // an earlier turn may have split this pair
    const beats = (m: number, than: number) =>
      m >= 0 && (turn.max ? this.v[m] > this.v[than] : this.v[m] < this.v[than]);
    for (let round = 0; round < EXTREMUM_ROUNDS; round++) {
      const left = this.split(a);
      if (left === undefined) return false;
      const right = this.split(k);
      if (right === undefined) return false;
      if (left < 0 && right < 0) break; // too narrow to halve (deep zoom)
      if (beats(left, k) && !beats(right, left)) {
        k = left;
      } else if (beats(right, k)) {
        [a, k] = [k, right];
      } else if (left >= 0) {
        a = left;
      }
    }
    return true;
  }

  /** True when column c holds a pair that is not off-view. */
  private holdsVisiblePair(c: number): boolean {
    for (let a = 2 * c; a !== 2 * c + 2; a = this.next[a]) {
      if (!this.offView(this.v[a], this.v[this.next[a]])) return true;
    }
    return false;
  }

  /**
   * Before assembly (G-12, G-15): with B band columns holding a pair that is not off-view, each
   * samples tStart + (k + 0.5)·w/n for k < n = min(BAND_SAMPLES_PER_COLUMN, floor(remaining/B)).
   */
  bandSamples(): void {
    const sampled: number[] = [];
    for (let c = 0; c < this.columns; c++) {
      if (this.band[c] === 1 && this.holdsVisiblePair(c)) sampled.push(c);
    }
    if (sampled.length === 0) return;
    const n = Math.min(BAND_SAMPLES_PER_COLUMN, Math.floor(this.budget.remaining / sampled.length));
    const w = (this.frame.t1 - this.frame.t0) / this.columns;
    for (const c of sampled) {
      const end = 2 * c + 2;
      let a = 2 * c;
      for (let k = 0; k < n; k++) {
        const t = this.t[2 * c] + ((k + 0.5) * w) / n;
        while (this.next[a] !== end && this.t[this.next[a]] <= t) a = this.next[a];
        if (!(t > this.t[a] && t < this.t[this.next[a]])) continue; // already sampled
        const v = this.evaluate(t);
        if (v === undefined) return;
        a = this.insertAfter(a, t, v);
      }
    }
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
  sampler.oscillation();
  sampler.edges();
  sampler.extrema();
  sampler.bandSamples();
  return sampler.assemble();
}

/**
 * y = f(x) for independent "x", x = f(y) for "y", within `limit` evaluations (G-15: EXPLICIT_BUDGET
 * for one curve, less for each branch of a list of curves).
 */
export function plotExplicit(
  rowId: string,
  independent: "x" | "y",
  f: RealFn1,
  view: ViewSpec,
  deadline: Deadline,
  limit = EXPLICIT_BUDGET
): CurveGeometry {
  const budget = new EvaluationBudget(limit, deadline);
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

// Lines x = c, y = c and the roots of one-variable equations (G-8). The independent axis t is
// sampled every half pixel; a sample that is exactly zero is a root unless a neighbour is zero too
// (f vanishing over an interval, such as x = x, draws nothing, as in Desmos, but where it meets
// f > 0 is a line, so floor(x) = 0 draws x = 1), a pair with strictly opposite signs is bisected
// toward its root (a pair whose sign change is a pole is rejected), and a sample whose neighbours
// share its sign but lie further from zero is searched for a touching root such as (x − 3)² = 0.
// Lines carry positions only; 08 strokes each across the whole view. Pure TypeScript, no DOM
// (AR-44).

import type { Deadline } from "../core/deadline";
import { EvaluationBudget, EXPLICIT_BUDGET } from "./budget";
import { MAX_COLUMNS } from "./explicit";
import type { LineSetGeometry, RealFn1 } from "./geometry";
import type { ViewSpec } from "./viewport";

export const ROOT_BISECTIONS = 10;
export const TOUCH_ROUNDS = 16;
export const TOUCH_TOLERANCE = 1e-9;

/** True when a and b are finite with strictly opposite signs (NaN is never either sign). */
function opposite(a: number, b: number): boolean {
  return (a < 0 && b > 0) || (a > 0 && b < 0);
}

/** The roots of f over one axis of a view, in ascending order. */
class RootFinder {
  private readonly t: Float64Array;
  private readonly v: Float64Array; // NaN where f is not finite or the budget refused
  private readonly spacing: number;
  private readonly f: RealFn1;
  private readonly budget: EvaluationBudget;

  /** Samples t0 + j·(t1 − t0)/(2C) for j = 0 … 2C. */
  constructor(f: RealFn1, t0: number, t1: number, columns: number, budget: EvaluationBudget) {
    this.f = f;
    this.budget = budget;
    const last = 2 * columns;
    this.spacing = (t1 - t0) / last;
    this.t = new Float64Array(last + 1);
    this.v = new Float64Array(last + 1);
    for (let j = 0; j <= last; j++) {
      this.t[j] = t0 + (j * (t1 - t0)) / last;
      this.v[j] = this.evaluate(this.t[j]) ?? NaN;
    }
  }

  /** One evaluation: undefined when the budget refuses it, NaN when f is not finite. */
  private evaluate(t: number): number | undefined {
    if (!this.budget.take()) return undefined;
    const y = this.f(t);
    return Number.isFinite(y) ? y : NaN;
  }

  /** Every root in t order: exact zeros, sign changes and touching roots. */
  roots(): number[] {
    const { t, v } = this;
    const roots: number[] = [];
    const add = (root: number | null | undefined) => {
      if (typeof root === "number") roots.push(root);
    };
    for (let k = 0; k < t.length; k++) {
      if (v[k] === 0) {
        // A zero beside another zero lies in an interval where f vanishes (x = x): no line there.
        if (v[k - 1] !== 0 && v[k + 1] !== 0) roots.push(t[k]);
        else if (v[k + 1] > 0)
          add(this.plateauEnd(k, k + 1)); // floor(x) = 0 draws x = 1
        else if (v[k - 1] > 0) add(this.plateauEnd(k, k - 1));
        continue;
      }
      if (this.touches(k)) add(this.touchingRoot(k));
      if (k + 1 < t.length && opposite(v[k], v[k + 1])) add(this.bracketRoot(k));
    }
    return roots.sort((a, b) => a - b);
  }

  /**
   * Bisects the pair (k, k + 1) ROOT_BISECTIONS times keeping the sign change (an exact zero ends
   * it), then evaluates the final midpoint m: the root is m unless |f(m)| exceeds the smaller |v|
   * of the original pair, which marks a pole. Null for no root, undefined when the budget refuses.
   *
   * Deviation from Task 4's rule: a pole also needs |f| at both ends of the final pair above that
   * smaller |v|. Around a pole |f| at every point of the final pair is far above the original
   * samples' values, but a root closer to a sample than the final midpoint keeps that sample as an
   * end, and |f(m)| then exceeds the sample's tiny |v| although no pole is there (a view panned by
   * 1e-6 or 4e-15 would lose the line x = 3, and the default view lost 4 of sin(100x)'s 637 roots).
   */
  private bracketRoot(k: number): number | null | undefined {
    const smaller = Math.min(Math.abs(this.v[k]), Math.abs(this.v[k + 1]));
    let [lo, hi, vLo, vHi] = [this.t[k], this.t[k + 1], this.v[k], this.v[k + 1]];
    for (let n = 0; n < ROOT_BISECTIONS; n++) {
      const m = 0.5 * (lo + hi);
      if (!(m > lo && m < hi)) break; // too narrow to halve (deep zoom)
      const vm = this.evaluate(m);
      if (vm === undefined) return undefined;
      if (vm === 0) return m;
      if (Number.isNaN(vm)) return null; // undefined inside the pair: not a root
      if (Math.sign(vm) === Math.sign(vLo)) {
        [lo, vLo] = [m, vm]; // the sign change is in [m, hi]
      } else {
        [hi, vHi] = [m, vm];
      }
    }
    const m = 0.5 * (lo + hi);
    const vm = this.evaluate(m);
    if (vm === undefined) return undefined;
    if (Number.isNaN(vm)) return null;
    const pole = Math.abs(vm) > smaller && Math.min(Math.abs(vLo), Math.abs(vHi)) > smaller;
    return pole ? null : m;
  }

  /**
   * Where an interval on which f vanishes (sample `zero`, a neighbour also zero) meets f > 0 at the
   * adjacent sample `positive`: bisected ROOT_BISECTIONS times keeping zero on one side. As in
   * Desmos, an equation's line runs between f ≤ 0 and f > 0. Undefined when the budget refuses.
   */
  private plateauEnd(zero: number, positive: number): number | null | undefined {
    if (zero + (zero - positive) < 0 || this.v[zero + (zero - positive)] !== 0) return null;
    let [z, p] = [this.t[zero], this.t[positive]];
    for (let n = 0; n < ROOT_BISECTIONS; n++) {
      const m = 0.5 * (z + p);
      if (m === z || m === p) break;
      const vm = this.evaluate(m);
      if (vm === undefined) return undefined;
      if (Number.isNaN(vm)) return null;
      if (vm > 0) p = m;
      else z = m;
    }
    return 0.5 * (z + p);
  }

  /**
   * A touching candidate: sample k whose neighbours share its strict sign, with |v_k| below
   * |v_{k−1}| and not above |v_{k+1}|.
   */
  private touches(k: number): boolean {
    if (k === 0 || k + 1 >= this.t.length) return false;
    const [a, b, c] = [this.v[k - 1], this.v[k], this.v[k + 1]];
    const shared = (a > 0 && b > 0 && c > 0) || (a < 0 && b < 0 && c < 0);
    return shared && Math.abs(b) < Math.abs(a) && Math.abs(b) <= Math.abs(c);
  }

  /**
   * Starting at p = t_k with h the sample spacing, each of up to TOUCH_ROUNDS rounds halves h,
   * evaluates p − h and p + h and moves p to the least σ·f of the three. The root is the first
   * evaluated point with σ·f ≤ 0, else p when σ·f(p) ≤ TOUCH_TOLERANCE·max(|v_{k−1}|, |v_{k+1}|).
   * Null for no root, undefined when the budget refuses.
   */
  private touchingRoot(k: number): number | null | undefined {
    const sigma = this.v[k] > 0 ? 1 : -1;
    const tolerance = TOUCH_TOLERANCE * Math.max(Math.abs(this.v[k - 1]), Math.abs(this.v[k + 1]));
    let [p, least, h] = [this.t[k], sigma * this.v[k], this.spacing];
    for (let round = 0; round < TOUCH_ROUNDS; round++) {
      h /= 2;
      const [left, right] = [p - h, p + h];
      if (left === p && right === p) break; // h is below the spacing of doubles at p (deep zoom)
      let best = p;
      for (const q of [left, right]) {
        if (q === p) continue;
        const vq = this.evaluate(q);
        if (vq === undefined) return undefined;
        const s = sigma * vq;
        if (s <= 0) return q; // a zero or a sign change
        if (s < least) [best, least] = [q, s];
      }
      p = best;
    }
    return least <= tolerance ? p : null;
  }
}

/**
 * The lines where f(t) = 0: t = x across the width for "vertical", t = y up the height for
 * "horizontal", within `limit` evaluations (G-8, G-15).
 */
export function plotLines(
  rowId: string,
  orientation: "vertical" | "horizontal",
  f: RealFn1,
  view: ViewSpec,
  deadline: Deadline,
  limit = EXPLICIT_BUDGET
): LineSetGeometry {
  const { viewport: v, size } = view;
  const [t0, t1, px] =
    orientation === "vertical" ? [v.left, v.right, size.width] : [v.bottom, v.top, size.height];
  const columns = Math.max(1, Math.min(Number.isFinite(px) ? Math.ceil(px) : 1, MAX_COLUMNS));
  const budget = new EvaluationBudget(limit, deadline);
  const roots = new RootFinder(f, t0, t1, columns, budget).roots();
  return {
    rowId,
    kind: "lines",
    orientation,
    positions: Float64Array.from(roots),
    dashed: false,
    evaluations: budget.used,
  };
}

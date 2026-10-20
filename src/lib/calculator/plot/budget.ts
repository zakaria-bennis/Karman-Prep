// Evaluation budgets (G-15). An evaluation is one call of an input closure; explicit curves and
// lines spend EXPLICIT_BUDGET per view, implicit curves and regions IMPLICIT_BUDGET.

import type { Deadline } from "../core/deadline";

export const EXPLICIT_BUDGET = 20_000; // G-15
export const IMPLICIT_BUDGET = 250_000; // G-15
export const DEADLINE_CHECK_EVERY = 1024;

/** Grants evaluations up to `limit` and polls the deadline each time the count passes a multiple of DEADLINE_CHECK_EVERY. */
export class EvaluationBudget {
  readonly limit: number;
  private readonly deadline: Deadline;
  private count = 0;
  private nextCheck = DEADLINE_CHECK_EVERY;

  constructor(limit: number, deadline: Deadline) {
    this.limit = limit;
    this.deadline = deadline;
  }

  get used(): number {
    return this.count;
  }

  get remaining(): number {
    return this.limit - this.count;
  }

  /** Counts `n` evaluations and returns true, or returns false and counts nothing past the limit. */
  take(n = 1): boolean {
    const used = this.count + n;
    if (used > this.limit) return false;
    this.count = used;
    if (used >= this.nextCheck) {
      this.nextCheck = (Math.floor(used / DEADLINE_CHECK_EVERY) + 1) * DEADLINE_CHECK_EVERY;
      this.deadline.check(); // throws DeadlineExceeded once expired
    }
    return true;
  }
}

/** G-22: the fewest evaluations a branch gets, enough for a smooth curve to sample as a curve. */
export const MIN_BRANCH_BUDGET = 200;

/**
 * G-15, G-22: each branch's evaluations when a row draws `branches` curves or line sets: one
 * curve's EXPLICIT_BUDGET, the row's total capped at 10× it, but never under MIN_BRANCH_BUDGET
 * (so Desmos's 10,000 branches of `y=[1...10000]x` take at most 2,000,000).
 */
export function explicitBranchBudget(branches: number): number {
  const share = Math.floor((10 * EXPLICIT_BUDGET) / Math.max(1, branches));
  return Math.max(MIN_BRANCH_BUDGET, Math.min(EXPLICIT_BUDGET, share));
}

/**
 * G-15, G-22: each branch's evaluations when a row draws `branches` implicit curves or regions:
 * IMPLICIT_BUDGET for one, else 2× it split across them, never under MIN_BRANCH_BUDGET.
 */
export function implicitBranchBudget(branches: number): number {
  if (branches <= 1) return IMPLICIT_BUDGET;
  return Math.max(MIN_BRANCH_BUDGET, Math.floor((2 * IMPLICIT_BUDGET) / branches));
}

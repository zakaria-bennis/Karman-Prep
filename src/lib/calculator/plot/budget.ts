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

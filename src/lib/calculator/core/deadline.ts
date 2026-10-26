/** Thrown by `Deadline.check()` once its time budget has elapsed. */
export class DeadlineExceeded extends Error {
  readonly rowId: string | null;

  constructor(rowId: string | null) {
    super(rowId === null ? "deadline exceeded" : `deadline exceeded for row ${rowId}`);
    this.name = "DeadlineExceeded";
    this.rowId = rowId;
  }
}

/** A time budget that long-running loops poll. */
export interface Deadline {
  check(): void;
} // throws DeadlineExceeded once expired

/** Starts a budget of `ms` milliseconds measured with `now`, from the moment of the call. */
export function createDeadline(ms: number, now: () => number, rowId: string | null): Deadline {
  const start = now();
  return {
    check() {
      if (now() - start >= ms) throw new DeadlineExceeded(rowId);
    },
  };
}

/** A deadline that never expires. */
export const NO_DEADLINE: Deadline = Object.freeze({
  check() {},
});

export const ROW_VALUE_DEADLINE_MS = 250; // AR-48
/**
 * AR-48, amended 2026-10-25: a regression row's fit keeps going, as Desmos's does (it never shows
 * "took too long" for a question-bank fit); the fit runs in the worker, so typing never waits on
 * it, every model evaluation checks this budget (heartbeats keep the AR-49 watchdog quiet), and a
 * newer edit's generation replaces its result. The budget only stops a runaway fit: a two-parameter
 * fit that takes 150 ms on a laptop (b27B) can pass 1 s on a slow phone.
 */
export const REGRESSION_DEADLINE_MS = 15_000;
export const POI_DEADLINE_MS = 500;

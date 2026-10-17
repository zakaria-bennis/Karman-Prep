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
export const REGRESSION_DEADLINE_MS = 1000;
export const POI_DEADLINE_MS = 500;

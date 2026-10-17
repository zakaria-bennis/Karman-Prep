// Double-tap equals (K-7): remembers the row and latex left by the last on-screen = press.
export const DOUBLE_TAP_MS = 300;
export interface DoubleTapTracker {
  record(rowId: string, latexAfter: string): void;
  matches(rowId: string, latexNow: string): boolean; // same row, same latex, elapsed <= 300 ms, not cleared
  clear(): void;
}

export function createDoubleTapTracker(now: () => number): DoubleTapTracker {
  let last: { rowId: string; latex: string; at: number } | null = null;
  return {
    record(rowId, latexAfter) {
      last = { rowId, latex: latexAfter, at: now() };
    },
    matches(rowId, latexNow) {
      return (
        last !== null &&
        last.rowId === rowId &&
        last.latex === latexNow &&
        now() - last.at <= DOUBLE_TAP_MS
      );
    },
    clear() {
      last = null;
    },
  };
}

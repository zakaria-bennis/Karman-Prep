// The executor's slice clock and work deadlines (AR-47, AR-48). Units of work run synchronously;
// the executor yields between them once a slice is spent, and every deadline check inside a unit
// posts a heartbeat when one is due, so a long unit still reports progress. Pure TypeScript: no DOM.

import { DeadlineExceeded, type Deadline } from "../core/deadline";

/** The executor's clock and yield; executor.ts re-exports it. */
export interface ExecutorTiming {
  now(): number;
  yieldToEventLoop(): Promise<void>; // MessageChannel macrotask
  sliceMs: number; // 8 (AR-47)
  heartbeatMs: number; // 200 (AR-47)
}

/** AR-47: measures continuous work since the slice began and the time since the last post. */
export class SliceClock {
  private readonly timing: Pick<ExecutorTiming, "now" | "sliceMs" | "heartbeatMs">;
  private readonly postHeartbeat: () => void;
  private sliceStart = -Infinity;
  private lastPost = -Infinity; // nothing posted yet: the first pulse posts a heartbeat

  constructor(
    timing: Pick<ExecutorTiming, "now" | "sliceMs" | "heartbeatMs">,
    postHeartbeat: () => void
  ) {
    this.timing = timing;
    this.postHeartbeat = postHeartbeat;
  }

  /** Starts a slice of continuous work now. */
  startSlice(): void {
    this.sliceStart = this.timing.now();
  }

  /** True once `sliceMs` of the slice have elapsed. */
  shouldYield(): boolean {
    return this.timing.now() - this.sliceStart >= this.timing.sliceMs;
  }

  /** Records now as the time of the last post. */
  notePost(): void {
    this.lastPost = this.timing.now();
  }

  /**
   * Posts a heartbeat when `heartbeatMs − sliceMs` have passed since the last post, so the gap
   * between posts stays within `heartbeatMs` even when the next check comes a slice later.
   */
  pulse(): void {
    const { heartbeatMs, sliceMs } = this.timing;
    if (this.timing.now() - this.lastPost >= heartbeatMs - sliceMs) {
      this.postHeartbeat();
      this.notePost();
    }
  }
}

/**
 * A unit's deadline (AR-48). Every `check()` pulses the slice clock (AR-47). With a `limitMs`
 * (ROW_VALUE_DEADLINE_MS for a row value or helper) it reads `now()` once per check and, at or past
 * its start plus `limitMs`, calls `onExpire(rowId)` once and throws `DeadlineExceeded(rowId)` on
 * that and every later check. A `limitMs` of null (plot sampling) never expires.
 */
export function createWorkDeadline(o: {
  clock: SliceClock;
  now: () => number;
  limitMs: number | null;
  rowId: string | null;
  onExpire?: (rowId: string | null) => void;
}): Deadline {
  const { clock, now, limitMs, rowId, onExpire } = o;
  if (limitMs === null) return { check: () => clock.pulse() };
  const end = now() + limitMs;
  let expired = false;
  return {
    check() {
      clock.pulse();
      if (!expired && now() >= end) {
        expired = true;
        onExpire?.(rowId);
      }
      if (expired) throw new DeadlineExceeded(rowId);
    },
  };
}

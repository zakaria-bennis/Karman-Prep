// Hand-driven timers for node tests of timer-taking modules (09 Task 5's row announcements):
// nothing runs until the test calls advance(ms), which runs every callback that falls due by
// then in due order, including callbacks those callbacks schedule. Test-only.

export interface ManualTimers {
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
  advance(ms: number): void; // runs due callbacks in time order
}

interface Pending {
  handle: number;
  due: number;
  callback: () => void;
}

export function createManualTimers(): ManualTimers {
  let now = 0;
  let nextHandle = 1;
  const pending: Pending[] = [];

  /** The earliest callback due by `limit`; equal times run in scheduling order. */
  const nextDue = (limit: number): Pending | null => {
    let next: Pending | null = null;
    for (const timer of pending) {
      if (timer.due <= limit && (next === null || timer.due < next.due)) next = timer;
    }
    return next;
  };

  return {
    setTimeout(callback, ms) {
      const handle = nextHandle++;
      pending.push({ handle, due: now + Math.max(0, ms), callback });
      return handle;
    },
    clearTimeout(handle) {
      const index = pending.findIndex((timer) => timer.handle === handle);
      if (index >= 0) pending.splice(index, 1);
    },
    advance(ms) {
      const target = now + ms;
      for (let timer = nextDue(target); timer !== null; timer = nextDue(target)) {
        pending.splice(pending.indexOf(timer), 1);
        now = timer.due;
        timer.callback();
      }
      now = target;
    },
  };
}

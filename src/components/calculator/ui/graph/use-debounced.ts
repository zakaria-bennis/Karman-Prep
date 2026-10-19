// A debounced value for the graph's accessible name (A11Y-1):
// the name follows the view once it has held still, and a continuous drag or wheel still renames
// the graph within maxWaitMs. Every timer takes a function argument (AR-44).

import { useEffect, useRef, useState } from "react";

export type DebounceOptions = { maxWaitMs?: number };

type Timer = ReturnType<typeof setTimeout>;
type TimerRef = { current: Timer | null };

function clear(timer: TimerRef): void {
  if (timer.current !== null) clearTimeout(timer.current);
  timer.current = null;
}

/**
 * Returns the first value at once. A later value (compared with Object.is) is returned once it has
 * held for `ms`, or `maxWaitMs` after the first change not yet returned, whichever comes first;
 * without `maxWaitMs` only the first rule applies. A value that returns to the one shown cancels
 * the wait. Unmounting clears the timers.
 */
export function useDebounced<T>(value: T, ms: number, options: DebounceOptions = {}): T {
  const { maxWaitMs } = options;
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  const latest = useRef(value);
  const hold = useRef<Timer | null>(null);
  const maxWait = useRef<Timer | null>(null);

  useEffect(() => {
    latest.current = value;
    clear(hold);
    if (Object.is(value, shownRef.current)) {
      clear(maxWait);
      return;
    }
    const show = (): void => {
      clear(hold);
      clear(maxWait);
      const next = latest.current;
      shownRef.current = next;
      setShown(() => next);
    };
    hold.current = setTimeout(show, ms);
    if (maxWaitMs !== undefined && maxWait.current === null) {
      maxWait.current = setTimeout(show, maxWaitMs);
    }
  }, [value, ms, maxWaitMs]);

  useEffect(
    () => () => {
      clear(hold);
      clear(maxWait);
    },
    []
  );

  return shown;
}

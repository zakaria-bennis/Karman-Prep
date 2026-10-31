// Work the first screen does not need (observers, the alive layer, the phone dock) waits until the browser
// is idle, so hydration and the first interaction come first. Safari has no requestIdleCallback: a short
// timeout stands in. The cleanup cancels the wait, or runs the work's own cleanup once it has started.

export function idle(work: () => void | (() => void), timeout = 1500): () => void {
  let cleanup: void | (() => void);
  let ran = false;
  const run = () => {
    ran = true;
    cleanup = work();
  };
  const hasIdle = typeof requestIdleCallback === "function";
  const id = hasIdle ? requestIdleCallback(run, { timeout }) : window.setTimeout(run, 200);
  return () => {
    if (ran) cleanup?.();
    else if (hasIdle) cancelIdleCallback(id);
    else clearTimeout(id);
  };
}

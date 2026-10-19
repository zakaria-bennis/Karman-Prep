// API-12 and the paste reveal: run something on a row's MathField as soon as it is mounted. A
// row added by the engine mounts its field on a later React commit, so the call waits up to
// FIELD_WAIT_FRAMES frames for it.

import type { MathField } from "../../math-field/MathField";
import type { FocusController } from "../focus/focus-controller";

export const FIELD_WAIT_FRAMES = 60;

const nextFrame = (callback: () => void) => {
  requestAnimationFrame(() => callback());
};

/**
 * Runs `run` at once when `focus.field(rowId)` exists. Otherwise retries once per scheduled frame
 * and gives up after the FIELD_WAIT_FRAMES-th scheduled retry. Returns the cancel function, after
 * which a pending retry does nothing.
 */
export function whenFieldReady(
  focus: Pick<FocusController, "field">,
  rowId: string,
  run: (field: MathField) => void,
  schedule: (callback: () => void) => void = nextFrame
): () => void {
  const ready = focus.field(rowId);
  if (ready !== null) {
    run(ready);
    return () => {};
  }
  let cancelled = false;
  let scheduled = 0;
  const attempt = () => {
    if (cancelled) return;
    const field = focus.field(rowId);
    if (field !== null) run(field);
    else if (scheduled < FIELD_WAIT_FRAMES) retry();
  };
  const retry = () => {
    scheduled += 1;
    schedule(attempt);
  };
  retry();
  return () => {
    cancelled = true;
  };
}

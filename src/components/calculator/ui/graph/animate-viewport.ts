// GP-46, GP-47: the zoom buttons and Home move the view over about 7 frames (about 120 ms) with
// accelerating progress, as the reference does. Each frame sets the bounds linearly between the
// start and the target at that frame's progress. Any other change of the view (a drag, the wheel,
// a key) stops the animation where it is; a new animation starts from the view on screen.

import type { CalculatorEngine } from "@/lib/calculator/core/api/engine";
import type { Viewport } from "@/lib/calculator/plot/viewport";

/** GP-46: the share of the way covered after each animation frame. */
export const ZOOM_PROGRESS = [0.1, 0.2, 1 / 3, 0.5, 0.7, 14 / 15, 1] as const;

const KEYS = ["left", "right", "bottom", "top"] as const;
const lerp = (a: Viewport, b: Viewport, t: number): Viewport => ({
  left: a.left + (b.left - a.left) * t,
  right: a.right + (b.right - a.right) * t,
  bottom: a.bottom + (b.bottom - a.bottom) * t,
  top: a.top + (b.top - a.top) * t,
});
const same = (a: Viewport, b: Viewport) => KEYS.every((k) => a[k] === b[k]);

export type ViewportAnimator = {
  /** Moves the view to `target`; at once when `instant`. */
  run(target: Viewport, instant: boolean): void;
  /** The running animation's target, or null. */
  target(): Viewport | null;
  cancel(): void;
};

export function createViewportAnimator(engine: CalculatorEngine): ViewportAnimator {
  let frame: number | null = null;
  let goal: Viewport | null = null;
  const cancel = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    goal = null;
  };
  return {
    cancel,
    target: () => goal,
    run(target, instant) {
      cancel();
      if (instant) {
        engine.setMathBounds(target);
        return;
      }
      const from = engine.getSnapshot().viewport;
      goal = target;
      let step = 0;
      let last = from;
      const tick = () => {
        frame = null;
        // Someone else moved the view: stop where it is.
        if (!same(engine.getSnapshot().viewport, last)) {
          goal = null;
          return;
        }
        const t = ZOOM_PROGRESS[step++];
        last = t === 1 ? target : lerp(from, target, t);
        engine.setMathBounds(last);
        if (t === 1) goal = null;
        else frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    },
  };
}

// One animation frame of a playing slider (SLIDERS-30, SLIDERS-31): how far the hidden target moves
// in the elapsed time, how each loop mode turns or wraps it, and the short value written into the
// row. Pure TypeScript: no DOM, no clock of its own (AR-44).

import type { LoopMode } from "./model";
import { shortestBetween } from "./numbers";
import { constrain, type SliderRange } from "./range";

export interface FrameInput {
  range: SliderRange;
  loopMode: LoopMode;
  period: number; // ms for one pass (animationPeriod)
  direction: 1 | -1;
  target: number; // the smoothly moving target, before snapping
  elapsed: number; // ms since the last frame
}
export interface Frame {
  target: number;
  direction: 1 | -1;
  value: number; // the value to write
}

/** A 60 Hz frame, for the shortest-number window (SLIDERS-30). */
const FRAME_MS = 1000 / 60;

/**
 * SLIDERS-30, SLIDERS-31: advances `target` by (max−min)·dt/period (dt capped at period/10) in the
 * play direction. Forward-and-back turns at the limits; Repeat jumps from max + step/2 to
 * min − step/2; Play once runs up to max; Play indefinitely grows by dt/(period/4) (×step) with no
 * limits. Without a step the written value is the shortest number within ±10% of a frame's move.
 */
export function advance(input: FrameInput): Frame {
  const { range, loopMode, period } = input;
  const { min, max, step } = range;
  const half = step ? step / 2 : 0;
  let { target, direction } = input;
  if (loopMode === "LOOP_FORWARD_REVERSE") {
    if (target >= max) direction = -1;
    else if (target <= min) direction = 1;
  } else {
    direction = 1;
    if (loopMode === "LOOP_FORWARD" && target >= max + half) target = min - half;
  }
  const elapsed = Number.isFinite(input.elapsed) ? Math.max(0, input.elapsed) : 0;
  if (loopMode === "PLAY_INDEFINITELY") {
    let move = elapsed / (period / 4);
    if (step) move *= step;
    target += move;
    let value = target;
    if (!step) value = shortestBetween(value - move * 0.1, value + move * 0.1);
    return { target, direction, value: constrain(range, value, { ignoreSoftLimits: true }) };
  }
  const dt = Math.min(elapsed, period / 10);
  const move = ((max - min) * dt) / period;
  target = Math.max(min - half, Math.min(max + half, target + move * direction));
  let value = target;
  if (!step && value < max && dt > 0) {
    const window = (move / dt) * FRAME_MS * 0.1;
    value = shortestBetween(value - window, value + window);
  }
  return { target, direction, value: constrain(range, value) };
}

/** SLIDERS-31: Play once has reached its end, so the Play button restarts it from min. */
export function playOnceDone(loopMode: LoopMode, value: number, range: SliderRange): boolean {
  return loopMode === "PLAY_ONCE" && value >= range.max;
}

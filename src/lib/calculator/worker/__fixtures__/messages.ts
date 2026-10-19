// Test-only helpers for the worker package (AR-45 to AR-48): wire rows, settings, the default view,
// a fake clock, main-to-worker messages and waits for a generation's `done`. Never imported by
// production code.

import { defaultViewport, type ViewSpec } from "../../plot/viewport";
import type { MainToWorker, WireRow, WireSettings, WorkerToMain } from "../protocol";

/** Visible expression rows with ids `r0`, `r1`, … in order. */
export function rows(...latex: string[]): WireRow[] {
  return latex.map((l, i) => ({
    id: `r${i}`,
    type: "expression",
    latex: l,
    columns: null,
    hidden: false,
    sliderBounds: null,
    logMode: false,
  }));
}

export const RAD: WireSettings = { angleMode: "radians", complex: false };

const SIZE = { width: 800, height: 600 };
/** The default 800×600 view at dpr 1: x from −10 to 10, y from −7.5 to 7.5, 40 px per unit. */
export const VIEW: ViewSpec = { viewport: defaultViewport(SIZE), size: SIZE, dpr: 1 };

/** A fake clock: every `now()` adds `step` and returns the new time; `set(t)` sets it; `t` reads it. */
export interface FakeClock {
  t: number;
  now: () => number;
  set: (t: number) => void;
}
export function fake(step: number): FakeClock {
  const clock: FakeClock = {
    t: 0,
    now: () => (clock.t += step),
    set: (t) => {
      clock.t = t;
    },
  };
  return clock;
}

export function HELLO(seed: number): Extract<MainToWorker, { type: "hello" }> {
  return { v: 1, type: "hello", seed };
}

/** A `state` for `rows(...latex)` in radians with no slider values. */
export function STATE(
  generation: number,
  ...latex: string[]
): Extract<MainToWorker, { type: "state" }> {
  return { v: 1, type: "state", generation, rows: rows(...latex), settings: RAD, sliders: {} };
}

/** A `view` carrying VIEW's viewport and size at dpr 1. */
export function VIEW_MSG(generation: number): Extract<MainToWorker, { type: "view" }> {
  return {
    v: 1,
    type: "view",
    generation,
    viewport: { ...VIEW.viewport },
    size: { ...VIEW.size },
    dpr: 1,
  };
}

/**
 * Resolves from a fresh MessageChannel's onmessage, then closes the channel: a real macrotask,
 * so every pending microtask has run, even under vi.useFakeTimers.
 */
export function macrotask(): Promise<void> {
  return new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      resolve();
      channel.port1.close();
      channel.port2.close();
    };
    channel.port2.postMessage(null);
  });
}

const UNTIL_DONE_LIMIT_MS = 10_000;

/**
 * Waits until `messages()` holds `{ type: "done", generation }`. Between checks it awaits
 * `options.advance(1)` when given (for example vi.advanceTimersByTimeAsync), else `macrotask()`;
 * rejects after 10,000 ms of performance.now() time.
 */
export async function untilDone(
  messages: () => readonly WorkerToMain[],
  generation: number,
  options: { advance?: (ms: number) => Promise<unknown> } = {}
): Promise<void> {
  const start = performance.now();
  while (!messages().some((m) => m.type === "done" && m.generation === generation)) {
    if (performance.now() - start >= UNTIL_DONE_LIMIT_MS) {
      throw new Error(`untilDone: no done for generation ${generation}`);
    }
    await (options.advance ? options.advance(1) : macrotask());
  }
}

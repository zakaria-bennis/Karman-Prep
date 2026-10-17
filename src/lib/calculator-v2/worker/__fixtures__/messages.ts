// Test-only helpers for the worker package (AR-45 to AR-48): wire rows, settings, the default view
// and a fake clock. Never imported by production code.

import { defaultViewport, type ViewSpec } from "../../plot/viewport";
import type { WireRow, WireSettings } from "../protocol";

/** Visible expression rows with ids `r0`, `r1`, … in order. */
export function rows(...latex: string[]): WireRow[] {
  return latex.map((l, i) => ({
    id: `r${i}`,
    type: "expression",
    latex: l,
    columns: null,
    hidden: false,
    sliderBounds: null,
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

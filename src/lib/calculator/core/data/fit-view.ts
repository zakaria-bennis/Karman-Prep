// Zoom to fit (D-16): the viewport around a table's plotted points, the bounding box widened by
// 10% of each axis span on every side, and an axis whose span is 0 widened to value ± max(1,
// 0.1·|value|). Pure TypeScript.

import type { Viewport } from "../../plot/viewport";

const PADDING = 0.1;

function widen(lo: number, hi: number): [number, number] {
  if (hi > lo) {
    const pad = (hi - lo) * PADDING;
    return [lo - pad, hi + pad];
  }
  const half = Math.max(1, PADDING * Math.abs(lo));
  return [lo - half, lo + half];
}

/** The fitted viewport of every finite [x, y] pair in `series`, or null when there is none. */
export function fitPoints(series: readonly Float64Array[]): Viewport | null {
  let left = Infinity,
    right = -Infinity,
    bottom = Infinity,
    top = -Infinity;
  for (const coords of series) {
    for (let k = 0; k + 1 < coords.length; k += 2) {
      const x = coords[k],
        y = coords[k + 1];
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      bottom = Math.min(bottom, y);
      top = Math.max(top, y);
    }
  }
  if (left > right) return null;
  const [l, r] = widen(left, right);
  const [b, t] = widen(bottom, top);
  return { left: l, right: r, bottom: b, top: t };
}

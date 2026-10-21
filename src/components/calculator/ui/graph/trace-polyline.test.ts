import { describe, expect, it } from "vitest";
import type { PoiBranch } from "@/lib/calculator/poi/types";
import { tracePolyline, type Axes } from "./trace-polyline";

// 800 px across x ∈ [−10, 10] and 600 px down y ∈ [7.5, −7.5].
const AXES: Axes = {
  toU: (t) => (t + 10) * 40,
  fromU: (u) => u / 40 - 10,
  toW: (y) => (7.5 - y) * 40,
  span: 800,
  wSpan: 600,
  fromEnd: false,
};
const points = (b: PoiBranch) => {
  const p = tracePolyline(b, AXES);
  return [...p.u].map((u, k) => [u, p.w[k]]);
};

describe("POI-LIVE-10 tracePolyline", () => {
  it("keeps only a straight line's two ends", () => {
    expect(points({ independent: "x", f: (x) => 2 * x + 1 })).toEqual([
      [0, (7.5 + 19) * 40],
      [800, (7.5 - 21) * 40],
    ]);
  });

  it("keeps a parabola close to the curve on screen with far fewer points than samples", () => {
    const f = (x: number) => x * x - 4;
    const p = points({ independent: "x", f });
    expect(p.length).toBeGreaterThan(40);
    expect(p.length).toBeLessThan(400);
    for (let k = 0; k + 1 < p.length; k++) {
      const [u0, w0] = p[k],
        [u1, w1] = p[k + 1];
      if (Math.min(w0, w1) < 0) continue; // above the view the chords may be longer
      const um = (u0 + u1) / 2;
      expect(Math.abs(AXES.toW(f(AXES.fromU(um))) - (w0 + w1) / 2)).toBeLessThan(1);
    }
  });

  it("ends a run at a restriction's edge, found by bisection", () => {
    const p = points({ independent: "x", f: (x) => (x > -1 && x < 2 ? x * x : NaN) });
    expect(p[0][0]).toBeCloseTo(AXES.toU(-1), 6);
    expect(p.at(-1)![0]).toBeCloseTo(AXES.toU(2), 6);
  });

  it("breaks the run at a pole", () => {
    const p = tracePolyline({ independent: "x", f: (x) => 1 / (x - 0.013) }, AXES);
    expect([...p.u].some(Number.isNaN)).toBe(true);
  });
});

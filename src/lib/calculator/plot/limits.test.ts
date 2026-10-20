// Review Focus item 4: views at the G-23 limits.
import { expect, it } from "vitest";
import { NO_DEADLINE } from "../core/deadline";
import { EXPLICIT_ROW, expectG11, segmentsOf, viewOf, VIEW_800 } from "./__fixtures__/measure";
import type { CurveGeometry, RealFn1 } from "./geometry";
import { EXPLICIT_BUDGET, IMPLICIT_BUDGET, plotRow, type PlotInput } from "./index";
import { axisTicks } from "./ticks";
import { panViewport, zoomViewport, type ViewSpec } from "./viewport";

const V0 = VIEW_800.viewport;
const LIMITS = [
  zoomViewport(V0, 1e15, { x: 0, y: 0 }),
  zoomViewport(V0, 1e15, { x: 1, y: 1 }),
  zoomViewport(V0, 1e-20, { x: 0, y: 0 }),
  zoomViewport(panViewport(V0, 1e16, 1e16), 1e15, { x: 1e15, y: 1e15 }),
  zoomViewport(panViewport(V0, -1e16, -1e16), 1e15, { x: -1e15, y: -1e15 }),
].map((v) => viewOf(v));
const CURVES: RealFn1[] = [(x) => x, Math.sin, Math.exp, (x) => x * x];
const G11: RealFn1[] = [(x) => x * x, (x) => x ** 10, Math.exp, Math.sin, (x) => 1 / x, Math.tan];
const circle: PlotInput = { rowId: "c", kind: "implicit", Fs: [(x, y) => x * x + y * y - 25] };
it("G-23 sampling and ticks at the limits stay finite and in budget", () => {
  for (const view of LIMITS) {
    for (const input of [...CURVES.map((f) => ({ ...EXPLICIT_ROW, fs: [f] })), circle]) {
      const g = plotRow(input, view, NO_DEADLINE) as CurveGeometry;
      const cap = input.kind === "implicit" ? IMPLICIT_BUDGET : EXPLICIT_BUDGET;
      expect(g.evaluations).toBeLessThanOrEqual(cap);
      const p = g.polylines;
      for (let k = 0; k < p.length; k += 2) expect(Number.isNaN(p[k])).toBe(Number.isNaN(p[k + 1]));
      expect(p.every((n) => Number.isNaN(n) || Number.isFinite(n))).toBe(true);
      expect(g.bands.every((n) => Number.isFinite(n))).toBe(true);
      if (input.kind === "explicit") expectG11(view, input.fs[0], segmentsOf(p)); // G-11 at the limits
    }
    const { left, right, bottom, top } = view.viewport;
    const ranges = [left, right, 800, bottom, top, 600];
    for (let k = 0; k < 6; k += 3) {
      const [lo, hi, px] = ranges.slice(k, k + 3);
      const t = axisTicks(lo, hi, px);
      expect(t.step > 0 && Number.isFinite(t.step) && t.major.length >= 2).toBe(true);
      expect((t.step / (hi - lo)) * px).toBeGreaterThanOrEqual(80 * (1 - 1e-9)); // never underflows
      expect(t.major.every((m, i) => i === 0 || m > t.major[i - 1])).toBe(true);
      expect(t.minor.every((m) => Number.isFinite(m) && !t.major.includes(m))).toBe(true);
    }
  }
}, 60_000);
it("G-23, G-11 holds at both zoom limits for each G-11 function", () => {
  const segmentsAt = (f: RealFn1, view: ViewSpec) =>
    segmentsOf(
      (plotRow({ ...EXPLICIT_ROW, fs: [f] }, view, NO_DEADLINE) as CurveGeometry).polylines
    );
  for (const f of G11) {
    const zoomIn = viewOf(zoomViewport(V0, 1e15, { x: 1, y: f(1) }));
    const inner = segmentsAt(f, zoomIn);
    expect(inner.length).toBeGreaterThan(0);
    expectG11(zoomIn, f, inner);
    // zoom-out limit (LIMITS[2]); a spike narrower than a pixel, such as x^10 at 0, may draw only as a band
    expectG11(LIMITS[2], f, segmentsAt(f, LIMITS[2]));
  }
}, 60_000);

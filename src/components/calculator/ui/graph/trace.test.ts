import { describe, expect, it } from "vitest";
import type { ViewSpec } from "@/lib/calculator/plot/viewport";
import type { PoiBranch } from "@/lib/calculator/poi/types";
import { branchDistance, traceAt } from "./trace";

const VIEW: ViewSpec = {
  viewport: { left: -10, right: 10, bottom: -7.5, top: 7.5 },
  size: { width: 800, height: 600 },
  dpr: 1,
};
const px = (x: number) => (x + 10) * 40;
const py = (y: number) => (7.5 - y) * 40;
const parabola: PoiBranch = { independent: "x", f: (x) => x * x - 2 };

describe("POI-TRACE-23 the trace point", () => {
  it("blends only the independent coordinate: far above the vertex it stays at x = 0", () => {
    const p = traceAt([parabola], VIEW, [px(0), py(6)]);
    expect(p).toMatchObject({ x: 0, y: -2, hole: false });
    expect(p?.label.text).toBe("(0, −2)");
  });

  it("moves x to the simplest decimal within half a px and computes y exactly", () => {
    const p = traceAt([parabola], VIEW, [px(-2.5), py(4.25)]);
    expect(p).toMatchObject({ x: -2.5, y: 4.25 });
    expect(p?.label.text).toBe("(−2.5, 4.25)");
    const q = traceAt([parabola], VIEW, [px(-1.4142), py(0)]);
    expect(q?.label.text).toBe("(−1.41, −0.0119)"); // no snapping to the zero
  });

  it("an x=g(y) branch rounds y and computes x", () => {
    const g: PoiBranch = { independent: "y", f: (y) => y * y - 1 };
    const p = traceAt([g], VIEW, [px(3.1087), py(2.027)]);
    expect(p?.y).toBe(2.027); // the reference reads (3.10873, 2.027) here (spec L-6)
    expect(p?.x).toBeCloseTo(2.027 ** 2 - 1, 12);
  });

  it("at a hole the label reads undefined and the dot sits half a px away", () => {
    const hole: PoiBranch = { independent: "x", f: (x) => (x * x - 1) / (x - 1) };
    const p = traceAt([hole], VIEW, [px(1), py(2)]);
    expect(p?.hole).toBe(true);
    expect(p?.label.text).toBe("(1, undefined)");
    expect(p?.x).toBe(1);
    expect(Math.abs(p!.y - 2)).toBeLessThan(0.02);
  });

  it("jumps to the nearest of several branches", () => {
    const lines = [1, 2, 3].map((k): PoiBranch => ({ independent: "x", f: (x) => k * x }));
    const p = traceAt(lines, VIEW, [px(1), py(2.9)])!;
    expect(p.y / p.x).toBeCloseTo(3, 9);
  });
});

describe("POI-LIVE-9, POI-LIVE-10 the reference's polyline", () => {
  it("off a straight line the trace goes to the nearest point (no polyline on the far side)", () => {
    const line: PoiBranch = { independent: "x", f: (x) => 2 * x + 1, linear: true };
    // (1.5, −6) is nearest (−2.5, −4) on y=2x+1 when both axes have 40 px per unit
    const p = traceAt([line], VIEW, [px(1.5), py(-6)]);
    expect(p?.x).toBeCloseTo(-2.5, 1);
  });

  it("past a restriction's end the trace shows nothing", () => {
    const restricted: PoiBranch = {
      independent: "x",
      f: (x) => (x > -1 && x < 2 ? x * x : NaN),
    };
    expect(traceAt([restricted], VIEW, [px(1.9), py(3.61)])).toMatchObject({ hidden: false });
    expect(traceAt([restricted], VIEW, [px(3), py(9)])).toMatchObject({ hidden: true });
  });
});

describe("POI-TRACE-21 curve distance", () => {
  it("is measured to the centreline in px", () => {
    expect(branchDistance(parabola, VIEW, [px(0), py(-2) + 10])).toBeCloseTo(10, 6);
    expect(branchDistance(parabola, VIEW, [px(0), py(-2) + 11])).toBeGreaterThan(10);
    expect(branchDistance({ independent: "x", f: () => NaN }, VIEW, [0, 0])).toBe(Infinity);
  });
});

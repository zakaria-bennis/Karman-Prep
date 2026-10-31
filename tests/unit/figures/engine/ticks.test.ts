import { describe, expect, it } from "vitest";
import { axisTicks, MIN_TICK_PX, niceStep, tickValues } from "@/lib/figures/engine/ticks";

describe("niceStep", () => {
  it("picks the smallest 1, 2 or 5 × 10^k at least MIN_TICK_PX apart", () => {
    // 20 units over 400 px: raw step 4, so 5.
    expect(niceStep(-10, 10, 400)).toBe(5);
    // 10 units over 800 px: raw step 1, so 1.
    expect(niceStep(0, 10, 800)).toBe(1);
    // 10 units over 500 px: raw step 1.6, so 2.
    expect(niceStep(0, 10, 500)).toBe(2);
    // 1 unit over 400 px: raw 0.2.
    expect(niceStep(0, 1, 400)).toBe(0.2);
    // 1000 units over 300 px: raw 266.7, so 500.
    expect(niceStep(0, 1000, 300)).toBe(500);
  });

  it("only ever returns 1, 2 or 5 × 10^k, spaced at least MIN_TICK_PX", () => {
    for (const [lo, hi, px] of [
      [0, 0.003, 250],
      [-7, 13, 333],
      [0, 12345, 640],
      [2, 2.5, 90],
    ]) {
      const step = niceStep(lo, hi, px);
      const k = Math.floor(Math.log10(step));
      const m = Math.round(step / 10 ** k);
      expect([1, 2, 5], `${lo}..${hi}`).toContain(m);
      expect((step * px) / (hi - lo)).toBeGreaterThanOrEqual(MIN_TICK_PX * (1 - 1e-9));
    }
  });

  it("is 0 for an empty, reversed or non-finite axis", () => {
    expect(niceStep(1, 1, 300)).toBe(0);
    expect(niceStep(2, 1, 300)).toBe(0);
    expect(niceStep(0, 1, 0)).toBe(0);
    expect(niceStep(0, Infinity, 300)).toBe(0);
    expect(niceStep(NaN, 1, 300)).toBe(0);
  });
});

describe("tickValues", () => {
  it("lists the multiples of step in range from integer indices", () => {
    expect(tickValues(-5, 5, 2)).toEqual([-4, -2, 0, 2, 4]);
    expect(tickValues(0, 10, 5)).toEqual([0, 5, 10]);
  });

  it("writes decimal steps exactly and never -0", () => {
    expect(tickValues(0, 0.5, 0.1)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5]);
    expect(tickValues(-0.3, 0, 0.1)).toEqual([-0.3, -0.2, -0.1, 0]);
    expect(Object.is(tickValues(-1, 1, 1)[1], 0)).toBe(true);
  });

  it("is empty for a non-positive step", () => {
    expect(tickValues(0, 1, 0)).toEqual([]);
    expect(tickValues(0, 1, -1)).toEqual([]);
  });
});

describe("axisTicks", () => {
  it("pairs the automatic step with its ticks", () => {
    expect(axisTicks(-10, 10, 400)).toEqual({ step: 5, major: [-10, -5, 0, 5, 10] });
    expect(axisTicks(0, 0, 400)).toEqual({ step: 0, major: [] });
  });
});

import { describe, expect, it } from "vitest";
import { plainDecimal, shortestBetween } from "./numbers";
import {
  keyMove,
  snap,
  softMax,
  softMin,
  thumbPercent,
  tickPercents,
  valueAtPixel,
  zeroPercent,
  type KeyMove,
  type SliderRange,
} from "./range";

const soft = (min = -10, max = 10, step = 0): SliderRange => ({
  min,
  max,
  step,
  hardMin: false,
  hardMax: false,
});
const hard = (min: number, max: number, step = 0): SliderRange => ({
  min,
  max,
  step,
  hardMin: true,
  hardMax: true,
});
const walk = (range: SliderRange, from: number, moves: KeyMove[]) => {
  const out: number[] = [];
  let v = from;
  for (const m of moves) out.push((v = keyMove(range, v, m)));
  return out;
};

describe("plainDecimal (SLIDERS-23)", () => {
  it("writes plain decimals with no exponent", () => {
    expect(plainDecimal(1e-7)).toBe("0.0000001");
    expect(plainDecimal(-2.5e-8)).toBe("-0.000000025");
    expect(plainDecimal(1.5e21)).toBe("1500000000000000000000");
    expect(plainDecimal(-0)).toBe("0");
    expect(plainDecimal(6.33)).toBe("6.33");
  });
});

describe("shortestBetween (SLIDERS-24)", () => {
  it("gives 0 across zero, a power of ten across exponents, else shared digits + 1", () => {
    expect(shortestBetween(-0.1, 0.1)).toBe(0);
    expect(shortestBetween(0.9, 1.1)).toBe(1);
    expect(shortestBetween(2.2 - 20 / 317, 2.2 + 20 / 317)).toBe(2.2);
    expect(shortestBetween(5.54 - 20 / 317, 5.54 + 20 / 317)).toBe(5.5);
    expect(shortestBetween(-7.54 - 20 / 317, -7.54 + 20 / 317)).toBe(-7.5);
  });
});

describe("snap (SLIDERS-22)", () => {
  it("clamps to hard limits and snaps to the step grid", () => {
    expect(snap({ target: 15, hardMin: 0, hardMax: 10 })).toBe(10);
    expect(snap({ target: 0.37, step: 0.25 })).toBe(0.25);
    expect(snap({ target: 1, step: 3 })).toBe(0);
    expect(snap({ target: 1, hardMin: -10, hardMax: 10, step: 3 })).toBe(2);
    expect(snap({ target: 0.35 * 3, hardMin: 0, step: 0.35 })).toBe(1.05);
  });
});

describe("soft limits (SLIDERS-20)", () => {
  it("grow to fit the value and snap outward to the step", () => {
    expect(softMax(10, 25, undefined, 0)).toBe(25);
    expect(softMin(-10, -12.3, undefined, 0)).toBe(-12.3);
    expect(softMax(10, 1000, undefined, 0)).toBe(1000);
    expect(softMin(-10, 1, undefined, 3)).toBe(-12);
    expect(softMax(10, 1, undefined, 3)).toBe(12);
    expect(softMin(-10, 1, undefined, 0)).toBe(-10);
  });
});

describe("track positions (SLIDERS-13, SLIDERS-14)", () => {
  it("places the thumb, the zero marker and the ticks", () => {
    expect(thumbPercent(soft(), 1)).toBe(55);
    expect(thumbPercent(hard(1, 1), 1)).toBeNaN();
    expect(zeroPercent(soft())).toBe(50);
    expect(zeroPercent(hard(1, 5))).toBeNull();
    expect(tickPercents(hard(0, 5, 0.5))).toHaveLength(9);
    expect(tickPercents(soft(-12, 12, 3))).toHaveLength(7);
    expect(tickPercents(hard(0, 1, 0.03))).toHaveLength(33);
    expect(tickPercents(hard(0, 1, 0.01))).toHaveLength(0);
  });
});

describe("valueAtPixel (SLIDERS-24)", () => {
  it("reads the pointer as a short number, snapped and clamped", () => {
    expect(valueAtPixel(soft(), 31.7, 317)).toBe(-8);
    expect(valueAtPixel(soft(), 0.61 * 317, 317)).toBe(2.2);
    expect(valueAtPixel(soft(-10, 10, 0.5), 0.61 * 317, 317)).toBe(2);
    expect(valueAtPixel(soft(), 1.2 * 317, 317)).toBe(10);
    expect(valueAtPixel(hard(0, 1), 0.5 * 334, 334)).toBe(0.5);
  });
});

describe("keyMove (SLIDERS-26)", () => {
  it("steps by (max−min)/20 without a step, landing on its grid", () => {
    expect(walk(soft(), 1, ["up", "bigup", "min", "max", "up"])).toEqual([2, 7, -10, 10, 10]);
    expect(walk(soft(), 0.3, ["up", "up"])).toEqual([1, 2]);
    expect(walk(soft(), 0.3, ["down", "down", "down"])).toEqual([0, -1, -2]);
    expect(walk(hard(0, 1), 0, ["up"])).toEqual([0.05]);
    expect(walk(hard(0, 1), 0.1, ["bigup"])).toEqual([0.35]);
    expect(walk(hard(0, 7), 1, ["up", "up"])).toEqual([1.05, 1.4]);
    expect(walk(hard(0, 100), 1, ["up", "bigup"])).toEqual([5, 30]);
  });

  it("steps by the slider's step, reaching max even off the grid", () => {
    expect(walk(soft(-10, 10, 0.5), 1, ["up"])).toEqual([1.5]);
    expect(walk(soft(-10, 10, 0.5), 1, ["bigup"])).toEqual([3.5]);
    expect(walk(hard(-10, 10, 3), 2, ["up", "up", "up"])).toEqual([5, 8, 10]);
    expect(walk(hard(-10, 10, 3), -10, ["up"])).toEqual([-7]);
  });
});

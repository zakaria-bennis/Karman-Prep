import { expect, it } from "vitest";
import { axisTicks } from "./ticks";

it("NM-8 axisTicks spaces ticks at 1, 2 or 5 × 10^k, at least 80 px apart, from integer indices", () => {
  const x = axisTicks(-10, 10, 800);
  expect(x.major.join()).toBe("-10,-8,-6,-4,-2,0,2,4,6,8,10");
  expect([x.step, x.minor.length, x.minor[0]]).toEqual([2, 30, -9.5]);
  const y = axisTicks(-7.5, 7.5, 600);
  expect(y.major.join()).toBe("-6,-4,-2,0,2,4,6");
  expect([y.step, y.minor.length, y.minor[0]]).toEqual([2, 24, -7.5]);
  const fifth = axisTicks(-1, 1, 800);
  expect([fifth.step, fifth.minor[0]]).toEqual([0.2, -0.95]);
  expect(fifth.major.join()).toBe("-1,-0.8,-0.6,-0.4,-0.2,0,0.2,0.4,0.6,0.8,1");
  const big = axisTicks(0, 50000, 800);
  expect([big.step, big.major[10], big.minor[0]]).toEqual([5000, 50000, 1000]);
  expect(axisTicks(-10, 10.00000000000001, 800).step).toBe(2);
  const bad = [1, 1, 800, 0, 1, 0, NaN, 1, 800];
  for (let k = 0; k < bad.length; k += 3) {
    expect(axisTicks(bad[k], bad[k + 1], bad[k + 2])).toEqual({ step: 0, major: [], minor: [] });
  }
});

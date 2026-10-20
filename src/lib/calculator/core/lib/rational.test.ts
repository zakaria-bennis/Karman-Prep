import { describe, expect, it } from "vitest";
import { addFractions, divFractions, fractionOf, subFractions } from "./rational";

describe("exact fractions for ranges (NM-36)", () => {
  it("reads a double back as the simplest fraction that rounds to it", () => {
    expect(fractionOf(0.1)).toEqual({ n: 1, d: 10 });
    expect(fractionOf(-2.15)).toEqual({ n: -43, d: 20 });
    expect(fractionOf(1 / 3)).toEqual({ n: 1, d: 3 });
    expect(fractionOf(7)).toEqual({ n: 7, d: 1 });
    expect(fractionOf(-0)).toEqual({ n: 0, d: 1 });
    const pi = fractionOf(Math.PI);
    expect(pi !== null && pi.n / pi.d).toBe(Math.PI);
  });

  it("has no fraction for a value that is not finite or needs parts over 2^53 − 1", () => {
    expect([fractionOf(NaN), fractionOf(Infinity), fractionOf(2 ** 60)]).toEqual([
      null,
      null,
      null,
    ]);
    expect(fractionOf(1e-300)).toBeNull();
  });

  it("adds, subtracts and divides exactly, or gives null", () => {
    const tenth = { n: 1, d: 10 };
    expect(addFractions(tenth, { n: 1, d: 5 })).toEqual({ n: 3, d: 10 });
    expect(subFractions({ n: 11, d: 10 }, { n: 1, d: 1 })).toEqual(tenth);
    expect(divFractions({ n: 1, d: 4 }, tenth)).toEqual({ n: 5, d: 2 });
    expect(divFractions(tenth, { n: 0, d: 1 })).toBeNull();
    const big = { n: Number.MAX_SAFE_INTEGER, d: 1 };
    expect(addFractions(big, big)).toBeNull();
  });
});

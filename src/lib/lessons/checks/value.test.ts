import { describe, expect, it } from "vitest";
import { meets, numberOf, pairOf } from "./value";

describe("reading a choice's value", () => {
  it("reads numbers in the lessons' math", () => {
    expect(numberOf("$20\\pi$")).toBeCloseTo(20 * Math.PI);
    expect(numberOf("$\\frac{3}{4}$")).toBeCloseTo(0.75);
    expect(numberOf("$-\\frac{1}{2}$")).toBeCloseTo(-0.5);
    expect(numberOf("$3\\sqrt{2}$")).toBeCloseTo(3 * Math.SQRT2);
    expect(numberOf("$x = 4$")).toBe(4);
    expect(numberOf("$1,200$")).toBe(1200);
    expect(numberOf("$40\\%$")).toBe(40);
    expect(numberOf("$60^\\circ$")).toBe(60);
    expect(numberOf("$\\dfrac{2\\pi}{5}$")).toBeCloseTo((2 * Math.PI) / 5);
    expect(numberOf("$\\sqrt[3]{27}$")).toBeCloseTo(3);
    expect(numberOf("12.5")).toBe(12.5);
    expect(numberOf("No solution")).toBeNull();
    expect(pairOf("$(3, -2)$")).toEqual([3, -2]);
  });

  it("matches what a check expects, and nothing else", () => {
    expect(meets(20 * Math.PI, "$20\\pi$", 0)).toBe(true);
    expect(meets(20 * Math.PI, "$4\\pi$", 0)).toBe(false);
    expect(meets((x) => 2 * x + 3, "$y = 2x + 3$", 0)).toBe(true);
    expect(meets((x) => 2 * x + 3, "$2(x + 1) + 1$", 0)).toBe(true);
    expect(meets((x) => 2 * x + 3, "$2x - 3$", 0)).toBe(false);
    expect(meets((x) => x * x - 9, "$(x-3)(x+3)$", 0)).toBe(true);
    expect(meets([3, -2], "$(3, -2)$", 0)).toBe(true);
    expect(meets({ text: "infinitely many" }, "Infinitely many solutions", 0)).toBe(true);
    expect(meets({ index: 2 }, "anything", 2)).toBe(true);
    expect(meets({ index: 2 }, "anything", 1)).toBe(false);
  });
});

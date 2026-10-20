import { describe, expect, it } from "vitest";
import { simplestDecimal } from "./simplest";

describe("POI-TRACE-23 simplest decimal in an interval", () => {
  it("is 0 when the interval spans or touches 0", () => {
    expect(simplestDecimal(-0.3, 0.2)).toBe(0);
    expect(simplestDecimal(0, 0.2)).toBe(0);
  });
  it("is a power of ten when the ends differ in exponent", () => {
    expect(simplestDecimal(0.97, 1.02)).toBe(1);
    expect(simplestDecimal(-1.02, -0.97)).toBe(-1);
    expect(simplestDecimal(8.9, 12)).toBe(10);
  });
  it("is the midpoint to one significant figure when the leading digits differ", () => {
    expect(simplestDecimal(2.38, 2.42)).toBe(2.4);
    expect(simplestDecimal(1.9, 2.3)).toBe(2);
  });
  it("is the midpoint to one more figure than the ends share", () => {
    expect(simplestDecimal(1.4136, 1.4146)).toBe(1.414);
    expect(simplestDecimal(-2.9412, -2.9388)).toBe(-2.94);
    expect(simplestDecimal(2.02696, 2.02704)).toBe(2.027);
  });
  it("passes non-finite ends through", () => {
    expect(simplestDecimal(NaN, 1)).toBeNaN();
    expect(simplestDecimal(1, Infinity)).toBe(Infinity);
  });
});

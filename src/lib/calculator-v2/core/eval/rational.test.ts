import { describe, expect, it } from "vitest";
import {
  abs,
  add,
  div,
  exactParse,
  fromDouble,
  isExactRational,
  MAX_EXACT,
  mod,
  mul,
  neg,
  pow,
  rational,
  sqrt,
  sub,
  toNumber,
} from "./rational";

const p = exactParse;
const r = (n: number, d: number) => ({ n, d });

describe("MATHS-CORE-1 exact rationals", () => {
  it("MATHS-CORE-1 0.1+0.2-0.3 is exactly 0", () => {
    const result = sub(add(p("0.1"), p("0.2")), p("0.3"));
    expect(result).toEqual(r(0, 1));
    expect(toNumber(result)).toBe(0);
    expect(add(p("0.1"), p("0.2"))).toEqual(r(3, 10));
  });

  it("MATHS-CORE-1 a decimal string parses to n/10^k reduced, trailing zeros dropped, d > 0", () => {
    expect(p("1.005")).toEqual(r(201, 200));
    expect(p("1.50")).toEqual(r(3, 2));
    expect(p("-0.25")).toEqual(r(-1, 4));
    expect(p("42")).toEqual(r(42, 1));
    expect(p(".5")).toEqual(r(1, 2));
    expect(p("3.")).toEqual(r(3, 1));
    expect(p("0.000")).toEqual(r(0, 1));
    expect(p("-0")).toEqual(r(0, 1));
    expect([p(""), p("."), p("1e5"), p("abc"), p("1.2.3")].every(Number.isNaN)).toBe(true);
  });

  it("MATHS-CORE-1 a literal past 2^53-1 falls back to a float", () => {
    expect(MAX_EXACT).toBe(2 ** 53 - 1);
    expect(p("9007199254740991")).toEqual(r(MAX_EXACT, 1));
    expect(p("9007199254740992")).toBe(9007199254740992);
    expect(p("12345678901234567890")).toBe(12345678901234567890);
    expect(p("0.12345678901234567")).toBe(0.12345678901234567); // 10^17 > 2^53-1
    expect(p("-1.0000000000000001")).toBe(-1.0000000000000001);
  });

  it("MATHS-CORE-1 add, sub, mul and div stay exact and reduced", () => {
    expect(add(r(1, 6), r(1, 3))).toEqual(r(1, 2));
    expect(sub(r(1, 4), r(3, 4))).toEqual(r(-1, 2));
    expect(mul(r(2, 3), r(9, 4))).toEqual(r(3, 2));
    expect(div(r(1, 3), r(-2, 9))).toEqual(r(-3, 2));
    expect(mul(r(0, 1), r(-5, 7))).toEqual(r(0, 1));
    expect(neg(r(3, 5))).toEqual(r(-3, 5));
    expect(abs(r(-3, 5))).toEqual(r(3, 5));
    expect(abs(-2.5)).toBe(2.5);
  });

  it("MATHS-CORE-1 an intermediate past 2^53-1 falls back to doubles", () => {
    const a = r(1, 2 ** 30);
    const b = r(1, 2 ** 30 - 1);
    const sum = add(a, b);
    expect(isExactRational(sum)).toBe(false);
    // The fallback divides the cross-multiplied numerator by the denominator once.
    expect(sum).toBe((2 ** 31 - 1) / (2 ** 60 - 2 ** 30));
    expect(add(r(-351, 262), r(-330146312713624, 919995546340942))).toBe(-1.6985510814209315);
    expect(sub(r(MAX_EXACT, 2), r(MAX_EXACT - 2, 3))).toBe(1501199875790165.8);
    const product = mul(r(2 ** 40 + 1, 3), r(2 ** 20 + 1, 7));
    expect(isExactRational(product)).toBe(false);
    expect(product).toBe(((2 ** 40 + 1) * (2 ** 20 + 1)) / 21);
    expect(div(r(2 ** 40 + 1, 3), r(7, 2 ** 20 + 1))).toBe(product);
    // Cross-reduction first keeps a product exact when the reduced factors fit.
    expect(mul(r(2 ** 40, 3), r(3, 2 ** 40))).toEqual(r(1, 1));
    // Every intermediate is checked, not just the final sum.
    expect(isExactRational(sub(r(MAX_EXACT, 2), r(MAX_EXACT - 2, 3)))).toBe(false);
    // A non-rational operand gives double arithmetic.
    expect(add(r(1, 2), Math.PI)).toBe(0.5 + Math.PI);
  });

  it("MATHS-CORE-1 division by an exact zero gives the double quotient", () => {
    expect(div(r(1, 2), r(0, 1))).toBe(Infinity);
    expect(div(r(-1, 2), r(0, 1))).toBe(-Infinity);
    expect(div(r(0, 1), r(0, 1))).toBeNaN();
  });

  it("MATHS-CORE-1 pow is exact for integer exponents", () => {
    expect(pow(r(2, 3), r(3, 1))).toEqual(r(8, 27));
    expect(pow(r(2, 3), r(-2, 1))).toEqual(r(9, 4));
    expect(pow(r(-1, 2), r(3, 1))).toEqual(r(-1, 8));
    expect(pow(r(5, 1), r(0, 1))).toEqual(r(1, 1));
    expect(pow(r(0, 1), r(0, 1))).toEqual(r(1, 1));
    expect(pow(p("1.1"), r(2, 1))).toEqual(r(121, 100));
    expect(pow(r(0, 1), r(-1, 1))).toBeNaN(); // realPow: a non-finite power is undefined
    expect(isExactRational(pow(r(3, 1), r(40, 1)))).toBe(false);
  });

  it("MATHS-CORE-1 a p/q power is exact only when both q-th roots are exact", () => {
    expect(pow(r(4, 9), r(1, 2))).toEqual(r(2, 3));
    expect(pow(r(8, 27), r(2, 3))).toEqual(r(4, 9));
    expect(pow(r(8, 27), r(-2, 3))).toEqual(r(9, 4));
    expect(pow(r(-8, 27), r(1, 3))).toEqual(r(-2, 3));
    expect(pow(r(-8, 27), r(2, 3))).toEqual(r(4, 9));
    expect(pow(r(-4, 1), r(1, 2))).toBeNaN(); // a negative base needs an odd q
  });

  it("MATHS-CORE-1 2^(1/2) falls back to a double", () => {
    const root = pow(p("2"), div(p("1"), p("2")));
    expect(isExactRational(root)).toBe(false);
    expect(root).toBe(Math.SQRT2);
    expect(mul(root, root)).toBe(2.0000000000000004);
    expect(pow(r(-2, 1), r(1, 3))).toBe(-(2 ** (1 / 3)));
    expect(pow(Math.PI, r(2, 1))).toBe(Math.PI ** 2);
  });

  it("MATHS-CORE-1 sqrt is exact for perfect-square rationals", () => {
    const fifth = sqrt(p("0.04"));
    expect(fifth).toEqual(r(1, 5));
    expect(sub(fifth, p("0.2"))).toEqual(r(0, 1));
    expect(sqrt(p("1.010025"))).toEqual(p("1.005"));
    expect(sqrt(r(0, 1))).toEqual(r(0, 1));
    expect(sqrt(r(2, 1))).toBe(Math.SQRT2);
    expect(sqrt(r(-4, 1))).toBeNaN();
    expect(sqrt(9)).toBe(3);
  });

  it("MATHS-CORE-1 mod is exact and takes the sign of the divisor", () => {
    expect(mod(p("0.3"), p("0.1"))).toEqual(r(0, 1));
    expect(mod(p("-7.5"), r(2, 1))).toEqual(r(1, 2));
    expect(mod(r(7, 1), r(-3, 1))).toEqual(r(-2, 1));
    expect(mod(r(0, 1), r(-3, 1))).toEqual(r(0, 1));
    expect(mod(r(5, 1), r(0, 1))).toBeNaN();
    expect(mod(0.3, 0.1)).toBe(0.09999999999999998); // the double path is not exact
    // floor(a/b) is taken on integers: (2^53-1)/2 is 4503599627370495.5, which a double rounds up.
    expect(mod(r(MAX_EXACT, 2), r(1, 1))).toEqual(r(1, 2));
    // An inexact quotient still gives an exact result when a − b·⌊a/b⌋ fits: here ⌊a/b⌋ = 0.
    const small = r(1, 2 ** 30 - 1);
    const half = r(2 ** 29 + 1, 2 ** 30 + 1);
    expect(isExactRational(div(small, half))).toBe(false);
    expect(mod(small, half)).toEqual(small);
  });

  it("MATHS-CORE-1 fromDouble re-promotes integer-valued doubles, and toNumber converts back", () => {
    expect(fromDouble(3)).toEqual(r(3, 1));
    expect(fromDouble(-0)).toEqual(r(0, 1));
    expect(fromDouble(0.5)).toBe(0.5);
    expect(fromDouble(2 ** 53)).toBe(2 ** 53);
    expect(fromDouble(Infinity)).toBe(Infinity);
    expect(fromDouble(NaN)).toBeNaN();
    // An integer-valued double sub-result re-enters the exact path: π−π+0.1+0.2−0.3 is 0.
    const zero = fromDouble(toNumber(sub(Math.PI, Math.PI)));
    expect(sub(add(add(zero, p("0.1")), p("0.2")), p("0.3"))).toEqual(r(0, 1));
    expect(add(sub(Math.PI, Math.PI), p("0.1"))).toBe(0.1);
    expect(toNumber(r(1, 3))).toBe(1 / 3);
    expect(toNumber(2.5)).toBe(2.5);
    expect(rational(6, -4)).toEqual(r(-3, 2));
    expect(rational(1.5, 2)).toBe(0.75);
    expect(rational(1, 0)).toBe(Infinity);
  });
});

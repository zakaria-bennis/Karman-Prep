import { describe, expect, it } from "vitest";
import captured from "./__fixtures__/desmos-fractions.json";
import { displayFraction, fractionLatex, fractionText } from "./fraction";

const text = (x: number) => {
  const f = displayFraction(x);
  return f === null ? null : fractionText(f);
};

describe("NM-7 the decimal-to-fraction rule", () => {
  it("matches every value captured from Desmos (238 values, 181 with a fraction form)", () => {
    expect(captured.values.length).toBeGreaterThanOrEqual(100);
    const mismatches = captured.values
      .map((c) => ({ latex: c.latex, want: c.fraction, got: text(c.value) }))
      .filter((c) => c.want !== c.got);
    expect(mismatches).toEqual([]);
  });

  it("finds the fraction of exact and nearly exact doubles", () => {
    expect(text(0.3)).toBe("3/10");
    expect(text(0.125)).toBe("1/8");
    expect(text(-0.125)).toBe("-1/8");
    expect(text(2 / 3)).toBe("2/3");
    expect(text(355 / 113)).toBe("355/113");
    expect(text(0.1 + 0.2)).toBe("3/10"); // 0.30000000000000004
    expect(text(Math.sin(Math.PI / 6))).toBe("1/2"); // 0.49999999999999994
    expect(text(2.5)).toBe("5/2"); // improper, never mixed
    expect(text(1e-12)).toBe("1/1000000000000");
  });

  it("gives typed 12-digit roundings, irrationals and whole numbers no fraction", () => {
    for (const x of [0.666666666667, 3.14159292035, Math.PI, Math.SQRT2, Math.E, Math.LN2])
      expect(displayFraction(x)).toBeNull();
    for (const x of [0, 5, -7, 1e6, 2 ** 60, 1e12]) expect(displayFraction(x)).toBeNull();
  });

  it("NM-7 limits the denominator to 10^6/√|x| and drops |x| > 10^12 or < 10^-12", () => {
    expect(text(1e11 + 0.5)).toBe("200000000001/2"); // limit 3.16
    expect(displayFraction(5e11 + 0.5)).toBeNull(); // limit 1.41: only the whole part fits
    expect(displayFraction(1e-13)).toBeNull();
    expect(displayFraction(1e13 + 0.5)).toBeNull();
    expect(displayFraction(Number.NaN)).toBeNull();
    expect(displayFraction(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("works on the signed value, so a negative can differ from its positive (as in Desmos)", () => {
    expect(text(1.5e-7)).toBe("3/20000000");
    expect(displayFraction(-1.5e-7)).toBeNull();
    expect(text(1e-12)).not.toBeNull();
    expect(displayFraction(-1e-12)).toBeNull();
  });

  it("NM-7 writes the sign before the bar", () => {
    expect(fractionLatex({ n: -1, d: 8 })).toBe("-\\frac{1}{8}");
    expect(fractionLatex({ n: 7, d: 12 })).toBe("\\frac{7}{12}");
  });
});

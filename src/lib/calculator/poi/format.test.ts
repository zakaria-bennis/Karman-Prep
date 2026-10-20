import { describe, expect, it } from "vitest";
import type { ViewSpec } from "../plot/viewport";
import { coordinateScale, formatCoordinate, formatPoiLabel } from "./format";

/** A view `width` units wide over 960 px, centred on the origin, 1:1 units per px. */
const view = (width = 20, height = width * (854 / 960)): ViewSpec => ({
  viewport: { left: -width / 2, right: width / 2, bottom: -height / 2, top: height / 2 },
  size: { width: 960, height: 854 },
  dpr: 1,
});
const scaleX = (width: number) => coordinateScale(view(width)).x;
const text = (v: number, width = 20) => formatCoordinate(v, scaleX(width)).text;

describe("POI-TRACE-19 coordinate labels", () => {
  it("undefined and exactly zero print as words and 0", () => {
    expect(formatCoordinate(NaN, 20).latex).toBe("\\mathrm{undefined}");
    expect(formatCoordinate(Infinity, 20).text).toBe("undefined");
    expect(formatCoordinate(0, 20)).toMatchObject({ text: "0", latex: "0" });
    expect(formatCoordinate(-0, 20).text).toBe("0");
  });

  it("the scale is 1000 units per px of each axis", () => {
    const s = coordinateScale(view(20));
    expect(s.x).toBeCloseTo((1000 * 20) / 960, 12);
  });

  it("D = max(5, floor(6.5 − log10 s)) decimals, trailing zeros trimmed", () => {
    expect(text(Math.SQRT2)).toBe("1.41421");
    expect(text(-Math.SQRT2)).toBe("−1.41421");
    expect(text(1 / 3)).toBe("0.33333");
    expect(text(Math.cbrt(2))).toBe("1.25992");
    expect(text(3)).toBe("3");
    expect(text(-3e-8)).toBe("0"); // rounds to −0, printed 0
    expect(text(Math.SQRT2, 2)).toBe("1.414214");
    expect(text(Math.SQRT2, 0.02)).toBe("1.414214"); // |v| dominates the scale
    expect(text(123456.789)).toBe("123456.789");
    expect(text(0.00001234)).toBe("0.00001");
  });

  it("very small scales print floating noise in scientific form", () => {
    const s = scaleX(2e-5);
    expect(formatCoordinate(Math.SQRT2, s).text).toBe("1.414214");
    const noise = formatCoordinate(-4.440892098500626e-16, s);
    expect(noise.latex).toBe("-4.44089\\times10^{-16}");
    expect(noise.text).toBe("−4.44089×10^−16");
  });

  it("very large scales print scientific", () => {
    const s = scaleX(2e7);
    expect(formatCoordinate(1414.2135623730951, s).latex).toBe("1.41421\\times10^{3}");
    expect(formatCoordinate(-2e6, s).latex).toBe("-2\\times10^{6}");
    expect(formatCoordinate(2.3283064365386963e-10, s).latex).toBe("2.32831\\times10^{-10}");
  });

  it("rational multiples of π with denominators to 24 print as π fractions", () => {
    expect(formatCoordinate(-3 * Math.PI, 20).latex).toBe("-3\\pi");
    expect(formatCoordinate(Math.PI, 20).latex).toBe("\\pi");
    expect(formatCoordinate(-Math.PI, 20).latex).toBe("-\\pi");
    expect(formatCoordinate(Math.PI / 2, 20).latex).toBe("\\frac{\\pi}{2}");
    expect(formatCoordinate((-5 * Math.PI) / 2, 20).latex).toBe("-\\frac{5\\pi}{2}");
    expect(formatCoordinate((7 * Math.PI) / 24, 20).text).toBe("7π/24");
    expect(formatCoordinate(Math.PI / 25, 20).text).toBe("0.12566");
    expect(formatCoordinate(Math.PI / 2 + 1e-9, 20).text).toBe("1.5708");
  });

  it("labels join both coordinates", () => {
    expect(formatPoiLabel({ x: Math.SQRT2, y: 0 }, view()).text).toBe("(1.41421, 0)");
    expect(formatPoiLabel({ x: 0, y: -2 }, view()).latex).toBe("\\left(0,\\ -2\\right)");
    expect(formatPoiLabel({ x: 1, y: NaN }, view()).text).toBe("(1, undefined)");
    expect(formatPoiLabel({ x: -2.5, y: 4.25 }, view()).text).toBe("(−2.5, 4.25)");
    expect(formatPoiLabel({ x: -1.414, y: -0.000604 }, view()).text).toBe("(−1.414, −0.0006)");
  });
});

import { expect, it } from "vitest";
import { formatParameter, formatStatistic } from "./format";

it("RT-22.1 parameters keep max(T, P) significant digits, T = integer digits + 5 up to 9", () => {
  expect(formatParameter(2.02)).toBe("2.02");
  expect(formatParameter(3.134285714285)).toBe("3.13429");
  expect(formatParameter(0.026785714)).toBe("0.0267857");
  expect(formatParameter(273.454545454)).toBe("273.45455");
  expect(formatParameter(600.0000000001)).toBe("600");
  expect(formatParameter(-1164000.0000004)).toBe("-1164000");
  expect(formatParameter(1.23456789e-9)).toBe("1.23457×10^-9");
  expect(formatParameter(9.1e9)).toBe("9.1×10^9");
});

it("RT-22.3 statistics show 4 significant digits, 0 below 1e-15, scientific outside [1e-6, 1e4)", () => {
  expect(formatStatistic(1)).toBe("1");
  expect(formatStatistic(0.99547900457)).toBe("0.9955");
  expect(formatStatistic(-0.25)).toBe("-0.25");
  expect(formatStatistic(0.99999999)).toBe("1");
  expect(formatStatistic(0.000573889)).toBe("0.0005739");
  expect(formatStatistic(12345.678)).toBe("1.23×10^4");
  expect(formatStatistic(9999.6)).toBe("1×10^4");
  expect(formatStatistic(1e-16)).toBe("0");
  expect(formatStatistic(NaN)).toBe("undefined");
});

import { expect, it } from "vitest";
import { formatParameter, formatStatistic } from "./format";

it("D-45 parameters show 6 significant digits and statistics 4 decimals, both trimmed", () => {
  expect(formatParameter(2.02)).toBe("2.02");
  expect(formatParameter(3.134285714285)).toBe("3.13429");
  expect(formatParameter(0.026785714)).toBe("0.0267857");
  expect(formatParameter(600.0000000001)).toBe("600");
  expect(formatParameter(-1164000.0000004)).toBe("-1164000");
  expect(formatParameter(1.23456789e-9)).toBe("1.23457×10^-9");
  expect(formatStatistic(1)).toBe("1");
  expect(formatStatistic(0.99547900457)).toBe("0.9955");
  expect(formatStatistic(-0.25)).toBe("-0.25");
  expect(formatStatistic(0.99999999)).toBe("1");
});

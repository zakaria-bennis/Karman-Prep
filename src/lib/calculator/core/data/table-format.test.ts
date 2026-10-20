import { expect, it } from "vitest";
import { formatTableNumber } from "./table-format";

// Every pair read from the reference's computed column 1x₁ (2026-10-19).
const CASES: [number, string][] = [
  [10000000, "1×10^7"],
  [123456789, "1.234568×10^8"],
  [99999999999, "1×10^11"],
  [999999999999, "1×10^12"],
  [0.001, "0.001"],
  [0.0001, "1×10^-4"],
  [0.00001, "1×10^-5"],
  [0.000123456789, "1.234568×10^-4"],
  [1234.56789, "1234.5679"],
  [-0.5, "−0.5"],
  [0, "0"],
  [12345678.9, "1.234568×10^7"],
  [0.0000001, "1×10^-7"],
  [123456.789, "123456.79"],
  [2 / 3, "0.66666667"],
  [Math.sin(1), "0.84147098"],
  [Math.sin(1000000), "−0.3499935"],
  [1000000, "1000000"],
  [16.30969097, "16.309691"],
];

it("RT-6, TABLES-26 computed cells show 8 significant digits, scientific outside 0.001 to 10^7", () => {
  for (const [v, shown] of CASES) expect(formatTableNumber(v), String(v)).toBe(shown);
  expect(formatTableNumber(null)).toBe("undefined");
  expect(formatTableNumber(NaN)).toBe("undefined");
});

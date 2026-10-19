import { expect, it } from "vitest";
import { formatAxisLabel, formatNumber, formatValue, formatValueLatex } from "./format";
import { complexValue, numberValue, UNDEFINED } from "./values";

const P = Math.PI;
const n = numberValue;

it("NM-1, NM-2, NM-3, NM-6 numbers: 12 significant digits, plain or m×10^n, no snapping, one undefined text", () => {
  const rows: [number, string][] = [
    [1 / 3, "0.333333333333"],
    [P, "3.14159265359"],
    [-0, "0"],
    [0.1 + 0.2, "0.3"],
    [2 ** 40, "1.09951162778×10^12"],
    [-(2 ** 40), "-1.09951162778×10^12"],
    [999999999999, "999999999999"],
    [999999999999.9, "1×10^12"],
    [1e-6, "0.000001"],
    [1e-7, "1×10^-7"],
    [123456.789, "123456.789"],
    [1e-20, "1×10^-20"],
    [0.1 + 0.2 - 0.3, "5.55111512313×10^-17"],
    [NaN, "undefined"],
    [Infinity, "undefined"],
    [-Infinity, "undefined"],
  ];
  for (const [v, s] of rows) expect(formatNumber(v), String(v)).toBe(s);
  expect([numberValue(Infinity), complexValue(NaN, 1), complexValue(3, 0)]).toEqual([
    UNDEFINED,
    UNDEFINED,
    n(3),
  ]);
  expect(formatValue(UNDEFINED)).toBe("undefined");
});
it("NM-5, NM-20 points show (a, b) and complex values a+bi with negligible parts omitted", () => {
  const points: [[number, number], string][] = [
    [[1, 2], "(1, 2)"],
    [[1 / 3, 2 ** 40], "(0.333333333333, 1.09951162778×10^12)"],
    [[1, NaN], "(1, undefined)"],
  ];
  for (const [value, s] of points) expect(formatValue({ type: "point", value })).toBe(s);
  const complex: [number, number, string][] = [
    [-1, 1.2246467991473532e-16, "-1"],
    [0, 1, "i"],
    [0, -1, "-i"],
    [3, -4, "3-4i"],
    [1, 1, "1+i"],
    [0, 2, "2i"],
    [2.5, 1e-20, "2.5"],
    [1e-20, 2, "2i"],
    [1, 1.3643763538418412, "1+1.36437635384i"],
  ];
  for (const [re, im, s] of complex)
    expect(formatValue({ type: "complex", value: { re, im } }), s).toBe(s);
});
it("NM-2, NM-5, NM-6 formatValueLatex writes the same text with \\times10^{n}", () => {
  expect([
    formatValueLatex(n(2 ** 40)),
    formatValueLatex({ type: "point", value: [1, 2] }),
    formatValueLatex(UNDEFINED),
  ]).toEqual(["1.09951162778\\times10^{12}", "\\left(1,2\\right)", "\\mathrm{undefined}"]);
});
it("NM-8 axis labels use the fewest decimals the step needs", () => {
  const rows: [number, number, string][] = [
    [0.6000000000000001, 0.2, "0.6"],
    [0.4, 0.2, "0.4"],
    [-0.4, 0.2, "-0.4"],
    [5000, 5000, "5000"],
    [10000, 5000, "10000"],
    [1.5, 0.5, "1.5"],
    [1, 0.5, "1"],
    [1e-17, 0.2, "0"],
    [2e12, 1e12, "2×10^12"],
    [1.5e12, 5e11, "1.5×10^12"],
    [4e-7, 2e-7, "4×10^-7"],
    [1e15 + 1e6, 1e6, "1.000000001×10^15"],
  ];
  for (const [v, step, s] of rows) expect(formatAxisLabel(v, step), `${v}/${step}`).toBe(s);
});

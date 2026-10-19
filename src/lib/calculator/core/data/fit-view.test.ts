import { expect, it } from "vitest";
import { fitPoints } from "./fit-view";

const series = (...coords: number[][]) => coords.map((c) => new Float64Array(c));

it("D-16 Zoom to fit table n fits every plotted point with 10% padding and a zero span widened", () => {
  // (1, 2), (3, 6) and (5, 4); the pair with an undefined x is not plotted.
  const fit = fitPoints(series([1, 2, 3, 6], [5, 4, NaN, 9]))!;
  const expected = { left: 0.6, right: 5.4, bottom: 1.6, top: 6.4 };
  for (const side of ["left", "right", "bottom", "top"] as const)
    expect(fit[side]).toBeCloseTo(expected[side], 12);
  // One point: each axis is value ± max(1, 0.1·|value|).
  expect(fitPoints(series([20, 0]))).toEqual({ left: 18, right: 22, bottom: -1, top: 1 });
});

it("D-16 the control is disabled when nothing is plotted", () => {
  expect(fitPoints(series([NaN, 1], []))).toBeNull();
  expect(fitPoints([])).toBeNull();
});

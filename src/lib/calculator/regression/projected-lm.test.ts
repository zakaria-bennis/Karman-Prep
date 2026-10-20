// RT-18: the multi-start LM with variable projection.
import { expect, it } from "vitest";
import { multiStartLm, startRows } from "./projected-lm";

it("RT-18 the start table: all 0, all 1, then the constant walk (k·503 mod 31)", () => {
  const rows = startRows(2);
  expect(rows).toHaveLength(31);
  expect(rows[0]).toEqual([0, 0]);
  expect(rows[1]).toEqual([1, 1]);
  expect(rows[2]).toEqual([-6.94, 4.414]); // k = 4, 5: 2012 mod 31 = 28, 2515 mod 31 = 4
  expect(startRows(1)[0]).toEqual([18.9]);
});

it("RT-18 a·b^x with a projected fits exponential data", () => {
  const xs = [1, 2, 3, 4, 5],
    ys = [3.1, 6.2, 11.8, 24.5, 49];
  const fit = multiStartLm(
    {
      n: 5,
      y: ys,
      linear: [true, false],
      model: ([a, b], i) => a * b ** xs[i],
      gradient: ([a, b], i) => [b ** xs[i], a * xs[i] * b ** (xs[i] - 1)],
    },
    [1, 1]
  );
  expect(fit.params[0]).toBeCloseTo(1.48887, 4);
  expect(fit.params[1]).toBeCloseTo(2.01138, 4);
});

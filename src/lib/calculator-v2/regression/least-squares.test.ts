import { expect, it } from "vitest";
import { LONGLEY } from "./__fixtures__/nist";
import { solveLeastSquares } from "./least-squares";

/** Row-major design matrix from columns. */
const design = (cols: number[][]): Float64Array => {
  const n = cols[0].length,
    a = new Float64Array(n * cols.length);
  cols.forEach((c, j) => c.forEach((v, i) => (a[i * cols.length + j] = v)));
  return a;
};
const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);

it("D-25 an exact line is fitted exactly", () => {
  const x = [1990, 2000, 2010, 2020],
    y = [30000, 36000, 42000, 48000];
  const p = solveLeastSquares(design([x, x.map(() => 1)]), 4, 2, Float64Array.from(y));
  expect(p[0]).toBeCloseTo(600, 9);
  expect(p[1]).toBeCloseTo(-1164000, 5);
});

it("D-26 rank-deficient data fits silently with the minimum-norm solution", () => {
  // y = a·b·x has one direction: the columns x and x are equal, so the min-norm split is even.
  const x = [1, 2, 3],
    y = [2, 4, 6];
  const p = solveLeastSquares(design([x, x]), 3, 2, Float64Array.from(y));
  expect(p[0]).toBeCloseTo(1, 12);
  expect(p[1]).toBeCloseTo(1, 12);
  // Two points, three quadratic parameters: an exact fit, no error.
  const q = solveLeastSquares(
    design([
      [1, 4],
      [1, 2],
      [1, 1],
    ]),
    2,
    3,
    Float64Array.from([3, 5])
  );
  expect(q[0] * 1 + q[1] * 1 + q[2]).toBeCloseTo(3, 10);
  expect(q[0] * 4 + q[1] * 2 + q[2]).toBeCloseTo(5, 10);
});

it("D-39 NIST Longley matches the certified values through the SVD path", () => {
  const n = LONGLEY.y.length;
  const a = design([LONGLEY.y.map(() => 1), ...LONGLEY.predictors]);
  const p = solveLeastSquares(a, n, 7, Float64Array.from(LONGLEY.y));
  LONGLEY.certified.forEach((c, j) => expect(rel(p[j], c), `parameter ${j}`).toBeLessThan(1e-9));
});

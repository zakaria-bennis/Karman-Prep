import { describe, expect, it } from "vitest";
import { findExtrema, findRoots } from "./roots";

const S = { lo: -12, hi: 12, samples: 2000 };
const near = (actual: number, expected: number, tol: number) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(expected)));

describe("one-dimensional search", () => {
  it("POI-5 roots come from sign changes with no absolute threshold, so 1e-8(x-3) has one root", () => {
    const roots = findRoots((x) => 1e-8 * (x - 3), S);
    expect(roots).toHaveLength(1);
    near(roots[0], 3, 1e-10);
    expect(findRoots((x) => 1e8 * (x + 2), S)).toHaveLength(1);
    expect(findRoots((x) => x * x + 1, S)).toEqual([]);
  });

  it("POI-5 touching roots are found by minimising |f| relative to its local scale", () => {
    const roots = findRoots((x) => (x - 2) ** 2, S);
    expect(roots).toHaveLength(1);
    near(roots[0], 2, 10 * Math.sqrt(2.2e-16));
    expect(findRoots((x) => 1e-9 * (x - 2) ** 2, S)).toHaveLength(1);
    expect(findRoots((x) => (x - 2) ** 2 + 1e-4, S)).toEqual([]);
  });

  it("POI-6 poles and removable holes are not roots", () => {
    const tan = findRoots(Math.tan, { lo: -10, hi: 10, samples: 2000 });
    expect(tan).toHaveLength(7);
    tan.forEach((r) => near(r, Math.round(r / Math.PI) * Math.PI, 1e-10));
    const hole = findRoots((x) => (x * x - 1) / (x - 1), S);
    expect(hole).toHaveLength(1);
    near(hole[0], -1, 1e-10);
    expect(findRoots((x) => 1 / x, S)).toEqual([]);
  });

  it("POI-6 a domain endpoint is a root only when the function reaches zero there", () => {
    const roots = findRoots(Math.sqrt, { lo: -12.3, hi: 12, samples: 2000 });
    expect(roots).toHaveLength(1);
    near(roots[0], 0, 1e-10);
    expect(findRoots((x) => Math.sqrt(x) + 1, { lo: -12.3, hi: 12, samples: 2000 })).toEqual([]);
  });

  it("POI-8 corner extrema come from a sign change in slope", () => {
    const ex = findExtrema((x) => Math.abs(x - 1), S);
    expect(ex).toHaveLength(1);
    expect(ex[0].kind).toBe("minimum");
    near(ex[0].t, 1, 1e-7);
    expect(findExtrema((x) => 1 / (x * x), S)).toEqual([]);
    expect(findExtrema(Math.tan, S)).toEqual([]);
  });

  it("POI-11 simple roots meet 1e-10 relative and extrema 1e-7 in x and 1e-12 in y", () => {
    const roots = findRoots((x) => x * x - 2, S);
    expect(roots).toHaveLength(2);
    near(roots[0], -Math.SQRT2, 1e-10);
    near(roots[1], Math.SQRT2, 1e-10);
    const ex = findExtrema(Math.sin, { lo: 0, hi: 3, samples: 300 });
    expect(ex).toHaveLength(1);
    expect(ex[0].kind).toBe("maximum");
    near(ex[0].t, Math.PI / 2, 1e-7);
    near(Math.sin(ex[0].t), 1, 1e-12);
    near(
      findRoots((x) => 1000 * (x - 1234.5678), { lo: 1000, hi: 2000, samples: 500 })[0],
      1234.5678,
      1e-10
    );
  });
});

import { describe, expect, it } from "vitest";
import { findExtrema, findRoots } from "./roots";

const S = { lo: -12, hi: 12, samples: 2000 };
const near = (actual: number, expected: number, tol: number) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(expected)));

describe("one-dimensional search", () => {
  it("POI-TRACE-6 zeros come from sign changes, so 1e-8(x-3) has one", () => {
    const roots = findRoots((x) => 1e-8 * (x - 3), S);
    expect(roots).toHaveLength(1);
    near(roots[0], 3, 1e-10);
    expect(findRoots((x) => 1e8 * (x + 2), S)).toHaveLength(1);
    expect(findRoots((x) => x * x + 1, S)).toEqual([]);
  });

  it("POI-TRACE-5 a touching root is no zero, but counts for intersections", () => {
    expect(findRoots((x) => (x - 2) ** 2, S)).toEqual([]);
    expect(findRoots((x) => (x - 2) ** 2, { lo: -10, hi: 10, samples: 2000 })).toEqual([]); // sample on 2
    const touching = findRoots((x) => (x - 2) ** 2, S, true);
    expect(touching).toHaveLength(1);
    near(touching[0], 2, 10 * Math.sqrt(2.2e-16));
    expect(findRoots((x) => (x - 2) ** 2 + 1e-4, S, true)).toEqual([]);
    // Only where f is exactly 0: two crossings 2e-5 apart inside one sample step are no touch
    // (Desmos: y=2.0000000001 against y=(x-1.0001)^2+2, live 2026-10-25)
    expect(findRoots((x) => (x - 2) ** 2 - 1e-10, S, true)).toEqual([]);
    // Rounding between two equal curves is no touch either; the range's ends still count
    const equal = (x: number) => (x + 5) ** 2 + 8 * (x + 5) + 10 - (x * x + 18 * x + 75);
    expect(findRoots(equal, S, (x) => x * x + 18 * x + 75)).toEqual([-12, 12]);
    // Along f ≡ 0 only the ends of the range count, as Desmos meets two identical curves there.
    expect(findRoots(() => 0, S)).toEqual([-12, 12]);
  });

  it("POI-TRACE-6 poles and removable holes are not zeros", () => {
    const tan = findRoots(Math.tan, { lo: -10, hi: 10, samples: 2000 });
    expect(tan).toHaveLength(7);
    tan.forEach((r) => near(r, Math.round(r / Math.PI) * Math.PI, 1e-10));
    const hole = findRoots((x) => (x * x - 1) / (x - 1), S);
    expect(hole).toHaveLength(1);
    near(hole[0], -1, 1e-10);
    expect(findRoots((x) => 1 / x, S)).toEqual([]);
  });

  it("POI-TRACE-6 a run's end is a zero only when f reaches 0 there", () => {
    const roots = findRoots(Math.sqrt, { lo: -12.3, hi: 12, samples: 2000 });
    expect(roots).toHaveLength(1);
    near(roots[0], 0, 1e-10);
    expect(findRoots((x) => Math.sqrt(x) + 1, { lo: -12.3, hi: 12, samples: 2000 })).toEqual([]);
    const circle = findRoots((x) => Math.sqrt(25 - x * x), { lo: -10, hi: 10, samples: 1920 });
    expect(circle.map((r) => Math.round(r * 1e6) / 1e6)).toEqual([-5, 5]);
  });

  it("POI-TRACE-19 a sample landing within rounding of a root still brackets it", () => {
    // The view [√2 − 1, √2 + 1] samples x²−2 at ≈√2, where it is −4.4e-16 (Desmos opens (1.414214, 0)).
    const s = { lo: Math.SQRT2 - 1, hi: Math.SQRT2 + 1, samples: 1984, tol: 1.8 / 854 };
    const roots = findRoots((x) => x * x - 2, s);
    expect(roots).toHaveLength(1);
    near(roots[0], Math.SQRT2, 1e-12);
  });

  it("POI-TRACE-8 corner extrema come from a change of direction", () => {
    const ex = findExtrema((x) => Math.abs(x - 1), S);
    expect(ex).toHaveLength(1);
    expect(ex[0].kind).toBe("minimum");
    near(ex[0].t, 1, 1e-7);
    expect(findExtrema((x) => 1 / (x * x), S)).toEqual([]);
    expect(findExtrema(Math.tan, S)).toEqual([]);
    expect(findExtrema(() => 3, S)).toEqual([]);
  });

  it("simple roots meet 1e-10 relative and extrema 1e-7 in x and 1e-12 in y", () => {
    const roots = findRoots((x) => x * x - 2, S);
    expect(roots).toHaveLength(2);
    near(roots[0], -Math.SQRT2, 1e-10);
    near(roots[1], Math.SQRT2, 1e-10);
    const ex = findExtrema(Math.sin, { lo: 0, hi: 3, samples: 300 });
    expect(ex).toHaveLength(1);
    expect(ex[0].kind).toBe("maximum");
    near(ex[0].t, Math.PI / 2, 1e-7);
    near(Math.sin(ex[0].t), 1, 1e-12);
  });
});

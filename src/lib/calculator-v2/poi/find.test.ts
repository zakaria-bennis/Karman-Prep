import { describe, expect, it } from "vitest";
import { NO_DEADLINE } from "../core/deadline";
import type { ViewSpec } from "../plot/viewport";
import { findPois, POI_CAP, searchRange } from "./find";
import type { PoiCurve, PoiPoint } from "./types";

const view = (left = -10, right = 10, bottom = -7.5, top = 7.5): ViewSpec => ({
  viewport: { left, right, bottom, top },
  size: { width: 800, height: 600 },
  dpr: 1,
});
const fx = (f: (x: number) => number): PoiCurve => ({ kind: "explicit", independent: "x", f });
const at = (points: PoiPoint[], x: number, y: number, tol = 1e-8) =>
  points.find((p) => Math.abs(p.x - x) <= tol && Math.abs(p.y - y) <= tol);
const kindsAt = (points: PoiPoint[], x: number, y: number, tol = 1e-8) =>
  at(points, x, y, tol)?.kinds;

describe("points of interest per curve", () => {
  it("POI-2 y=f(x) gets zeros, the y-intercept and extrema; x=g(y) the mirror; lines their axis crossing", () => {
    const p = findPois(
      fx((x) => (x - 1) * (x - 3)),
      [],
      view(),
      NO_DEADLINE
    );
    expect(kindsAt(p, 1, 0)).toEqual(["zero"]);
    expect(kindsAt(p, 3, 0)).toEqual(["zero"]);
    expect(kindsAt(p, 0, 3)).toEqual(["y-intercept"]);
    expect(kindsAt(p, 2, -1)).toEqual(["minimum"]);
    expect(p).toHaveLength(4);
    const g = findPois(
      { kind: "explicit", independent: "y", f: (y) => (y - 1) * (y - 3) },
      [],
      view(),
      NO_DEADLINE
    );
    expect(kindsAt(g, 0, 1)).toEqual(["zero"]);
    expect(kindsAt(g, 3, 0)).toEqual(["x-intercept"]);
    expect(kindsAt(g, -1, 2)).toEqual(["minimum"]);
    const v = findPois(
      { kind: "lines", orientation: "vertical", f: (x) => x - 3 },
      [],
      view(),
      NO_DEADLINE
    );
    expect(v.map((q) => [q.x, q.y, q.kinds])).toEqual([[3, 0, ["x-intercept"]]]);
    const h = findPois(
      { kind: "lines", orientation: "horizontal", f: (y) => y + 2 },
      [],
      view(),
      NO_DEADLINE
    );
    expect(h.map((q) => [q.x, q.y, q.kinds])).toEqual([[0, -2, ["y-intercept"]]]);
  });

  it("POI-2 a circle gets its axis intercepts and its top and bottom points, never leftmost or rightmost", () => {
    const p = findPois(
      { kind: "implicit", F: (x, y) => x * x + y * y - 25 },
      [],
      view(),
      NO_DEADLINE
    );
    expect(kindsAt(p, 5, 0)).toEqual(["x-intercept"]);
    expect(kindsAt(p, -5, 0)).toEqual(["x-intercept"]);
    expect(kindsAt(p, 0, 5)).toEqual(["y-intercept", "top"]);
    expect(kindsAt(p, 0, -5)).toEqual(["y-intercept", "bottom"]);
    expect(p).toHaveLength(4);
    const shifted = findPois(
      { kind: "implicit", F: (x, y) => (x - 2) ** 2 + (y - 1) ** 2 - 4 },
      [],
      view(),
      NO_DEADLINE
    );
    expect(kindsAt(shifted, 2, 3, 1e-7)).toEqual(["top"]);
    expect(kindsAt(shifted, 2, -1, 1e-7)).toEqual(["bottom"]);
    expect(kindsAt(shifted, 0, 1, 1e-7)).toEqual(["y-intercept"]);
  });

  it("POI-4 intersections with every other visible curve, including vertical lines and inequality boundaries", () => {
    const others = [
      { rowId: "2", curve: fx((x) => -x + 7) },
      {
        rowId: "3",
        curve: { kind: "lines", orientation: "vertical", f: (x: number) => x + 4 } as PoiCurve,
      },
      {
        rowId: "4",
        curve: { kind: "implicit", F: (x: number, y: number) => y - x * x } as PoiCurve,
      },
    ];
    const p = findPois(
      fx((x) => 2 * x + 1),
      others,
      view(),
      NO_DEADLINE
    );
    const meet = at(p, 2, 5);
    expect(meet?.kinds).toEqual(["intersection"]);
    expect(meet?.withRowId).toBe("2");
    expect(at(p, -4, -7)?.withRowId).toBe("3");
    expect(at(p, 1 - Math.SQRT2, 3 - 2 * Math.SQRT2, 1e-8)?.withRowId).toBe("4");
    const circle = findPois(
      { kind: "implicit", F: (x, y) => x * x + y * y - 25 },
      [{ rowId: "2", curve: { kind: "implicit", F: (x, y) => y - x - 1 } }],
      view(),
      NO_DEADLINE
    );
    expect(at(circle, 3, 4, 1e-7)?.kinds).toEqual(["intersection"]);
    expect(at(circle, -4, -3, 1e-7)?.kinds).toEqual(["intersection"]);
  });

  it("POI-7 coincident points merge into one dot listing every kind", () => {
    const p = findPois(
      fx((x) => x * x - 2),
      [],
      view(),
      NO_DEADLINE
    );
    expect(kindsAt(p, 0, -2)).toEqual(["y-intercept", "minimum"]);
    expect(p).toHaveLength(3);
    const line = findPois(
      fx((x) => 2 * x),
      [],
      view(),
      NO_DEADLINE
    );
    expect(line.map((q) => q.kinds)).toEqual([["zero", "y-intercept"]]);
  });

  it("POI-9 the search covers the view widened by 10% and only points inside the view are returned", () => {
    expect(searchRange(view()).left).toBeCloseTo(-12, 12);
    expect(searchRange(view()).top).toBeCloseTo(9, 12);
    const p = findPois(
      fx((x) => x - 10.5),
      [],
      view(),
      NO_DEADLINE
    );
    expect(p).toEqual([]);
    expect(
      findPois(
        fx((x) => x - 9.5),
        [],
        view(),
        NO_DEADLINE
      )
    ).toHaveLength(1);
  });

  it("POI-10 a kind with more than 100 points in the search region is dropped", () => {
    expect(POI_CAP).toBe(100);
    const p = findPois(
      fx((x) => Math.sin(20 * x)),
      [],
      view(),
      NO_DEADLINE
    );
    expect(p.some((q) => q.kinds.includes("zero"))).toBe(false);
    expect(p.some((q) => q.kinds.includes("maximum"))).toBe(true);
  });
});

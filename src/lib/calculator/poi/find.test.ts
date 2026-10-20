import { describe, expect, it } from "vitest";
import { NO_DEADLINE } from "../core/deadline";
import type { ViewSpec } from "../plot/viewport";
import { findPois, INTERSECTION_CAP, OWN_CAP } from "./find";
import type { PoiBranch, PoiPoint } from "./types";

const view = (left = -10, right = 10, bottom = -8, top = 8): ViewSpec => ({
  viewport: { left, right, bottom, top },
  size: { width: 960, height: 768 },
  dpr: 1,
});
const fx = (f: (x: number) => number): PoiBranch => ({ independent: "x", f });
const fy = (f: (y: number) => number): PoiBranch => ({ independent: "y", f });
const pois = (b: PoiBranch | PoiBranch[], others: { rowId: string; branch: PoiBranch }[] = []) =>
  findPois(Array.isArray(b) ? b : [b], others, view(), NO_DEADLINE);
const at = (points: PoiPoint[], x: number, y: number, tol = 1e-8) =>
  points.find((p) => Math.abs(p.x - x) <= tol && Math.abs(p.y - y) <= tol);
/** Records, as Desmos counts them: a merged dot holds one per kind. */
const records = (points: PoiPoint[]) => points.reduce((n, p) => n + p.kinds.length, 0);
const kindsAt = (points: PoiPoint[], x: number, y: number, tol = 1e-8) =>
  at(points, x, y, tol)?.kinds;

describe("points of interest per branch", () => {
  it("POI-TRACE-5 y=f(x) gets zeros, the intercept and extrema; x=g(y) the mirror", () => {
    const p = pois(fx((x) => (x - 1) * (x - 3)));
    expect(kindsAt(p, 1, 0)).toEqual(["zero"]);
    expect(kindsAt(p, 3, 0)).toEqual(["zero"]);
    expect(kindsAt(p, 0, 3)).toEqual(["intercept"]);
    expect(kindsAt(p, 2, -1, 1e-7)).toEqual(["extremum"]);
    expect(p).toHaveLength(4);
    const g = pois(fy((y) => y * y - 1));
    expect(kindsAt(g, 0, 1)).toEqual(["zero"]);
    expect(kindsAt(g, 0, -1)).toEqual(["zero"]);
    expect(kindsAt(g, -1, 0, 1e-7)).toEqual(["intercept", "extremum"]);
    expect(g).toHaveLength(3);
  });

  it("POI-TRACE-5 a touching root is an extremum only; a corner is an extremum", () => {
    const p = pois(fx((x) => (x - 2) ** 2));
    expect(kindsAt(p, 2, 0, 1e-7)).toEqual(["extremum"]);
    expect(kindsAt(p, 0, 4)).toEqual(["intercept"]);
    expect(p).toHaveLength(2);
    const abs = pois(fx((x) => Math.abs(x - 1)));
    expect(kindsAt(abs, 1, 0, 1e-7)).toEqual(["extremum"]);
  });

  it("POI-TRACE-7 a constant branch has only its intercept", () => {
    expect(pois(fx(() => 3)).map((q) => [q.x, q.y, q.kinds])).toEqual([[0, 3, ["intercept"]]]);
    expect(pois(fy(() => 2)).map((q) => [q.x, q.y, q.kinds])).toEqual([[2, 0, ["intercept"]]]);
  });

  it("POI-TRACE-5 restrictions give no endpoint dots and no intercept outside the domain", () => {
    const p = pois(fx((x) => (x > 0 && x < 3 ? x * x - 2 : NaN)));
    expect(p).toHaveLength(1);
    expect(kindsAt(p, Math.SQRT2, 0)).toEqual(["zero"]);
  });

  it("POI-TRACE-10 intersections with other branches, mixed kinds and touching ones", () => {
    const p = pois(
      fx((x) => 2 * x + 1),
      [
        { rowId: "2", branch: fx((x) => -x + 7) },
        { rowId: "3", branch: fy(() => -4) },
      ]
    );
    expect(at(p, 2, 5)).toMatchObject({ kinds: ["intersection"], withRowId: "2" });
    expect(at(p, -4, -7)?.withRowId).toBe("3");
    const vertical = pois(
      fy(() => 2),
      [{ rowId: "2", branch: fx((x) => x * x) }]
    );
    expect(kindsAt(vertical, 2, 4)).toEqual(["intersection"]);
    expect(kindsAt(vertical, 2, 0)).toEqual(["intercept"]);
    const tangent = pois(
      fx((x) => x * x),
      [{ rowId: "2", branch: fx(() => 0) }]
    );
    expect(kindsAt(tangent, 0, 0, 1e-7)).toEqual(["intercept", "extremum", "intersection"]);
  });

  it("POI-TRACE-4 coincident records merge into one dot listing every kind", () => {
    const p = pois(fx((x) => x * x - 2));
    expect(kindsAt(p, 0, -2)).toEqual(["intercept", "extremum"]);
    expect(p).toHaveLength(3);
    expect(pois(fx((x) => 2 * x)).map((q) => q.kinds)).toEqual([["zero", "intercept"]]);
  });

  it("POI-TRACE-6 the search covers the view only, with no widening", () => {
    expect(pois(fx((x) => x - 10.5))).toEqual([]);
    expect(pois(fx((x) => x - 9.5)).some((q) => q.kinds.includes("zero"))).toBe(true);
  });

  it("POI-TRACE-9 a branch over 250 own points shows none of them (all or nothing)", () => {
    expect(OWN_CAP).toBe(250);
    expect(records(pois(fx((x) => Math.sin(19.5 * x))))).toBe(250);
    expect(pois(fx((x) => Math.sin(19.7 * x)))).toEqual([]);
    expect(pois(fx((x) => Math.sin(100 * x)))).toEqual([]);
  });

  it("POI-TRACE-11 more than 100 intersections drop every intersection only", () => {
    expect(INTERSECTION_CAP).toBe(100);
    const line = [{ rowId: "2", branch: fx(() => 0.5) }];
    const kept = pois(
      fx((x) => Math.sin(15 * x)),
      line
    );
    expect(kept.filter((q) => q.kinds.includes("intersection"))).toHaveLength(95);
    const dropped = pois(
      fx((x) => Math.sin(16 * x)),
      line
    );
    expect(dropped.some((q) => q.kinds.includes("intersection"))).toBe(false);
    expect(records(dropped)).toBe(204);
    expect(
      records(
        pois(
          fx((x) => Math.sin(4 * x)),
          line
        )
      )
    ).toBe(77);
  });
});

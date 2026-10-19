import { expect, it } from "vitest";
import { NO_DEADLINE } from "../core/deadline";
import { SHIFTED, VIEW_800, viewOf } from "./__fixtures__/measure";
import type { RealFn1 } from "./geometry";
import { plotLines } from "./lines";
import { plotPoints } from "./points";
import { worldToPx } from "./viewport";

const near = (g: Float64Array, want: number[]) =>
  expect(Array.from(g, (p, k) => Math.abs(p - want[k]) * 40 <= 0.5)).toEqual(want.map(() => true));
const v = (f: RealFn1, w = VIEW_800) => plotLines("v", "vertical", f, w, NO_DEADLINE).positions;
const h = (f: RealFn1) => plotLines("h", "horizontal", f, VIEW_800, NO_DEADLINE);
it("G-8 x=c, y=c and one-variable equations give lines within 0.5 px of each root", () => {
  const vertical: [RealFn1, number[]][] = [
    [(x) => x - 3, [3]],
    [(x) => x * x - 4, [-2, 2]],
    [(x) => 2 * x + 3 - 7, [2]],
    [(x) => x - 20, []],
    [Math.tan, [-3, -2, -1, 0, 1, 2, 3].map((k) => k * Math.PI)], // no lines at the poles
  ];
  for (const [f, roots] of vertical) near(v(f), roots);
  near(h((y) => y + 2).positions, [-2]);
  near(h((y) => y * y - 9).positions, [-3, 3]);
  const g = h((y) => y - 5);
  expect([g.kind, g.orientation, g.dashed]).toEqual(["lines", "horizontal", false]);
});
it("G-8 a touching root such as (x-3)^2=0 keeps its line when it falls between samples", () => {
  const touching: [RealFn1, number[]][] = [
    [(x) => (x - 3) ** 2, [3]],
    [(x) => x * x, [0]],
    [(x) => x * x - 6 * x + 9, [3]],
    [(x) => x * x + 1e-6, []], // no real root
  ];
  for (const [f, roots] of touching) near(v(f, SHIFTED), roots); // SHIFTED samples neither 0 nor 3
  near(h((y) => (y - 1 / 3) ** 2).positions, [1 / 3]);
});
it("G-8 a root a hair beside a sample keeps its line and a pole beside a sample draws none", () => {
  for (const eps of [1e-6, -1e-9, 4e-15]) {
    // a sample lands at 3 + eps, closer to the root or pole at 3 than the bisection's final midpoint
    const view = viewOf({ left: -10 + eps, right: 10 + eps, bottom: -7.5, top: 7.5 });
    for (const f of [(x: number) => x - 3, (x: number) => 3 - x]) near(v(f, view), [3]);
    for (const f of [(x: number) => 1 / (x - 3), (x: number) => 1 / (3 - x)]) near(v(f, view), []);
  }
});
it("G-7 a numeric point draws within 0.5 px; a point with an undefined coordinate is not drawn", () => {
  const xy = [2, 3, NaN, 1, 1, Infinity, -4.5, 0.25];
  const pairs = [0, 2, 4, 6].map((k) => xy.slice(k, k + 2));
  const g = plotPoints("p", pairs);
  expect([g.kind, g.evaluations, Array.from(g.coords)]).toEqual(["points", 0, [2, 3, -4.5, 0.25]]);
  const [px, py] = worldToPx(VIEW_800, g.coords[0], g.coords[1]);
  expect(Math.hypot(px - 480, py - 180)).toBeLessThanOrEqual(0.5);
});

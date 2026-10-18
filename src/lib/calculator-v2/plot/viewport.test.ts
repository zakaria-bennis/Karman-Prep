import { expect, it } from "vitest";
import {
  clampViewport,
  defaultViewport,
  isDefaultViewport,
  MAX_ABS_BOUND,
  MAX_SPAN,
  minSpan,
  panViewport,
  pxToWorld,
  resizeViewport,
  worldToPx,
  zoomViewport,
  type Viewport,
} from "./viewport";

const SIZE = { width: 800, height: 600 };
const V = defaultViewport(SIZE);
const box = ([left, right, bottom, top]: number[]) => ({ left, right, bottom, top });
const rel = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);
const span = (v: Viewport) => [v.right - v.left, v.top - v.bottom];
it("G-7 worldToPx maps (2, 3) to (480, 180) in the default 800×600 view and pxToWorld inverts it", () => {
  const view = { viewport: V, size: SIZE, dpr: 2 };
  expect([...worldToPx(view, 2, 3), ...pxToWorld(view, 480, 180)]).toEqual([480, 180, 2, 3]);
});
it("G-5 the default view is x -10..10 with equal units and a resize keeps units per px", () => {
  expect(V).toEqual(box([-10, 10, -7.5, 7.5]));
  expect(defaultViewport({ width: 0, height: 0 })).toEqual(box([-10, 10, -10, 10]));
  expect(resizeViewport(V, SIZE, { width: 400, height: 600 })).toEqual(box([-5, 5, -7.5, 7.5]));
  expect(resizeViewport(V, SIZE, { width: 0, height: 0 })).toEqual(V);
  expect(isDefaultViewport({ ...V, left: -10 + 1e-12 }, SIZE)).toBe(true);
  expect(isDefaultViewport(panViewport(V, 0.001, 0), SIZE)).toBe(false);
});
it("G-23 zoom scales spans about the anchor, stops at 1e-9·max(1, |centre|) and 1e15, within ±1e15", () => {
  expect(zoomViewport(V, 2, { x: 2, y: 3 })).toEqual(box([-4, 6, -2.25, 5.25]));
  expect(zoomViewport(V, 0, { x: 0, y: 0 })).toEqual(V);
  expect(zoomViewport(V, 2, { x: NaN, y: 0 })).toEqual(V);
  expect(minSpan(0.5)).toBe(1e-9);
  expect(rel(minSpan(-1e14), 1e5)).toBeLessThan(1e-12);
  const v = zoomViewport(V, 1e12, { x: 1, y: 1 });
  const [sx, sy] = span(v);
  expect(rel(sy, minSpan((v.top + v.bottom) / 2)) + rel(sx / sy, 20 / 15)).toBeLessThan(1e-6);
  const [ax, ay] = span(zoomViewport(v, 2, { x: 1, y: 1 }));
  expect(rel(ax, sx) + rel(ay, sy)).toBeLessThan(1e-6);
  const bv = zoomViewport(V, 1e20, { x: 1e6, y: 1e6 }); // |centre| > 1: the limit uses the zoomed centre, about 999,933.34
  expect(rel(span(bv)[1], minSpan((bv.top + bv.bottom) / 2))).toBeLessThan(1e-6);
  const [ox, oy] = span(zoomViewport(V, 1e-20, { x: 0, y: 0 }));
  expect(rel(ox, MAX_SPAN) + rel(oy, 7.5e14)).toBeLessThan(1e-9);
  const edge = panViewport(V, 1e16, -1e16);
  expect([edge.right, edge.bottom]).toEqual([MAX_ABS_BOUND, -MAX_ABS_BOUND]);
  expect(rel(span(edge)[0], 1e6)).toBeLessThan(1e-6);
  const far = zoomViewport(edge, 1e-20, { x: edge.right, y: edge.bottom });
  expect(Math.max(...Object.values(far).map(Math.abs))).toBeLessThanOrEqual(MAX_ABS_BOUND);
  expect(panViewport(V, 3, -2)).toEqual(box([-7, 13, -9.5, 5.5]));
  expect(clampViewport(box([1, 1, 0, 1])).right).toBeGreaterThan(1);
});

import { expect, it } from "vitest";
import {
  pxToWorld,
  resizeViewport,
  type PixelSize,
  type Viewport,
  type ViewSpec,
} from "../plot/viewport";
import {
  dragViewport,
  nextViewportForSize,
  pinchState,
  pinchViewport,
  viewportForKey,
  wheelViewport,
  type GraphKeyInput,
  type Point,
} from "./view-input";

const vp = (l: number, r: number, b: number, t: number): Viewport => ({
  left: l,
  right: r,
  bottom: b,
  top: t,
});
const DEFAULT = vp(-10, 10, -7.5, 7.5);
const P = vp(-8, 12, -7.5, 7.5);
const SIZE: PixelSize = { width: 800, height: 600 };
const view = (v: Viewport = DEFAULT, size: PixelSize = SIZE): ViewSpec => ({
  viewport: v,
  size,
  dpr: 1,
});
const key = (k: string, mods: Partial<GraphKeyInput> = {}): GraphKeyInput => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  isComposing: false,
  ...mods,
});

/** "Is vp(…)": all four bounds match to 9 digits. */
function expectVp(actual: Viewport | null, expected: Viewport): void {
  expect(actual).not.toBeNull();
  const a = actual as Viewport;
  expect(a.left).toBeCloseTo(expected.left, 9);
  expect(a.right).toBeCloseTo(expected.right, 9);
  expect(a.bottom).toBeCloseTo(expected.bottom, 9);
  expect(a.top).toBeCloseTo(expected.top, 9);
}

/** The world point under `at` is the same in both views, to 9 digits. */
function expectFixedPoint(before: Viewport, after: Viewport, at: Point): void {
  const [x0, y0] = pxToWorld(view(before), ...at);
  const [x1, y1] = pxToWorld(view(after), ...at);
  expect(x1).toBeCloseTo(x0, 9);
  expect(y1).toBeCloseTo(y0, 9);
}

it("KB-8 arrow keys pan by 10% of the visible range", () => {
  expectVp(viewportForKey(key("ArrowRight"), view()), vp(-8, 12, -7.5, 7.5));
  expectVp(viewportForKey(key("ArrowLeft"), view()), vp(-12, 8, -7.5, 7.5));
  expectVp(viewportForKey(key("ArrowUp"), view()), vp(-10, 10, -6, 9));
  expectVp(viewportForKey(key("ArrowDown"), view()), vp(-10, 10, -9, 6));
});

it("KB-8 + and = zoom in (range × 0.8) and - zooms out (range × 1.25) about the centre", () => {
  expectVp(viewportForKey(key("+"), view()), vp(-8, 8, -6, 6));
  expectVp(viewportForKey(key("="), view()), vp(-8, 8, -6, 6));
  expectVp(viewportForKey(key("-"), view()), vp(-12.5, 12.5, -9.375, 9.375));
  expectVp(viewportForKey(key("+"), view(P)), vp(-6, 10, -6, 6));
});

it("KB-8 Home restores the default view; modified and other keys are not graph keys", () => {
  expectVp(viewportForKey(key("Home"), view(vp(-3, 7, -1, 2))), DEFAULT);
  const mods: Partial<GraphKeyInput>[] = [
    { ctrlKey: true },
    { metaKey: true },
    { altKey: true },
    { isComposing: true },
  ];
  for (const m of mods) expect(viewportForKey(key("=", m), view())).toBeNull();
  for (const k of ["a", "Enter", "Escape", "Tab"]) {
    expect(viewportForKey(key(k), view())).toBeNull();
  }
});

it("G-5 a drag moves the paper with the pointer", () => {
  expectVp(dragViewport(view(), 80, -60), vp(-12, 8, -9, 6));
});

it("GP-48 each wheel event zooms about the pointer by 16/17 in or 17/16 out, whatever its size", () => {
  const at: Point = [600, 150];
  for (const dy of [-4, -100, -300]) {
    const zoomedIn = wheelViewport(view(), dy, at);
    expect(zoomedIn.right - zoomedIn.left).toBeCloseTo((20 * 16) / 17, 9);
    expectFixedPoint(DEFAULT, zoomedIn, at);
  }
  for (const dy of [4, 100, 300]) {
    const zoomedOut = wheelViewport(view(), dy, at);
    expect(zoomedOut.right - zoomedOut.left).toBeCloseTo((20 * 17) / 16, 9);
  }
  expect(wheelViewport(view(), 0, at)).toEqual(DEFAULT);
});

it("G-5 a pinch zooms by the distance ratio about the midpoint and pans with it", () => {
  expectVp(
    pinchViewport(view(), { mid: [400, 300], distance: 100 }, { mid: [400, 300], distance: 200 }),
    vp(-5, 5, -3.75, 3.75)
  );
  expect(
    pinchViewport(view(), { mid: [400, 300], distance: 100 }, { mid: [440, 270], distance: 100 })
  ).toEqual(dragViewport(view(), 40, -30));
  const anchored = pinchViewport(
    view(),
    { mid: [600, 150], distance: 100 },
    { mid: [600, 150], distance: 200 }
  );
  expectFixedPoint(DEFAULT, anchored, [600, 150]);
  expectVp(
    pinchViewport(view(), { mid: [400, 300], distance: 0 }, { mid: [400, 300], distance: 50 }),
    DEFAULT
  );
  expectVp(
    pinchViewport(view(), { mid: [400, 300], distance: 100 }, { mid: [400, 300], distance: NaN }),
    DEFAULT
  );
});

it("G-5 a pinch along an axis near it scales only that axis, as in Desmos", () => {
  const spread = (a: Point, b: Point, c: Point, d: Point) =>
    pinchViewport(view(), pinchState(a, b), pinchState(c, d));
  // horizontal on the x-axis: x only; vertical on the y-axis: y only; 20° off: both
  expectVp(spread([370, 300], [430, 300], [300, 300], [500, 300]), vp(-3, 3, -7.5, 7.5));
  expectVp(spread([400, 270], [400, 330], [400, 200], [400, 400]), vp(-10, 10, -2.25, 2.25));
  const tilt = Math.tan((20 * Math.PI) / 180) * 30;
  const both = spread([370, 300 + tilt], [430, 300 - tilt], [300, 300 + tilt], [500, 300 - tilt]);
  expect(both.right - both.left).toBeLessThan(20);
  expect(both.top - both.bottom).toBeLessThan(15);
  // a horizontal pinch far from the x-axis scales both
  const far = spread([370, 100], [430, 100], [300, 100], [500, 100]);
  expect(far.top - far.bottom).toBeLessThan(15);
});

it("G-5 resizes keep the default view default and keep units per pixel otherwise", () => {
  const narrow: PixelSize = { width: 400, height: 600 };
  expectVp(nextViewportForSize(DEFAULT, SIZE, narrow), vp(-10, 10, -15, 15));
  for (const v of [P, vp(-10, 10, -1, 1)]) {
    expect(nextViewportForSize(v, SIZE, narrow)).toEqual(resizeViewport(v, SIZE, narrow));
  }
  expectVp(nextViewportForSize(DEFAULT, null, { width: 1000, height: 500 }), vp(-10, 10, -5, 5));
  for (const v of [P, vp(-10, 10, -1, 1)]) {
    expect(nextViewportForSize(v, null, SIZE)).toEqual(v);
  }
});

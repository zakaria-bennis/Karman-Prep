import { expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../core/api/types";
import { formatAxisLabel } from "../core/eval/format";
import type { PixelSize, Viewport, ViewSpec } from "../plot/viewport";
import {
  GRID_KEYS,
  pickGrid,
  planGrid,
  type GridPlan,
  type Measure,
  type PxSegment,
} from "./grid-plan";
import type { GridSettings } from "./types";

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
const measure: Measure = (t) => 7 * t.length;
const GRID: GridSettings = pickGrid(DEFAULT_SETTINGS);
const vertical = (s: PxSegment) => s.x0 === s.x1;
const fx = (v: number) => formatAxisLabel(v, 2);
const plan = (grid: Partial<GridSettings> = {}, v: ViewSpec = view()): GridPlan =>
  planGrid(v, { ...GRID, ...grid }, measure);
/** True when `x` is a whole multiple of `n`; px positions come from worldToPx, so 1e-9 slack. */
const multipleOf = (x: number, n: number) => Math.abs(x / n - Math.round(x / n)) < 1e-9;

it("G-5 the default 800×600 view: majors every 2, minors every 0.5, axes through the centre", () => {
  const p = plan();
  const verticalMajors = p.majorLines.filter(vertical).map((s) => s.x0);
  expect(verticalMajors).toEqual(expect.arrayContaining([80, 160, 240, 320, 480, 560, 640, 720]));
  expect(verticalMajors).not.toContain(400);
  const horizontalMajors = p.majorLines.filter((s) => !vertical(s)).map((s) => s.y0);
  const expectedY = [540, 460, 380, 220, 140, 60];
  expect(horizontalMajors).toHaveLength(expectedY.length);
  horizontalMajors.forEach((y, i) => expect(y).toBeCloseTo(expectedY[i], 9));
  const verticalMinors = p.minorLines.filter(vertical).map((s) => s.x0);
  expect(verticalMinors.length).toBeGreaterThan(0);
  // GP-2: minors run at every minor position, under the majors too, but never on an axis.
  for (const x of verticalMinors) expect(multipleOf(x, 20), `${x}`).toBe(true);
  expect(verticalMinors).toEqual(expect.arrayContaining(verticalMajors));
  expect(verticalMinors).not.toContain(400);
  // GP-7: axes stroke a quarter px before the origin.
  expect(p.axes).toEqual([
    { x0: 0, y0: 299.75, x1: 800, y1: 299.75 },
    { x0: 399.75, y0: 0, x1: 399.75, y1: 600 },
  ]);
  expect(p.labels.map((l) => l.text)).toEqual([
    ...[-10, -8, -6, -4, -2, 2, 4, 6, 8, 10].map(fx),
    ...[-6, -4, -2, 2, 4, 6].map(fx),
    "0",
  ]);
  // GP-11: x numbers 15.8 px below the axis with their digits centred (the minus hangs left);
  // GP-12: y numbers end 5 px left of the axis, 3.8 px below their line.
  expect(p.labels[1]).toEqual({ text: fx(-8), x: 76.5, y: 315.8, align: "center" });
  expect(p.labels[10]).toEqual({ text: fx(-6), x: 395, y: 543.8, align: "right" });
  expect(p.labels.at(-1)).toEqual({ text: "0", x: 395, y: 315.8, align: "right" });
  expect(p.arrows).toEqual([]);
});

it("G-5 the grid follows a panned view and labels pin to the edge when an axis leaves it", () => {
  const panned = plan({}, view(P));
  expect(panned.axes).toContainEqual({ x0: 319.75, y0: 0, x1: 319.75, y1: 600 });
  expect(panned.labels.at(-1)).toEqual({ text: "0", x: 315, y: 315.8, align: "right" });

  const away = plan({}, view(vp(2, 22, 3, 18)));
  expect(away.axes).toEqual([]);
  const centred = away.labels.filter((l) => l.align === "center");
  expect(centred.length).toBeGreaterThan(0);
  // GP-15: pinned to the bottom and left edges in the pinned grey.
  for (const l of centred) {
    expect(l.pinned).toBe(true);
    expect(l.y).toBeCloseTo(593.8, 9);
  }
  const left = away.labels.filter((l) => l.align === "left");
  expect(left.length).toBeGreaterThan(0);
  for (const l of left) {
    expect(l.pinned).toBe(true);
    expect(l.x).toBe(3);
  }
});

it("G-5 the grid plan honours every GridSettings field", () => {
  expect(Object.keys(GRID).sort()).toEqual([...GRID_KEYS].sort());

  const noGrid = plan({ showGrid: false });
  expect(noGrid.minorLines).toEqual([]);
  expect(noGrid.majorLines).toEqual([]);
  expect(noGrid.minorEllipses).toEqual([]);
  expect(noGrid.majorEllipses).toEqual([]);

  expect(plan({ minorGridlines: false }).minorLines).toEqual([]);
  expect(plan({ axisNumbers: false }).labels).toEqual([]);

  const noX = plan({ xAxis: { show: false, label: "t", step: null } });
  expect(noX.axes).toEqual([{ x0: 399.75, y0: 0, x1: 399.75, y1: 600 }]);
  expect(noX.labels.map((l) => l.text)).toEqual([-6, -4, -2, 2, 4, 6].map(fx));

  // GP-8: tips 1.5 px inside the edge; the axes start 3 px from it.
  const arrowed = plan({ arrows: true });
  expect(arrowed.arrows).toEqual([
    { x: 798.5, y: 299.75, direction: "right" },
    { x: 399.75, y: 1.5, direction: "up" },
  ]);
  expect(arrowed.axes).toEqual([
    { x0: 0, y0: 299.75, x1: 797, y1: 299.75 },
    { x0: 399.75, y0: 3, x1: 399.75, y1: 600 },
  ]);

  // GP-5: with the grid hidden, ticks cross the axes at each nonzero major.
  expect(noGrid.ticks).toHaveLength(10 + 6); // the edge majors ±10 included
  expect(noGrid.ticks[0]).toEqual({ x0: -0.25, y0: 297, x1: -0.25, y1: 302.5 });
  expect(plan().ticks).toEqual([]);

  const polar = plan({ polarGrid: true });
  expect(polar.polar).toBe(true);
  expect(polar.majorEllipses.map((e) => e.rx)).toEqual([80, 160, 240, 320, 400, 480]);
  for (const e of polar.majorEllipses) {
    expect(e.cx).toBe(400);
    expect(e.cy).toBe(300);
    expect(e.ry).toBe(e.rx);
  }
  for (const spokes of [polar.majorLines, polar.minorLines]) {
    expect(spokes).toHaveLength(12);
    for (const s of spokes) {
      expect(s.x0).toBe(400);
      expect(s.y0).toBe(300);
    }
  }
  expect(plan().polar).toBe(false);

  const stepped = plan({ xAxis: { show: true, label: "t", step: 5 } });
  expect(stepped.majorLines.filter(vertical).map((s) => s.x0)).toEqual([0, 200, 600, 800]);
  expect(stepped.labels).toContainEqual(
    expect.objectContaining({ text: "t", align: "right", font: "letter" })
  );

  const fine = plan({ xAxis: { show: true, label: "", step: 0.001 } });
  expect(fine.majorLines.filter(vertical).length).toBeLessThanOrEqual(100);
});

it("GP-16 an axis whose largest visible |bound| reaches 5e6 shows m×10 with a raised exponent", () => {
  const wide = plan({}, view(vp(-1e7, 1e7, -7.5e6, 7.5e6)));
  const x = wide.labels.filter((l) => l.align === "center");
  expect(x.length).toBeGreaterThan(0);
  for (const l of x) {
    expect(l.text).toMatch(/×10$/);
    expect(l.exponent).toMatch(/^[67]$/);
    expect(l.y).toBeCloseTo(300 + 15.8 + 4.8, 9);
  }
  const plain = plan({}, view(vp(-4.9e6, 4.9e6, -3e6, 3e6)));
  expect(plain.labels.every((l) => l.exponent === undefined)).toBe(true);
});

it("GP-14 a number that would cross the canvas edge slides 3 px inside it", () => {
  const p = plan({}, view(vp(-10.1, 10.1, -7.5, 7.5)));
  const ends = p.labels.filter((l) => l.align === "center" && Math.abs(Number(l.text)) === 10);
  expect(ends.map((l) => l.x)).toEqual([3 + (7 * 3) / 2, 800 - 3 - 7]);
});

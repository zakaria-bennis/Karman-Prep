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
  for (const x of verticalMinors) {
    expect(multipleOf(x, 20), `${x}`).toBe(true);
    expect(multipleOf(x, 80), `${x}`).toBe(false);
  }
  expect(p.axes).toEqual([
    { x0: 0, y0: 300, x1: 800, y1: 300 },
    { x0: 400, y0: 0, x1: 400, y1: 600 },
  ]);
  expect(p.labels.map((l) => l.text)).toEqual([
    ...[-8, -6, -4, -2, 2, 4, 6, 8].map(fx),
    ...[-6, -4, -2, 2, 4, 6].map(fx),
    "0",
  ]);
  expect(p.labels[0]).toEqual({ text: fx(-8), x: 80, y: 304, align: "center", baseline: "top" });
  expect(p.labels[8]).toEqual({ text: fx(-6), x: 396, y: 540, align: "right", baseline: "middle" });
  expect(p.arrows).toEqual([]);
});

it("G-5 the grid follows a panned view and labels pin to the edge when an axis leaves it", () => {
  const panned = plan({}, view(P));
  expect(panned.axes).toContainEqual({ x0: 320, y0: 0, x1: 320, y1: 600 });
  expect(panned.labels.at(-1)).toEqual({
    text: "0",
    x: 316,
    y: 304,
    align: "right",
    baseline: "top",
  });

  const away = plan({}, view(vp(2, 22, 3, 18)));
  expect(away.axes).toEqual([]);
  const centred = away.labels.filter((l) => l.align === "center");
  expect(centred.length).toBeGreaterThan(0);
  for (const l of centred) {
    expect(l.baseline).toBe("bottom");
    expect(l.y).toBe(596);
  }
  const middle = away.labels.filter((l) => l.baseline === "middle");
  expect(middle.length).toBeGreaterThan(0);
  for (const l of middle) {
    expect(l.align).toBe("left");
    expect(l.x).toBe(4);
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
  expect(noX.axes).toEqual([{ x0: 400, y0: 0, x1: 400, y1: 600 }]);
  expect(noX.labels.map((l) => l.text)).toEqual([-6, -4, -2, 2, 4, 6].map(fx));

  expect(plan({ arrows: true }).arrows).toEqual([
    { x: 800, y: 300, direction: "right" },
    { x: 400, y: 0, direction: "up" },
  ]);

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
    expect.objectContaining({ text: "t", align: "right", baseline: "bottom" })
  );

  const fine = plan({ xAxis: { show: true, label: "", step: 0.001 } });
  expect(fine.majorLines.filter(vertical).length).toBeLessThanOrEqual(100);
});

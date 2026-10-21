import { expect, it } from "vitest";
import { formatPoiLabel, fractionLabel } from "@/lib/calculator/poi/format";
import type { ViewSpec } from "@/lib/calculator/plot/viewport";
import { labelBoxSize, placeLabels, type Box } from "./label-placement";

const SIZE = { width: 800, height: 600 };
const VIEW: ViewSpec = {
  viewport: { left: -10, right: 10, bottom: -7.5, top: 7.5 },
  size: SIZE,
  dpr: 1,
};
const EXPORT_ONLY = { export: true, fraction: false };
const box = (x: number, y: number) => labelBoxSize(formatPoiLabel({ x, y }, VIEW), EXPORT_ONLY);

it("GP-37 a label box fits its math and the export button; a fraction makes it taller", () => {
  const two = box(2, 0);
  expect(two.width).toBeGreaterThan(80);
  expect(two.width).toBeLessThan(95);
  expect(two.height).toBeCloseTo(42.27, 2);
  expect(box(Math.PI / 2, 1).height).toBeGreaterThan(55);
  expect(
    labelBoxSize(formatPoiLabel({ x: 2, y: 0 }, VIEW), { export: false, fraction: false }).width
  ).toBeCloseTo(two.width - 21.6, 6);
});

it("the decimal/fraction toggle widens the box; fractions shown make it taller", () => {
  const p = { x: 0.5, y: -1 / 3 };
  const decimal = formatPoiLabel(p, VIEW);
  const off = labelBoxSize(decimal, EXPORT_ONLY);
  const withToggle = labelBoxSize(decimal, { export: true, fraction: true });
  expect(withToggle.width).toBeCloseTo(off.width + 28, 6);
  expect(withToggle.height).toBeCloseTo(42.27, 2);
  const on = labelBoxSize(fractionLabel(decimal, p), { export: true, fraction: true });
  expect(on.height).toBeGreaterThan(55);
  expect(on.width).toBeLessThan(withToggle.width); // 1/2 is narrower than 0.5, −1/3 than −0.33333
});

it("GP-38 on clear paper a label sits right of its dot, 10 px off, vertically centred", () => {
  const size = box(2, 4);
  const [p] = placeLabels([{ x: 400, y: 300, ...size }], SIZE);
  expect(p).toEqual({ left: 410, top: 300 - size.height / 2, orientation: "right" });
});

it("GP-38 the spots: diagonals touch the dot 5 px off on each axis, above and below 7 px", () => {
  const size = { width: 100, height: 40 };
  // Ink everywhere but the one spot each case leaves clear.
  const only =
    (clear: Box): ((b: Box) => number) =>
    (b) =>
      b.left === clear.left && b.top === clear.top ? 0 : 1000;
  const cases: [string, Box][] = [
    ["tr", { left: 405, top: 255, right: 505, bottom: 295 }],
    ["bl", { left: 295, top: 305, right: 395, bottom: 345 }],
    ["above", { left: 350, top: 253, right: 450, bottom: 293 }],
    ["below", { left: 350, top: 307, right: 450, bottom: 347 }],
    ["left", { left: 290, top: 280, right: 390, bottom: 320 }],
  ];
  for (const [orientation, clear] of cases) {
    const [p] = placeLabels([{ x: 400, y: 300, ...size }], SIZE, only(clear));
    expect(p).toEqual({ left: clear.left, top: clear.top, orientation });
  }
});

it("GP-38 labels avoid each other and the graph's edges; a label keeps its last side", () => {
  const a = { x: 400, y: 300, ...box(0, 0) },
    b = { x: 404, y: 300, ...box(0.1, 0) };
  const [pa, pb] = placeLabels([a, b], SIZE);
  const overlap =
    pa.left < pb.left + b.width &&
    pb.left < pa.left + a.width &&
    pa.top < pb.top + b.height &&
    pb.top < pa.top + a.height;
  expect(overlap).toBe(false);
  const [corner] = placeLabels([{ x: 795, y: 4, ...box(10, 7.5) }], SIZE);
  expect(corner.orientation).toBe("bl");
  // A label already showing keeps its spot; when the layout is redone (tracing) a little ink on
  // the right (under 20) still does not move it, more does.
  const ink = (q: Box) => (q.left >= 400 ? 15 : 0);
  const shown = { x: 400, y: 300, prior: "right" as const, ...box(1, 1) };
  expect(placeLabels([{ x: 400, y: 300, ...box(1, 1) }], SIZE, ink)[0].orientation).toBe("left");
  expect(placeLabels([shown], SIZE, ink, true)[0].orientation).toBe("right");
  expect(placeLabels([shown], SIZE, (q) => (q.left >= 400 ? 25 : 0), true)[0].orientation).toBe(
    "left"
  );
  expect(placeLabels([shown], SIZE, () => 0, false)[0].orientation).toBe("right");
  expect(placeLabels([shown], SIZE, (q) => (q.left >= 400 ? 999 : 0))[0].orientation).toBe("right");
});

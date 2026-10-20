import { expect, it } from "vitest";
import { formatPoiLabel } from "@/lib/calculator/poi/format";
import type { ViewSpec } from "@/lib/calculator/plot/viewport";
import { LABEL_OFFSET_PX, labelBoxSize, placeLabels } from "./label-placement";

const SIZE = { width: 800, height: 600 };
const VIEW: ViewSpec = {
  viewport: { left: -10, right: 10, bottom: -7.5, top: 7.5 },
  size: SIZE,
  dpr: 1,
};
const box = (x: number, y: number) => labelBoxSize(formatPoiLabel({ x, y }, VIEW), true);

it("GP-37 a label box fits its math and the export button; a fraction makes it taller", () => {
  const two = box(2, 0);
  expect(two.width).toBeGreaterThan(80);
  expect(two.width).toBeLessThan(95);
  expect(two.height).toBeCloseTo(42.27, 2);
  expect(box(Math.PI / 2, 1).height).toBeGreaterThan(55);
  expect(labelBoxSize(formatPoiLabel({ x: 2, y: 0 }, VIEW), false).width).toBeCloseTo(
    two.width - 25.6,
    6
  );
});

it("GP-38 a label sits diagonally off its dot, on the side away from the curve", () => {
  const size = box(2, 4);
  const rising = Array.from({ length: 40 }, (_, k) => [400 + k * 2, 300 - k * 2] as const);
  const [placed] = placeLabels([{ x: 400, y: 300, ...size }], rising, SIZE);
  expect(placed.quadrant).not.toBe("ne");
  const { left, top } = placed;
  const dx = placed.quadrant.endsWith("e") ? left - 400 : 400 - (left + size.width);
  const dy = placed.quadrant.startsWith("n") ? 300 - (top + size.height) : top - 300;
  expect([dx, dy]).toEqual([LABEL_OFFSET_PX, LABEL_OFFSET_PX]);
  const [free] = placeLabels([{ x: 400, y: 300, ...size }], [], SIZE);
  expect(free.quadrant).toBe("ne");
});

it("GP-38 labels avoid overlapping each other and stay inside the graph", () => {
  const a = { x: 400, y: 300, ...box(0, 0) },
    b = { x: 404, y: 300, ...box(0.1, 0) };
  const [pa, pb] = placeLabels([a, b], [], SIZE);
  const overlap =
    pa.left < pb.left + b.width &&
    pb.left < pa.left + a.width &&
    pa.top < pb.top + b.height &&
    pb.top < pa.top + a.height;
  expect(overlap).toBe(false);
  const [corner] = placeLabels([{ x: 795, y: 4, ...box(10, 7.5) }], [], SIZE);
  expect(corner.quadrant).toBe("sw");
});

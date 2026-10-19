import { expect, it } from "vitest";
import { LABEL_OFFSET_PX, labelBoxSize, placeLabels } from "./label-placement";

const SIZE = { width: 800, height: 600 };

it("POI-19 a label sits diagonally off its dot, on the side away from the curve", () => {
  const box = labelBoxSize("(2, 4)");
  // A curve rising to the upper right of the dot at (400, 300): the label goes elsewhere.
  const rising = Array.from({ length: 40 }, (_, k) => [400 + k * 2, 300 - k * 2] as const);
  const [placed] = placeLabels([{ x: 400, y: 300, text: "(2, 4)" }], rising, SIZE);
  expect(placed.quadrant).not.toBe("ne");
  const { left, top } = placed;
  const dx = placed.quadrant.endsWith("e") ? left - 400 : 400 - (left + box.width);
  const dy = placed.quadrant.startsWith("n") ? 300 - (top + box.height) : top - 300;
  expect([dx, dy]).toEqual([LABEL_OFFSET_PX, LABEL_OFFSET_PX]);
  const [free] = placeLabels([{ x: 400, y: 300, text: "(2, 4)" }], [], SIZE);
  expect(free.quadrant).toBe("ne");
});

it("POI-19 labels avoid overlapping each other and stay inside the graph", () => {
  const placed = placeLabels(
    [
      { x: 400, y: 300, text: "(0, 0)" },
      { x: 404, y: 300, text: "(0.1, 0)" },
    ],
    [],
    SIZE
  );
  const [a, b] = placed.map((p, i) => ({ ...p, ...labelBoxSize(i === 0 ? "(0, 0)" : "(0.1, 0)") }));
  const overlap =
    a.left < b.left + b.width &&
    b.left < a.left + a.width &&
    a.top < b.top + b.height &&
    b.top < a.top + a.height;
  expect(overlap).toBe(false);
  const [corner] = placeLabels([{ x: 795, y: 4, text: "(10, 7.5)" }], [], SIZE);
  expect(corner.quadrant).toBe("sw");
});

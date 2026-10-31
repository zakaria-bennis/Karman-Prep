import { describe, expect, it } from "vitest";
import {
  boxForWidth,
  buildScene,
  defaultBox,
  fitBox,
  MIN_FIGURE_SCALE,
} from "@/lib/figures/engine/index";
import { HOUSE } from "@/lib/figures/engine/house";
import { FIGURE_SPEC_VERSION, type FigureSpec } from "@/lib/figures/engine/spec";

const plane: FigureSpec = {
  version: FIGURE_SPEC_VERSION,
  type: "plane",
  parts: [],
  labels: [],
  marks: [],
  frame: { x: [-6, 6], y: [-6, 6], step: 1 },
};
const triangle: FigureSpec = {
  version: FIGURE_SPEC_VERSION,
  type: "geometry2d",
  parts: [
    { kind: "point", id: "A", x: 0, y: 0 },
    { kind: "point", id: "B", x: 4, y: 0 },
    { kind: "point", id: "C", x: 0, y: 3 },
    { kind: "polygon", id: "ABC", points: ["A", "B", "C"] },
  ],
  labels: [],
  marks: [],
};

/** The on-screen size of the house font when `box` is drawn `width` px wide. */
const fontPx = (box: { width: number }, width: number) =>
  HOUSE.font * Math.min(1, width / box.width);

// Found in the Task 12 golden review: a 640px plane in a 340px column showed 8px text.
describe("boxForWidth", () => {
  it("keeps the default box until the figure would show under 12px text", () => {
    expect(boxForWidth(plane)).toEqual(defaultBox(plane));
    expect(boxForWidth(plane, 900)).toEqual(defaultBox(plane));
    expect(boxForWidth(plane, 640 * MIN_FIGURE_SCALE)).toEqual(defaultBox(plane));
  });

  it("lays a plane out at a phone or tablet column's own width, so text stays 15px", () => {
    for (const width of [332, 340, 506]) {
      const box = boxForWidth(plane, width);
      expect(box.width).toBe(width);
      expect(fontPx(box, width)).toBe(HOUSE.font);
      // The default aspect is kept: a plane's units stay square.
      expect(box.height).toBe(Math.round((480 * width) / 640));
      const scene = buildScene(plane, box);
      expect(scene.width).toBe(width);
      expect(scene.issues).toEqual([]);
    }
  });

  it("every figure's text is at least 12px in any column from 300 to 1000px", () => {
    for (const spec of [plane, triangle]) {
      for (let width = 300; width <= 1000; width += 7) {
        const box = boxForWidth(spec, width);
        expect(fontPx(box, width), `${spec.type} at ${width}`).toBeGreaterThanOrEqual(
          HOUSE.minFontOnScreen
        );
      }
    }
  });

  // ChartFigure's boxes (600×400, 500×500 for a square plot) go through the same fit.
  it("fitBox keeps any box's text at least 12px from 300 to 1000px", () => {
    for (const box of [
      { width: 600, height: 400 },
      { width: 500, height: 500 },
    ]) {
      expect(fitBox(box)).toEqual(box);
      for (let width = 300; width <= 1000; width += 7) {
        const fitted = fitBox(box, width);
        expect(fontPx(fitted, width), `${box.width} at ${width}`).toBeGreaterThanOrEqual(
          HOUSE.minFontOnScreen
        );
        expect(fitted.height / fitted.width).toBeCloseTo(box.height / box.width, 2);
      }
    }
  });
});

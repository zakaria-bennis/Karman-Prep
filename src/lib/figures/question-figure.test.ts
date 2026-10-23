import { describe, expect, it } from "vitest";
import { drawnFigure } from "./question-figure";

const none = {
  figure_kind: null,
  figure_table_data: null,
  figure_chart_data: null,
  figure_geometry_data: null,
  image_url: null,
  figure_svg: null,
} as const;

describe("drawnFigure", () => {
  it("draws nothing for a figure kind with nothing to draw", () => {
    for (const figure_kind of ["image", "table", "chart", "geometric"] as const)
      expect(drawnFigure({ ...none, figure_kind })).toBeNull();
    expect(drawnFigure(none)).toBeNull();
  });

  it("draws a real image or SVG", () => {
    expect(drawnFigure({ ...none, figure_kind: "image", image_url: "/f.png" })).toBe("image");
    expect(drawnFigure({ ...none, figure_kind: "image", figure_svg: "<svg/>" })).toBe("image");
  });

  it("draws native tables and charts only with their data", () => {
    const table = { rows: [["1", "2"]] };
    expect(drawnFigure({ ...none, figure_kind: "table", figure_table_data: table })).toBe("table");
    expect(drawnFigure({ ...none, figure_kind: "chart", figure_table_data: table })).toBeNull();
  });
});

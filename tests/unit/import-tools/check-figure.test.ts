// @vitest-environment node
import { describe, expect, it } from "vitest";
import { figureRenderErrors } from "../../../scripts/import-tools/ts/check-figure";

const tri = (sx: number) => ({
  figure_kind: "geometric",
  figure_geometry_data: {
    layout_version: "balanced-v1",
    kind: "geometric",
    shapes: [
      {
        kind: "triangle",
        label: "RST",
        vertices_or_points: [
          { label: "R", x: 255, y: 170 },
          { label: "S", x: sx, y: 80 },
          { label: "T", x: 425, y: 170 },
        ],
      },
    ],
    angle_markings: [{ at_vertex: "T", between_vertices: ["R", "S"], right_angle: true }],
    length_markings: [],
  },
});

describe("figureRenderErrors", () => {
  it("accepts a figure the renderer can draw", () => {
    expect(figureRenderErrors(tri(425))).toEqual([]);
  });
  it("rejects a right-angle mark that is not exactly perpendicular", () => {
    expect(figureRenderErrors(tri(430)).join()).toMatch(/unresolved_angle_mark/);
  });
  it("rejects SVG that fails the figure check", () => {
    const errs = figureRenderErrors({
      figure_kind: "image",
      figure_svg: "<svg><script>alert(1)</script></svg>",
      image_alt: "x",
    });
    expect(errs.length).toBeGreaterThan(0);
  });
  it("rejects bad table data and bad choice tables", () => {
    expect(
      figureRenderErrors({ figure_kind: "table", figure_table_data: { rows: "nope" } }).length
    ).toBeGreaterThan(0);
    expect(
      figureRenderErrors({ answer_choices: [{ letter: "A", choice_table_data: { rows: 1 } }] })
    ).toHaveLength(1);
  });
  it("rejects a chart the renderer cannot draw", () => {
    expect(
      figureRenderErrors({ figure_kind: "chart", figure_chart_data: { kind: "bar_chart" } }).length
    ).toBeGreaterThan(0);
  });
});

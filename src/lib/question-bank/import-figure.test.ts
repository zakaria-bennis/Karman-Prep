import { describe, expect, it } from "vitest";
import { computeContentHashV2, validateImportRow } from "./import-core";
import { figureImportErrors, figureInsertColumns } from "./import-figure";
import { validRow } from "./import-core-test-helpers";
import type { ChartFigure } from "@/types/chart";
import type { GeometryFigureData } from "@/lib/figures/geometry-svg";

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" data-figure-theme="karman-v1" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" fill="none" stroke="#f3ecdd"/></svg>';
const CHART = {
  kind: "scatterplot",
  title: null,
  show_grid: true,
  x_axis: { label: "Made-up x", min: 0, max: 10, tick_step: 2, categories: null },
  y_axis: { label: "Made-up y", min: 0, max: 10, tick_step: 2, categories: null },
  series: [
    {
      kind: "scatter",
      label: null,
      points: [
        [1, 2],
        [3, 4],
      ],
    },
  ],
  confidence: 1,
  extracted_by: "reviewer",
  extracted_at: "2026-10-21",
  extractor_note: null,
} as unknown as ChartFigure;
const GEOMETRY: GeometryFigureData = {
  layout_version: "balanced-v1",
  kind: "triangle",
  shapes: [
    {
      kind: "triangle",
      label: null,
      vertices_or_points: [
        { id: "A", label: "A", x: 0, y: 0 },
        { id: "B", label: "B", x: 4, y: 0 },
        { id: "C", label: "C", x: 0, y: 3 },
      ],
    },
  ],
};

describe("figure fields on import", () => {
  it("accepts each figure kind the quiz renders with its own column", () => {
    expect(figureImportErrors({ figure_kind: "chart", figure_chart_data: CHART })).toEqual([]);
    expect(
      figureImportErrors({ figure_kind: "geometric", figure_geometry_data: GEOMETRY })
    ).toEqual([]);
    expect(
      figureImportErrors({ figure_kind: "image", figure_svg: SVG, image_alt: "A square." })
    ).toEqual([]);
    expect(figureImportErrors({ figure_kind: "image", image_url: "https://x.test/a.png" })).toEqual(
      []
    );
    expect(figureImportErrors({})).toEqual([]);
  });

  it("refuses data without its kind, a kind without its data and mixed figures", () => {
    const errors = (row: Parameters<typeof figureImportErrors>[0]) =>
      figureImportErrors(row).join(" | ");
    expect(errors({ figure_chart_data: CHART })).toMatch(/requires figure_kind=chart/);
    expect(errors({ figure_kind: "chart" })).toMatch(/chart figure requires figure_chart_data/);
    expect(
      errors({ figure_kind: "geometric", figure_geometry_data: GEOMETRY, figure_svg: SVG })
    ).toMatch(/figure_svg requires figure_kind=image/);
    expect(errors({ figure_kind: "image", figure_svg: SVG })).toMatch(/requires image_alt/);
    expect(errors({ figure_kind: "image" })).toMatch(/figure_svg or image_url/);
    expect(
      errors({
        figure_kind: "image",
        figure_svg: SVG,
        image_alt: "x",
        image_url: "https://x.test/a.svg",
      })
    ).toMatch(/cannot both/);
    expect(errors({ figure_kind: "graph" as never })).toMatch(/figure_kind/);
  });

  it("validates chart and geometry structure with Zod and refuses unrenderable geometry", () => {
    const bad = { ...CHART, series: [{ kind: "scatter", label: null, points: [["1", 2]] }] };
    expect(
      figureImportErrors({ figure_kind: "chart", figure_chart_data: bad as never })[0]
    ).toMatch(/figure_chart_data\.series/);
    const old = { ...GEOMETRY, layout_version: undefined };
    expect(figureImportErrors({ figure_kind: "geometric", figure_geometry_data: old })[0]).toMatch(
      /layout_version/
    );
    const flat: GeometryFigureData = {
      ...GEOMETRY,
      shapes: [{ vertices_or_points: [{ x: 1, y: 1 }] }],
    };
    expect(figureImportErrors({ figure_kind: "geometric", figure_geometry_data: flat })[0]).toMatch(
      /does not render/
    );
  });

  it("refuses an unsafe SVG through validateImportRow", () => {
    const row = validRow({
      figure_kind: "image",
      figure_svg: SVG.replace("<rect", "<script>x</script><rect"),
      image_alt: "A square.",
    });
    expect(validateImportRow(row).errors.join(" ")).toMatch(/figure_svg.*<script>/);
  });

  it("keeps legacy content hashes and separates questions by their figure", () => {
    const base = {
      subject: "math",
      domain: "algebra",
      answer_format: "multiple_choice",
      question_text: "Which made-up point is highest?",
    };
    const plain = computeContentHashV2(base);
    expect(computeContentHashV2({ ...base, figure_chart_data: null, figure_svg: null })).toBe(
      plain
    );
    const chart = computeContentHashV2({ ...base, figure_chart_data: CHART });
    const svg = computeContentHashV2({ ...base, figure_svg: SVG });
    expect(new Set([plain, chart, svg]).size).toBe(3);
    expect(computeContentHashV2({ ...base, figure_svg: SVG.replace("8", "7") })).not.toBe(svg);
  });

  it("writes exactly the figure columns", () => {
    expect(figureInsertColumns({ figure_kind: "image", figure_svg: SVG })).toEqual({
      figure_kind: "image",
      figure_table_data: null,
      figure_chart_data: null,
      figure_geometry_data: null,
      figure_svg: SVG,
    });
  });
});

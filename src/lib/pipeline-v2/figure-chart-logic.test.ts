// @vitest-environment node
//
// Unit tests for the Phase 9B chart-extraction logic
// (scripts/lib/figure-chart-logic.mjs). The Stage 6.5 runner + the legacy
// Phase 4d backfill both depend on these invariants:
//
//   1. validateChartData accepts the four ChartFigure kinds and rejects
//      the shape errors that would break ChartFigure.tsx (bad kind,
//      missing axes, empty series, malformed per-kind series).
//   2. Provenance (extracted_by / extracted_at) is stamped by the caller,
//      not the validator (so the validator stays pure).
//   3. figure_quality alt-text + complexity derive deterministically.

import { describe, it, expect } from "vitest";
import {
  CHART_KINDS,
  CHART_AUTO_PUBLISH_THRESHOLD,
  GRAPH_AUTO_PUBLISH_THRESHOLD,
  CHART_EXTRACT_PROMPT,
  normalizeAxis,
  validateChartData,
  stampChartProvenance,
  deriveChartComplexity,
  chartAltText,
} from "../../../scripts/lib/figure-chart-logic.mjs";

const scatter = {
  is_chart: true,
  kind: "scatterplot",
  title: "Scores over time",
  x_axis: { label: "Time", min: 0, max: 10, tick_step: 2 },
  y_axis: { label: "Score", min: 0, max: 100, tick_step: 20 },
  show_grid: true,
  series: [
    {
      kind: "scatter",
      label: null,
      points: [
        [1, 50],
        [2, 60],
      ],
    },
  ],
  confidence: 0.95,
  extractor_note: null,
};

describe("validateChartData — accepts valid charts", () => {
  it("accepts a scatterplot and normalizes the core", () => {
    const r = validateChartData(scatter);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.data?.kind).toBe("scatterplot");
    expect(r.confidence).toBe(0.95);
    // provenance is NOT stamped by the validator
    expect(r.data).not.toHaveProperty("extracted_by");
  });

  it("accepts a bar_chart with categories", () => {
    const r = validateChartData({
      is_chart: true,
      kind: "bar_chart",
      x_axis: { label: "Group", categories: ["A", "B"] },
      y_axis: { label: "Count", min: 0, max: 10 },
      show_grid: false,
      series: [
        {
          kind: "bar",
          bars: [
            { category: "A", value: 5 },
            { category: "B", value: 7 },
          ],
        },
      ],
      confidence: 0.9,
    });
    expect(r.ok).toBe(true);
    expect(r.data?.show_grid).toBe(false);
  });

  it("accepts a function_plot with a supported expression family", () => {
    const r = validateChartData({
      is_chart: true,
      kind: "function_plot",
      x_axis: { label: "x", min: -5, max: 5 },
      y_axis: { label: "y", min: -5, max: 5 },
      show_grid: true,
      series: [{ kind: "function", expression: { kind: "linear", m: 2, b: 1 }, domain: null }],
      confidence: 0.88,
    });
    expect(r.ok).toBe(true);
  });

  it("accepts a boxplot with a five-number-summary box", () => {
    const r = validateChartData({
      is_chart: true,
      kind: "boxplot",
      x_axis: { label: "Score", min: 0, max: 100, tick_step: 20 },
      y_axis: { label: "", min: null, max: null, tick_step: null },
      show_grid: true,
      series: [
        {
          kind: "boxplot",
          label: null,
          boxes: [{ category: null, min: 10, q1: 30, median: 50, q3: 70, max: 90 }],
        },
      ],
      confidence: 0.9,
    });
    expect(r.ok).toBe(true);
    expect(r.data?.kind).toBe("boxplot");
  });

  it("accepts a pie chart with slices", () => {
    const r = validateChartData({
      is_chart: true,
      kind: "pie",
      x_axis: { label: "", min: null, max: null, tick_step: null, categories: null },
      y_axis: { label: "", min: null, max: null, tick_step: null, categories: null },
      show_grid: false,
      series: [
        {
          kind: "pie",
          label: null,
          slices: [
            { label: "A", value: 60 },
            { label: "B", value: 40 },
          ],
        },
      ],
      confidence: 0.92,
    });
    expect(r.ok).toBe(true);
    expect(r.data?.kind).toBe("pie");
  });

  it("clamps an out-of-range confidence", () => {
    const r = validateChartData({ ...scatter, confidence: 1.5 });
    expect(r.ok).toBe(true);
    expect(r.confidence).toBe(1);
  });
});

describe("validateChartData — rejects broken charts", () => {
  it("rejects a non-chart", () => {
    const r = validateChartData({ is_chart: false });
    expect(r.ok).toBe(false);
    expect(r.errors).toContain("not_a_chart");
  });

  it("rejects an unknown kind", () => {
    const r = validateChartData({ ...scatter, kind: "donut" });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.startsWith("invalid_kind"))).toBe(true);
  });

  it("rejects missing axes and empty series", () => {
    const noAxes = validateChartData({
      is_chart: true,
      kind: "scatterplot",
      series: scatter.series,
      confidence: 0.9,
    });
    expect(noAxes.errors).toContain("missing_axes");
    const noSeries = validateChartData({ ...scatter, series: [] });
    expect(noSeries.errors).toContain("no_series");
  });

  it("rejects malformed per-kind series", () => {
    const badBar = validateChartData({
      is_chart: true,
      kind: "bar_chart",
      x_axis: { categories: ["A"] },
      y_axis: { min: 0, max: 10 },
      series: [{ kind: "bar" }], // no bars[]
      confidence: 0.9,
    });
    expect(badBar.errors).toContain("bar_series_missing_bars");

    const badFn = validateChartData({
      is_chart: true,
      kind: "function_plot",
      x_axis: { min: 0, max: 1 },
      y_axis: { min: 0, max: 1 },
      series: [{ kind: "function", expression: { kind: "cubic" } }],
      confidence: 0.9,
    });
    expect(badFn.errors).toContain("function_series_bad_expression");

    const badBox = validateChartData({
      is_chart: true,
      kind: "boxplot",
      x_axis: { min: 0, max: 100 },
      y_axis: { label: "" },
      series: [{ kind: "boxplot", boxes: [] }], // no boxes
      confidence: 0.9,
    });
    expect(badBox.errors).toContain("boxplot_series_missing_boxes");

    const badPie = validateChartData({
      is_chart: true,
      kind: "pie",
      x_axis: { label: "" },
      y_axis: { label: "" },
      series: [{ kind: "pie" }], // no slices
      confidence: 0.9,
    });
    expect(badPie.errors).toContain("pie_series_missing_slices");
  });
});

describe("normalizeAxis", () => {
  it("fills defaults for a sparse axis", () => {
    expect(normalizeAxis({})).toEqual({
      label: "",
      min: null,
      max: null,
      tick_step: null,
      categories: null,
    });
  });
  it("preserves provided values", () => {
    expect(normalizeAxis({ label: "X", min: 0, max: 5, categories: ["A"] })).toMatchObject({
      label: "X",
      min: 0,
      max: 5,
      categories: ["A"],
    });
  });
});

describe("stampChartProvenance", () => {
  it("adds extracted_by + extracted_at without mutating the input", () => {
    const core = validateChartData(scatter).data!;
    const stamped = stampChartProvenance(core, {
      extractedBy: "gemini-2.5-pro@2026-05-31",
      extractedAt: "2026-05-31T00:00:00.000Z",
    });
    expect(stamped.extracted_by).toBe("gemini-2.5-pro@2026-05-31");
    expect(stamped.extracted_at).toBe("2026-05-31T00:00:00.000Z");
    expect(core).not.toHaveProperty("extracted_by");
  });
});

describe("deriveChartComplexity + chartAltText", () => {
  it("buckets complexity by element count", () => {
    expect(deriveChartComplexity(scatter)).toBe("simple"); // 1 series + 2 points
    const dense = {
      series: [{ kind: "scatter", points: Array.from({ length: 25 }, (_, i) => [i, i]) }],
    };
    expect(deriveChartComplexity(dense)).toBe("dense");
  });

  it("summarizes the chart for screen readers", () => {
    const alt = chartAltText(scatter);
    expect(alt).toContain("Scores over time");
    expect(alt).toContain("scatterplot");
    expect(alt).toContain("Time");
    expect(alt).toContain("Score");
    expect(alt).toContain("2 data points");
  });
});

describe("constants + prompt", () => {
  it("exposes the renderer-supported kinds + the publish thresholds", () => {
    expect(CHART_KINDS).toEqual([
      "scatterplot",
      "line_graph",
      "bar_chart",
      "function_plot",
      "boxplot",
      "pie",
    ]);
    expect(CHART_AUTO_PUBLISH_THRESHOLD).toBe(0.8);
    // Coordinate graphs (9C) are math-sensitive → a stricter gate.
    expect(GRAPH_AUTO_PUBLISH_THRESHOLD).toBeGreaterThan(CHART_AUTO_PUBLISH_THRESHOLD);
  });
  it("CHART_EXTRACT_PROMPT covers the kinds + the do-not-invent guard", () => {
    for (const k of CHART_KINDS) expect(CHART_EXTRACT_PROMPT).toContain(k);
    expect(CHART_EXTRACT_PROMPT).toMatch(/is_chart/);
    expect(CHART_EXTRACT_PROMPT).toMatch(/Do NOT invent/i);
  });
});

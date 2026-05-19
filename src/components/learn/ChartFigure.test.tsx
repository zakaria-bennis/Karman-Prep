// @vitest-environment jsdom
//
// Unit tests for ChartFigure — renders SVG for the four supported
// coordinate-plane chart kinds. The test surface is intentionally
// thin: we verify the SVG actually renders, the axis labels appear
// in the DOM, and the right number of data glyphs are produced
// per series. Pixel-level layout correctness is a visual-regression
// concern, not a unit-test one.

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ChartFigure from "./ChartFigure";
import type { ChartFigure as ChartFigureType } from "@/types/chart";

function baseAxis(partial: Partial<ChartFigureType["x_axis"]> = {}) {
  return {
    label: "X",
    min: 0,
    max: 10,
    tick_step: 2,
    categories: null,
    ...partial,
  };
}

function baseFigure(partial: Partial<ChartFigureType> = {}): ChartFigureType {
  return {
    kind: "scatterplot",
    title: null,
    x_axis: baseAxis(),
    y_axis: baseAxis({ label: "Y" }),
    show_grid: true,
    series: [
      {
        kind: "scatter",
        label: null,
        points: [
          [1, 2],
          [3, 4],
          [5, 6],
        ],
      },
    ],
    confidence: 0.9,
    extracted_by: "test",
    extracted_at: "2026-05-19T00:00:00Z",
    extractor_note: null,
    ...partial,
  };
}

describe("ChartFigure", () => {
  it("renders an SVG with axis labels and the expected number of scatter dots", () => {
    const { container } = render(<ChartFigure data={baseFigure()} subject="math" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    // Three scatter points → three <circle> elements
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBe(3);
    // Axis labels should be present
    expect(container.textContent).toContain("X");
    expect(container.textContent).toContain("Y");
  });

  it("renders a title when provided", () => {
    const { container } = render(
      <ChartFigure data={baseFigure({ title: "Study Time vs Score" })} />
    );
    expect(container.textContent).toContain("Study Time vs Score");
  });

  it("renders a line graph with both a path and vertex dots", () => {
    const fig = baseFigure({
      kind: "line_graph",
      series: [
        {
          kind: "line",
          label: null,
          points: [
            [0, 0],
            [5, 5],
            [10, 0],
          ],
        },
      ],
    });
    const { container } = render(<ChartFigure data={fig} />);
    const paths = container.querySelectorAll("path");
    const circles = container.querySelectorAll("circle");
    // One line path, three vertex circles
    expect(paths.length).toBeGreaterThanOrEqual(1);
    expect(circles.length).toBe(3);
  });

  it("renders a bar chart with one rect per bar", () => {
    const fig = baseFigure({
      kind: "bar_chart",
      x_axis: { ...baseAxis(), min: null, max: null, tick_step: null, categories: ["A", "B", "C"] },
      series: [
        {
          kind: "bar",
          label: null,
          bars: [
            { category: "A", value: 5 },
            { category: "B", value: 3 },
            { category: "C", value: 8 },
          ],
        },
      ],
    });
    const { container } = render(<ChartFigure data={fig} />);
    const rects = container.querySelectorAll("rect");
    // The renderer also draws a legend background rect for multi-
    // series figures; this is single-series so the rect count
    // equals the bar count.
    expect(rects.length).toBe(3);
    // X-axis category labels should appear
    expect(container.textContent).toContain("A");
    expect(container.textContent).toContain("B");
    expect(container.textContent).toContain("C");
  });

  it("renders a function plot as a smooth path", () => {
    const fig = baseFigure({
      kind: "function_plot",
      x_axis: baseAxis({ min: -5, max: 5 }),
      y_axis: baseAxis({ min: -2, max: 30 }),
      series: [
        {
          kind: "function",
          label: null,
          expression: { kind: "quadratic", a: 1, b: 0, c: 0 }, // y = x²
          domain: null,
        },
      ],
    });
    const { container } = render(<ChartFigure data={fig} />);
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBeGreaterThanOrEqual(1);
    // No vertex dots for function plots
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBe(0);
  });

  it("renders a legend with item labels when multiple series are provided", () => {
    const fig = baseFigure({
      kind: "line_graph",
      series: [
        {
          kind: "line",
          label: "Student A",
          points: [
            [0, 0],
            [5, 5],
          ],
        },
        {
          kind: "line",
          label: "Student B",
          points: [
            [0, 1],
            [5, 6],
          ],
        },
      ],
    });
    const { container } = render(<ChartFigure data={fig} />);
    expect(container.textContent).toContain("Student A");
    expect(container.textContent).toContain("Student B");
  });

  it("sets role=img on the SVG for screen reader accessibility", () => {
    const { container } = render(<ChartFigure data={baseFigure()} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("role")).toBe("img");
    // <desc> element should carry the generated alt-text
    const desc = container.querySelector("desc");
    expect(desc?.textContent ?? "").toContain("Scatterplot");
  });
});

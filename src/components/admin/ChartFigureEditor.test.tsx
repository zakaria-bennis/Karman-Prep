// @vitest-environment jsdom
//
// The figure engine cannot draw a pie chart (ChartFigure shows a notice), so the
// admin chart editor never offers pie: no pie kind, and no "Add series" that would
// add pie data to a stored pie chart.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ChartFigure } from "@/types/chart";
import ChartFigureEditor from "./ChartFigureEditor";

const chart = (over: Partial<ChartFigure>): ChartFigure => ({
  kind: "scatterplot",
  title: null,
  x_axis: { label: "x", min: 0, max: 10, tick_step: 2, categories: null },
  y_axis: { label: "y", min: 0, max: 10, tick_step: 2, categories: null },
  show_grid: true,
  series: [{ kind: "scatter", label: null, points: [[1, 2]] }],
  confidence: 1,
  extracted_by: "test",
  extracted_at: "2026-10-31T00:00:00Z",
  extractor_note: null,
  ...over,
});

const editor = (initial: ChartFigure) =>
  render(
    <ChartFigureEditor initial={initial} subject="math" onSave={vi.fn()} onCancel={vi.fn()} />
  );

describe("ChartFigureEditor", () => {
  it("offers no pie chart kind", () => {
    editor(chart({}));
    expect(screen.queryByRole("button", { name: /pie/i })).toBeNull();
    expect(screen.getByRole("button", { name: /Add series/ })).toBeTruthy();
  });

  it("hides Add series on a stored pie chart and says the engine cannot draw it", () => {
    editor(
      chart({
        kind: "pie",
        series: [{ kind: "pie", label: null, slices: [{ label: "A", value: 1 }] }],
      })
    );
    expect(screen.queryByRole("button", { name: /Add series/ })).toBeNull();
    expect(screen.getByText(/Pie charts can.t be drawn by the figure engine/)).toBeTruthy();
  });
});

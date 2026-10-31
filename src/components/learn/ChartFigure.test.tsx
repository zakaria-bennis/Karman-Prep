// @vitest-environment jsdom
//
// Unit tests for ChartFigure: a thin wrapper that converts figure_chart_data to a
// FigureSpec and draws it with the figure engine. We check what a student sees:
// the SVG renders, axis labels and titles appear, each data value gets its glyph,
// bars stand side by side, and nothing spills out of the figure. Engine geometry
// is tested in tests/unit/figures/engine/charts.test.ts.

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

/** Filled dots drawn for a series part. */
const dots = (c: HTMLElement, part = "s1") =>
  [...c.querySelectorAll(`path[data-part="${part}"]`)].filter(
    (p) => p.getAttribute("fill") !== "none"
  );
/** Bar rects (series parts s1, s2, ...), legend swatches excluded. */
const bars = (c: HTMLElement) => [...c.querySelectorAll('rect[data-part^="s"]')];
const num = (el: Element, attr: string) => Number(el.getAttribute(attr));
/** Endpoints of an M/L path. */
const ends = (el: Element) => {
  const n = (el.getAttribute("d")!.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  return { x1: n[0], y1: n[1], x2: n[n.length - 2], y2: n[n.length - 1] };
};
/** The horizontal x-axis line: its left and right ends and its height. */
const xAxis = (c: HTMLElement) => {
  const axis = [...c.querySelectorAll('path[data-part="axis"]')]
    .map(ends)
    .find((e) => Math.abs(e.y1 - e.y2) < 1e-6)!;
  return { left: Math.min(axis.x1, axis.x2), right: Math.max(axis.x1, axis.x2), y: axis.y1 };
};
const viewBox = (c: HTMLElement) =>
  c.querySelector("svg")!.getAttribute("viewBox")!.split(" ").map(Number);

describe("ChartFigure", () => {
  it("renders an SVG with axis labels and the expected number of scatter dots", () => {
    const { container } = render(<ChartFigure data={baseFigure()} subject="math" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    // Three scatter points → three dots
    expect(dots(container)).toHaveLength(3);
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
    const line = [...container.querySelectorAll('path[data-part="s1"]')].filter(
      (p) => p.getAttribute("fill") === "none"
    );
    // One line path, three vertex dots
    expect(line).toHaveLength(1);
    expect(dots(container)).toHaveLength(3);
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
    // Single series: no legend, so the rect count equals the bar count.
    expect(container.querySelectorAll("rect").length).toBe(3);
    // X-axis category labels should appear
    expect(container.textContent).toContain("A");
    expect(container.textContent).toContain("B");
    expect(container.textContent).toContain("C");
  });

  it("draws gridlines first and bars opaque, so no line shows through a bar", () => {
    const fig = baseFigure({
      kind: "bar_chart",
      x_axis: { ...baseAxis(), min: null, max: null, tick_step: null, categories: ["A", "B"] },
      series: [
        {
          kind: "bar",
          label: null,
          bars: [
            { category: "A", value: 5 },
            { category: "B", value: 8 },
          ],
        },
      ],
    });
    const { container } = render(<ChartFigure data={fig} />);
    const drawn = [...container.querySelectorAll("path, rect")];
    const grid = drawn
      .map((el, i) => (el.getAttribute("stroke") === "var(--figure-grid)" ? i : -1))
      .filter((i) => i >= 0);
    const firstBar = drawn.findIndex((el) => el.localName === "rect");
    expect(grid.length).toBeGreaterThan(0);
    expect(firstBar).toBeGreaterThan(Math.max(...grid));
    for (const bar of container.querySelectorAll("rect")) {
      expect(bar.getAttribute("fill-opacity")).toBeNull();
      expect(bar.getAttribute("opacity")).toBeNull();
      // Translucent roles would let a gridline show through.
      expect(["var(--figure-fill-faint)", "var(--figure-fill-shade)", "none"]).not.toContain(
        bar.getAttribute("fill")
      );
    }
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
    const curve = container.querySelectorAll('path[data-part="f1"]');
    expect(curve.length).toBeGreaterThanOrEqual(1);
    // No vertex dots for function plots
    expect(dots(container, "f1")).toHaveLength(0);
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

  it("sets role=img and a generated description for screen readers", () => {
    const { container } = render(<ChartFigure data={baseFigure()} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-label") ?? "").toContain("Scatterplot");
  });

  it("uses the alt prop as the description when given", () => {
    const { container } = render(<ChartFigure data={baseFigure()} alt="Custom summary" />);
    expect(container.querySelector("svg")?.getAttribute("aria-label")).toBe("Custom summary");
  });

  it("says plainly that a pie chart cannot be drawn yet, instead of drawing nothing", () => {
    const fig = baseFigure({
      kind: "pie",
      x_axis: baseAxis({ label: "", min: null, max: null, tick_step: null }),
      y_axis: baseAxis({ label: "", min: null, max: null, tick_step: null }),
      series: [
        {
          kind: "pie",
          label: null,
          slices: [
            { label: "Red", value: 50 },
            { label: "Blue", value: 30 },
          ],
        },
      ],
    });
    const { container } = render(<ChartFigure data={fig} />);
    expect(container.querySelector("svg")).toBeNull();
    expect(container.textContent).toContain("can't be drawn");
  });

  it("renders a boxplot with a q1–q3 rect, whisker and median lines, and the value axis", () => {
    const fig = baseFigure({
      kind: "boxplot",
      x_axis: baseAxis({ label: "Score", min: 0, max: 100, tick_step: 20 }),
      y_axis: baseAxis({ label: "", min: null, max: null, tick_step: null }),
      series: [
        {
          kind: "boxplot",
          label: null,
          boxes: [{ category: null, min: 10, q1: 30, median: 50, q3: 70, max: 90 }],
        },
      ],
    });
    const { container } = render(<ChartFigure data={fig} />);
    // Exactly one box rect (q1–q3).
    expect(container.querySelectorAll("rect").length).toBe(1);
    // 2 whiskers + 2 caps + median.
    expect(container.querySelectorAll('path[data-part="b1"]').length).toBe(5);
    expect(container.textContent).toContain("Score");
    expect(container.querySelector("svg")?.getAttribute("aria-label") ?? "").toContain(
      "Box-and-whisker"
    );
  });

  it("draws whiskers only outside the box: min to Q1 and Q3 to max", () => {
    const fig = baseFigure({
      kind: "boxplot",
      x_axis: baseAxis({ label: "Units", min: 80, max: 140, tick_step: 10 }),
      series: [
        {
          kind: "boxplot",
          label: null,
          boxes: [{ category: null, min: 85, q1: 97, median: 114, q3: 124, max: 138 }],
        },
      ],
    });
    const { container } = render(<ChartFigure data={fig} />);
    const box = container.querySelector('rect[data-part="b1"]')!;
    const left = num(box, "x");
    const right = left + num(box, "width");
    const whiskers = [...container.querySelectorAll('path[data-part="b1"]')]
      .map(ends)
      .filter((e) => Math.abs(e.y1 - e.y2) < 1e-6)
      .map((e) => [e.x1, e.x2].sort((a, b) => a - b));
    expect(whiskers).toHaveLength(2);
    whiskers.sort((a, b) => a[0] - b[0]);
    expect(whiskers[0][1]).toBeCloseTo(left, 1);
    expect(whiskers[1][0]).toBeCloseTo(right, 1);
    for (const [a, b] of whiskers) expect(b <= left + 0.01 || a >= right - 0.01).toBe(true);
  });

  it("gives every series in a one-category chart its own fill and a legend", () => {
    const fig = baseFigure({
      kind: "bar_chart",
      x_axis: { ...baseAxis(), min: null, max: null, tick_step: null, categories: ["Charge"] },
      series: ["Anna's hummingbirds", "common wasps", "wintering honeybees"].map((label, i) => ({
        kind: "bar" as const,
        label,
        bars: [{ category: "Charge", value: [800, 50, 340][i] }],
      })),
    });
    const { container } = render(<ChartFigure data={fig} subject="reading" />);
    expect(new Set(bars(container).map((r) => r.getAttribute("fill"))).size).toBe(3);
    const legend = [...container.querySelectorAll('[data-part="legend"]')]
      .map((t) => t.textContent)
      .join(" ");
    expect(legend).toContain("common wasps");
    const { left, right } = xAxis(container);
    for (const r of bars(container))
      expect(num(r, "width")).toBeLessThanOrEqual((right - left) / 8 + 0.01);
  });

  it("renders one box rect per group for a multi-box boxplot", () => {
    const fig = baseFigure({
      kind: "boxplot",
      x_axis: baseAxis({ label: "Score", min: 0, max: 100, tick_step: 20 }),
      series: [
        {
          kind: "boxplot",
          label: null,
          boxes: [
            { category: "Class A", min: 10, q1: 30, median: 50, q3: 70, max: 90 },
            { category: "Class B", min: 20, q1: 40, median: 55, q3: 75, max: 95 },
          ],
        },
      ],
    });
    const { container } = render(<ChartFigure data={fig} />);
    expect(container.querySelectorAll("rect").length).toBe(2);
    expect(container.textContent).toContain("Class A");
    expect(container.textContent).toContain("Class B");
  });
});

describe("ChartFigure — printed-figure options", () => {
  const tickTexts = (container: HTMLElement) =>
    Array.from(container.querySelectorAll("text")).map((t) => t.textContent);

  it("labels every label_step while keeping a grid line at every tick", () => {
    const { container } = render(
      <ChartFigure
        data={baseFigure({ y_axis: baseAxis({ label: "Y", max: 4, tick_step: 1, label_step: 2 }) })}
      />
    );
    const texts = tickTexts(container);
    expect(texts).toContain("2");
    expect(texts).toContain("4");
    expect(texts.filter((t) => t === "3")).toHaveLength(0);
    // Grid lines still at every tick: y = 0..4 gives 5 horizontal grid lines.
    const horizontalGrid = [...container.querySelectorAll('path[stroke="var(--figure-grid)"]')]
      .map(ends)
      .filter((e) => Math.abs(e.y1 - e.y2) < 1e-6);
    expect(horizontalGrid).toHaveLength(5);
  });

  it("hides the 0 labels at the origin and uses a square frame when asked", () => {
    const { container } = render(
      <ChartFigure data={baseFigure({ hide_origin_label: true, frame: "square" })} />
    );
    expect(tickTexts(container)).not.toContain("0");
    expect(viewBox(container)).toEqual([0, 0, 500, 500]);
  });

  it("prints one-letter axis labels in italic at the axis ends", () => {
    const { container } = render(
      <ChartFigure data={baseFigure({ x_axis: baseAxis({ label: "x" }) })} />
    );
    const x = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === "x")!;
    expect(x.getAttribute("font-style")).toBe("italic");
  });
});

describe("ChartFigure — grouped bars, legend and titles (founder review 2026-10-22)", () => {
  const grouped = () =>
    baseFigure({
      kind: "bar_chart",
      title:
        "Average Total Agricultural Export Growth Rate, Five Years Pre- and Post-FTA with the United States",
      x_axis: {
        ...baseAxis(),
        label: "Export growth",
        min: null,
        max: null,
        tick_step: null,
        categories: ["Pre-FTA", "Post-FTA"],
      },
      series: ["Costa Rica (CAFTA-DR)", "Jordan (JOFTA)", "Morocco (MAFTA)"].map((label, s) => ({
        kind: "bar" as const,
        label,
        bars: [
          { category: "Pre-FTA", value: 2 + s },
          { category: "Post-FTA", value: 5 + s },
        ],
      })),
    });

  it("stands each category's bars side by side, never on top of each other", () => {
    const { container } = render(<ChartFigure data={grouped()} />);
    const all = bars(container);
    expect(all).toHaveLength(6);
    for (const category of [0, 1]) {
      const inSlot = [0, 1, 2].map((s) => all[s * 2 + category]);
      const spans = inSlot.map((b) => [num(b, "x"), num(b, "x") + num(b, "width")]);
      // A clear gap separates neighbouring bars.
      for (let i = 1; i < spans.length; i++) expect(spans[i][0]).toBeGreaterThan(spans[i - 1][1]);
      expect(new Set(inSlot.map((b) => b.getAttribute("fill"))).size).toBe(3);
    }
  });

  it("puts the legend below the plot and axis title, inside the figure", () => {
    const { container } = render(<ChartFigure data={grouped()} />);
    const text = (s: string) =>
      [...container.querySelectorAll("text")].find((t) => t.textContent === s)!;
    const legend = [...container.querySelectorAll('[data-part="legend"]')];
    expect(legend.length).toBeGreaterThan(0);
    const axisTitleY = num(text("Export growth"), "y");
    const height = viewBox(container)[3];
    for (const item of legend) {
      const top = item.localName === "rect" ? num(item, "y") : num(item, "y") - 15;
      expect(top).toBeGreaterThan(axisTitleY);
      expect(top).toBeGreaterThan(xAxis(container).y);
      expect(num(item, "y")).toBeLessThanOrEqual(height);
    }
    expect(container.textContent).toContain("Jordan (JOFTA)");
  });

  it("wraps a long title inside the figure instead of clipping it", () => {
    const { container } = render(<ChartFigure data={grouped()} />);
    const lines = [...container.querySelectorAll('text[data-part="title"]')];
    expect(lines.length).toBeGreaterThan(1);
    const width = viewBox(container)[2];
    for (const line of lines) {
      const w = 0.6 * 15 * line.textContent!.length;
      expect(num(line, "x") - w / 2).toBeGreaterThanOrEqual(0);
      expect(num(line, "x") + w / 2).toBeLessThanOrEqual(width);
    }
    expect(lines.map((l) => l.textContent).join(" ")).toBe(grouped().title);
    // The title sits above the plot.
    for (const line of lines) expect(num(line, "y")).toBeLessThan(xAxis(container).y);
  });

  it("wraps long category labels within their own slot", () => {
    const categories = [
      "A Dark Brown Dog",
      "Owl Creek Bridge",
      "Blitzed",
      "A Chess Problem",
      "The Calm",
      "Plumbing",
    ];
    const data = baseFigure({
      kind: "bar_chart",
      x_axis: { ...baseAxis(), min: null, max: null, tick_step: null, categories },
      series: [{ kind: "bar", label: null, bars: [{ category: "Blitzed", value: 3 }] }],
    });
    const { container } = render(<ChartFigure data={data} />);
    const { left, right, y } = xAxis(container);
    const slot = (right - left) / 6;
    const below = [...container.querySelectorAll("text")].filter(
      (t) => num(t, "y") > y && t.getAttribute("text-anchor") === "middle"
    );
    for (const t of below) expect(0.6 * 15 * t.textContent!.length).toBeLessThanOrEqual(slot);
    // "A Dark Brown Dog" needs more than one line.
    const first = below.filter((t) => Math.abs(num(t, "x") - (left + slot / 2)) < 0.01);
    expect(first.length).toBeGreaterThan(1);
    expect(first.map((t) => t.textContent).join(" ")).toBe("A Dark Brown Dog");
  });

  it("draws a single-series bar narrower than half its band, as printed SAT charts do", () => {
    const { container } = render(
      <ChartFigure
        data={baseFigure({
          kind: "bar_chart",
          x_axis: { ...baseAxis(), min: null, max: null, tick_step: null, categories: ["A", "B"] },
          series: [{ kind: "bar", label: "only", bars: [{ category: "A", value: 1 }] }],
        })}
      />
    );
    expect(container.querySelector('[data-part="legend"]')).toBeNull();
    const bar = bars(container)[0];
    const { left, right } = xAxis(container);
    const plotW = right - left;
    expect(num(bar, "width")).toBeCloseTo(Math.min((plotW / 2) * 0.4, plotW / 8), 1);
    expect(num(bar, "width")).toBeLessThan(plotW / 4);
  });

  it("fills 40% of each category band with a single-series bar", () => {
    const categories = ["A", "B", "C", "D", "E"];
    const data = baseFigure({
      kind: "bar_chart",
      x_axis: { ...baseAxis(), min: null, max: null, tick_step: null, categories },
      series: [
        { kind: "bar", label: null, bars: categories.map((category) => ({ category, value: 1 })) },
      ],
    });
    const { container } = render(<ChartFigure data={data} />);
    const { left, right } = xAxis(container);
    const slot = (right - left) / categories.length;
    for (const bar of bars(container)) expect(num(bar, "width") / slot).toBeCloseTo(0.4, 2);
  });

  it("keeps grouped bars side by side, the group filling 60% of its band", () => {
    const categories = ["A", "B", "C", "D", "E"];
    const data = baseFigure({
      kind: "bar_chart",
      x_axis: { ...baseAxis(), min: null, max: null, tick_step: null, categories },
      series: [0, 1, 2].map((s) => ({
        kind: "bar" as const,
        label: `Group ${s + 1}`,
        bars: categories.map((category) => ({ category, value: 1 + s })),
      })),
    });
    const { container } = render(<ChartFigure data={data} />);
    const { left, right } = xAxis(container);
    const slot = (right - left) / categories.length;
    const all = bars(container);
    for (const [c] of categories.entries()) {
      const group = [0, 1, 2].map((s) => all[s * categories.length + c]);
      const l = num(group[0], "x");
      const r = num(group[2], "x") + num(group[2], "width");
      expect((r - l) / slot).toBeCloseTo(0.6, 2);
      // Centred on the band.
      expect((l + r) / 2).toBeCloseTo(left + slot * (c + 0.5), 1);
      for (let i = 1; i < 3; i++)
        expect(num(group[i], "x")).toBeGreaterThan(
          num(group[i - 1], "x") + num(group[i - 1], "width")
        );
    }
  });
});

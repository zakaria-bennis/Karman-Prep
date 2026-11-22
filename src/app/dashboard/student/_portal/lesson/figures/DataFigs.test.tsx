// @vitest-environment jsdom

// The data pictures draw every chart kind and both samples: an SVG (or a table) with its labels, its
// marks to draw in, and the numbers the lesson gives, worked out the same way every time.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DataFigure, SampleFigure } from "@/lib/lessons/figures";
import { DataFig, SampleFig, parseAmount, parseMargin } from "./DataFigs";

const svgOf = (fig: DataFigure) => {
  const { container } = render(<DataFig fig={fig} />);
  const svg = container.querySelector("svg");
  expect(svg).not.toBeNull();
  expect(svg).toHaveAttribute("role", "img");
  expect(svg?.getAttribute("aria-label")).toBeTruthy();
  return svg as SVGSVGElement;
};
const texts = (root: Element) =>
  [...root.querySelectorAll("text, tspan")].map((t) => t.textContent);
const cls = (el: Element) => el.getAttribute("class") ?? "";

describe("DataFig", () => {
  it("draws one series of bars from 0, with nice ticks, its name and a lit bar", () => {
    const svg = svgOf({
      kind: "data",
      chart: "bar",
      labels: ["Mon", "Tue", "Wed", "Thu"],
      values: [4, 7, 5, 2],
      yLabel: "Hours",
      highlight: [1],
    });
    for (const t of ["Mon", "Tue", "Wed", "Thu", "Hours"]) expect(screen.getByText(t)).toBeTruthy();
    expect(texts(svg)).toEqual(expect.arrayContaining(["0", "2", "4", "6", "8"]));
    const bars = [...svg.querySelectorAll("path[data-pop]")];
    expect(bars).toHaveLength(4);
    expect(cls(bars[1])).toMatch(/lit/);
    expect(bars.filter((b) => /quiet/.test(cls(b)))).toHaveLength(3);
    expect(svg.getAttribute("aria-label")).toContain("Tue 7");
  });

  it("groups several series and names them in a legend", () => {
    const svg = svgOf({
      kind: "data",
      chart: "bar",
      labels: ["2019", "2020", "2021"],
      values: [
        [3, 5, 6],
        [4, 4, 7],
      ],
      legend: ["Boys", "Girls"],
    });
    expect(screen.getByText("Boys")).toBeTruthy();
    expect(screen.getByText("Girls")).toBeTruthy();
    expect(svg.querySelectorAll("path[data-pop]")).toHaveLength(6);
    expect(svg.querySelectorAll("rect")).toHaveLength(2);
  });

  it("wraps a long category name onto two lines rather than shortening it", () => {
    const svg = svgOf({
      kind: "data",
      chart: "bar",
      labels: ["Strongly agree", "Agree", "Disagree", "Strongly disagree"],
      values: [5, 9, 4, 2],
    });
    expect(screen.queryByText("Strongly agree")).toBeNull();
    expect(texts(svg)).toEqual(expect.arrayContaining(["Strongly", "agree", "disagree"]));
  });

  it("traces each series of a line graph, with its points and a legend", () => {
    const svg = svgOf({
      kind: "data",
      chart: "line",
      labels: ["Jan", "Feb", "Mar", "Apr"],
      series: [
        { name: "Store A", values: [12, 15, 14, 18] },
        { name: "Store B", values: [10, 11, 16, 17] },
      ],
      yLabel: "Sales",
    });
    for (const t of ["Jan", "Apr", "Store A", "Store B", "Sales"])
      expect(screen.getByText(t)).toBeTruthy();
    expect(svg.querySelectorAll("path[data-draw]")).toHaveLength(2);
    expect(svg.querySelectorAll("[data-pop]")).toHaveLength(8);
  });

  it("stacks a dot plot and marks its mean and median", () => {
    const svg = svgOf({
      kind: "data",
      chart: "dot",
      values: [2, 3, 3, 4, 4, 4, 5, 6, 9],
      showMean: true,
      showMedian: true,
    });
    expect(svg.querySelectorAll("circle")).toHaveLength(9);
    expect(screen.getByText("mean ≈ 4.44")).toBeTruthy();
    expect(screen.getByText("median 4")).toBeTruthy();
    expect(texts(svg)).toEqual(expect.arrayContaining(["2", "9"]));
  });

  it("draws two box plots to compare, each named", () => {
    const svg = svgOf({
      kind: "data",
      chart: "box",
      five: [10, 15, 20, 28, 35],
      second: [12, 18, 22, 25, 40],
      names: ["Class A", "Class B"],
    });
    expect(screen.getByText("Class A")).toBeTruthy();
    expect(screen.getByText("Class B")).toBeTruthy();
    expect(svg.querySelectorAll("rect[data-pop]")).toHaveLength(2);
    expect(svg.querySelectorAll("path[data-draw]")).toHaveLength(2);
    expect(svg.getAttribute("aria-label")).toContain("median 22");
  });

  it("draws a histogram with its bin edges under it", () => {
    const svg = svgOf({
      kind: "data",
      chart: "histogram",
      bins: [
        [0, 10, 3],
        [10, 20, 7],
        [20, 30, 5],
        [30, 40, 2],
      ],
    });
    expect(svg.querySelectorAll("path[data-pop]")).toHaveLength(4);
    expect(texts(svg)).toEqual(expect.arrayContaining(["10", "20", "30", "40"]));
  });

  it("plots a scatter with axis names and traces the line of best fit", () => {
    const svg = svgOf({
      kind: "data",
      chart: "scatter",
      points: [
        [1, 2],
        [2, 3.5],
        [3, 3.9],
        [4, 5.2],
        [5, 6.1],
      ],
      fit: [1, 1],
      xLabel: "Hours studied",
      yLabel: "Score",
    });
    expect(screen.getByText("Hours studied")).toBeTruthy();
    expect(screen.getByText("Score")).toBeTruthy();
    expect(svg.querySelectorAll("circle[data-pop]")).toHaveLength(5);
    expect(svg.querySelectorAll("line[data-draw]")).toHaveLength(1);
    expect(svg.getAttribute("aria-label")).toContain("y = 1x + 1");
  });

  it("sets a table on glass, with a caption for screen readers and lit cells", () => {
    const { container } = render(
      <DataFig
        fig={{
          kind: "data",
          chart: "table",
          head: ["Plan", "Price", "Seats"],
          rows: [
            ["Basic", "$10", "1"],
            ["Pro", "$20", "5"],
          ],
          highlight: [[1, 1]],
        }}
      />
    );
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "Plan",
      "Price",
      "Seats",
    ]);
    expect(container.querySelector("caption")?.textContent).toContain("Plan, Price and Seats");
    expect(container.querySelectorAll("mark")).toHaveLength(1);
    expect(container.querySelector("mark")?.textContent).toBe("$20");
    expect(container.querySelectorAll("[data-pop]")).toHaveLength(1);
  });
});

describe("SampleFig", () => {
  const lit = (fig: SampleFigure) => {
    const { container, unmount } = render(<SampleFig fig={fig} />);
    const svg = container.querySelector("svg")!;
    const dots = [...svg.querySelectorAll("circle[data-sample]")].map((c) => [
      Number(c.getAttribute("cx")),
      Number(c.getAttribute("cy")),
    ]);
    return { svg, dots, unmount };
  };

  it("spreads a random sample over the whole field, the same on every render", () => {
    const fig: SampleFigure = { kind: "sample", random: true, label: "A random sample" };
    const a = lit(fig);
    expect(a.svg).toHaveAttribute("role", "img");
    expect(a.svg.querySelectorAll("circle")).toHaveLength(64 + 12);
    expect(a.dots).toHaveLength(12);
    expect(screen.getByText("A random sample")).toBeTruthy();
    const xs = a.dots.map((d) => d[0]);
    expect(Math.min(...xs)).toBeLessThan(80);
    expect(Math.max(...xs)).toBeGreaterThan(160);
    a.unmount();
    expect(lit(fig).dots).toEqual(a.dots);
  });

  it("bunches a sample that is not random in one corner, and shows the estimate as a range", () => {
    const { svg, dots } = lit({ kind: "sample", random: false, estimate: "62%", margin: "±3%" });
    expect(dots).toHaveLength(12);
    for (const [x, y] of dots) expect(x + y).toBeLessThan(150);
    for (const t of ["62%", "±3%", "59%", "65%"]) expect(screen.getByText(t)).toBeTruthy();
    expect(svg.querySelectorAll("line[data-draw]")).toHaveLength(2);
  });

  it("shows the estimate as written when it is not a plain number", () => {
    const { svg } = lit({ kind: "sample", random: true, estimate: "about two thirds" });
    expect(screen.getByText("about two thirds")).toBeTruthy();
    expect(svg.querySelectorAll("line[data-draw]")).toHaveLength(0);
  });

  it("reads amounts and margins", () => {
    expect(parseAmount("62%")).toEqual({ v: 62, pre: "", post: "%", dec: 0 });
    expect(parseAmount("$4.50")).toEqual({ v: 4.5, pre: "$", post: "", dec: 2 });
    expect(parseAmount("about 62%")).toBeNull();
    expect(parseMargin("±3%")).toEqual({ v: 3, dec: 0 });
    expect(parseMargin("plus or minus")).toBeNull();
  });
});

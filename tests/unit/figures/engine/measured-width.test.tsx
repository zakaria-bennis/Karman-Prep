// @vitest-environment jsdom
//
// The measured-width path (useMeasuredWidth) that SpecFigure (FigureFrame) and
// ChartFigure share: a figure in a narrow container is laid out at the
// container's width so its text stays at least 12px on screen. Found in the
// final branch review: ChartFigure drew a fixed 600×400 box (15px text showed
// at 8.6px in a 343px column), SpecFigure stopped measuring once its drawing
// kind changed, and a 1–2px width change (a scrollbar) redrew the figure.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { act, render } from "@testing-library/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChartFigure from "@/components/learn/ChartFigure";
import FigureFrame from "@/components/learn/FigureFrame";
import { nextWidth, WIDTH_HYSTERESIS_PX } from "@/components/learn/figures/useMeasuredWidth";
import { HOUSE } from "@/lib/figures/engine/house";
import { FIGURE_SPEC_VERSION, type FigureSpec } from "@/lib/figures/engine/spec";
import type { ChartFigure as ChartData } from "@/types/chart";

/** A ResizeObserver stand-in: tests report a width for an observed element by hand. */
class FakeResizeObserver {
  static all: FakeResizeObserver[] = [];
  readonly observed = new Set<Element>();
  constructor(readonly callback: (entries: { contentRect: { width: number } }[]) => void) {
    FakeResizeObserver.all.push(this);
  }
  observe(el: Element) {
    this.observed.add(el);
  }
  unobserve(el: Element) {
    this.observed.delete(el);
  }
  disconnect() {
    this.observed.clear();
  }
}

/** Reports `width` for `el` to every observer watching it; false when none is. */
function resize(el: Element, width: number): boolean {
  const watching = FakeResizeObserver.all.filter((o) => o.observed.has(el));
  act(() => watching.forEach((o) => o.callback([{ contentRect: { width } }])));
  return watching.length > 0;
}

const viewBoxWidth = (root: ParentNode) =>
  Number(root.querySelector("svg")!.getAttribute("viewBox")!.split(" ")[2]);

beforeEach(() => {
  FakeResizeObserver.all = [];
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
});
afterEach(() => vi.unstubAllGlobals());

const PLANE: FigureSpec = {
  version: FIGURE_SPEC_VERSION,
  type: "plane",
  parts: [{ kind: "point", id: "A", x: 1, y: 2 }],
  labels: [],
  marks: [],
  frame: { x: [-5, 5], y: [-5, 5], step: 1 },
};
const TABLE: FigureSpec = {
  version: FIGURE_SPEC_VERSION,
  type: "table",
  parts: [{ kind: "table", id: "t1", header: ["x", "y"], rows: [["1", "2"]] }],
  labels: [],
  marks: [],
};

describe("nextWidth", () => {
  it(`ignores changes of ${WIDTH_HYSTERESIS_PX}px or less, and floors the measure`, () => {
    expect(nextWidth(null, 340.7)).toBe(340);
    expect(nextWidth(340, 342)).toBe(340);
    expect(nextWidth(340, 338)).toBe(340);
    expect(nextWidth(340, 343)).toBe(343);
    expect(nextWidth(340, 325)).toBe(325);
  });
});

describe("SpecFigure's width observer", () => {
  it("draws the default box before it is measured (and on the server)", () => {
    const html = renderToStaticMarkup(createElement(FigureFrame, { spec: PLANE, alt: "" }));
    expect(html).toContain('viewBox="0 0 640 480"');
  });

  it("measures the figure that mounts when the drawing changes from a table to a plane", () => {
    const { container, rerender } = render(<FigureFrame spec={TABLE} alt="" />);
    expect(container.querySelector("table")).not.toBeNull();
    rerender(<FigureFrame spec={PLANE} alt="" />);
    const figure = container.querySelector("figure")!;
    expect(resize(figure, 340)).toBe(true);
    expect(viewBoxWidth(container)).toBe(340);
  });

  it("does not redraw for a 1–2px width change (a scrollbar), but does for more", () => {
    const { container } = render(<FigureFrame spec={PLANE} alt="" />);
    const figure = container.querySelector("figure")!;
    resize(figure, 340);
    const svg = container.querySelector("svg");
    resize(figure, 342);
    resize(figure, 341);
    expect(viewBoxWidth(container)).toBe(340);
    expect(container.querySelector("svg")).toBe(svg);
    resize(figure, 326);
    expect(viewBoxWidth(container)).toBe(326);
  });
});

describe("ChartFigure's width observer", () => {
  const dir = path.resolve(__dirname, "../../../fixtures/charts");
  const fixtures = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({
      name: f,
      data: (
        JSON.parse(readFileSync(path.join(dir, f), "utf8")) as { figure_chart_data: ChartData }
      ).figure_chart_data,
    }));

  it("every chart fixture's text stays at least 12px on screen from 300 to 1000px", () => {
    expect(fixtures.length).toBeGreaterThan(0);
    for (const { name, data } of fixtures) {
      const { container, unmount } = render(<ChartFigure data={data} />);
      const figure = container.querySelector("figure")!;
      for (let width = 300; width <= 1000; width += 10) {
        expect(resize(figure, width), name).toBe(true);
        // The SVG fills the figure's width, so a viewBox unit shows at width / viewBox px.
        const px = HOUSE.font * Math.min(1, width / viewBoxWidth(container));
        expect(px, `${name} at ${width}px`).toBeGreaterThanOrEqual(HOUSE.minFontOnScreen);
      }
      unmount();
    }
  });

  it("draws its default box before it is measured (and on the server)", () => {
    const html = renderToStaticMarkup(createElement(ChartFigure, { data: fixtures[0].data }));
    expect(html).toMatch(/viewBox="[-\d.]+ [-\d.]+ (600|500) /);
  });
});

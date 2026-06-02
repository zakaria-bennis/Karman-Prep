// @vitest-environment jsdom
//
// GeometryFigure renders structured 2D geometry as SVG (only reached
// when figure_kind='geometric', i.e. the gate already confirmed the
// render matches the screenshot). Verifies it produces an <svg> with
// the vertex labels, and renders nothing when the data can't render
// (so the caller falls back to the screenshot).

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import GeometryFigure from "./GeometryFigure";
import type { GeometryFigureData } from "@/lib/figures/geometry-svg";

const triangle: GeometryFigureData = {
  kind: "geometric",
  shapes: [
    {
      kind: "triangle",
      vertices_or_points: [
        { label: "R", x: 255, y: 170 },
        { label: "S", x: 425, y: 80 },
        { label: "T", x: 425, y: 170 },
      ],
    },
  ],
  notes: "Right triangle RST.",
};

describe("GeometryFigure", () => {
  it("renders an SVG with the vertex labels + caption", () => {
    const { container } = render(<GeometryFigure data={triangle} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("role")).toBe("img");
    expect(container.querySelector("polygon")).not.toBeNull();
    expect(container.textContent).toContain("R");
    // notes appear in both the SVG <title> (a11y) and the visible caption
    expect(container.querySelector("figcaption")?.textContent).toContain("Right triangle RST.");
  });

  it("renders nothing when the geometry has no coordinates", () => {
    const { container } = render(
      <GeometryFigure
        data={{
          kind: "geometric",
          shapes: [{ kind: "triangle", vertices_or_points: [{ label: "A" }] }],
        }}
      />
    );
    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelector("figure")).toBeNull();
  });
});

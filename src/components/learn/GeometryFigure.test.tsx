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

// A tall, narrow triangle (source 2025-03_US_V2_MATH_M1_Q12 has this shape).
const tall: GeometryFigureData = {
  layout_version: "balanced-v1",
  shapes: [
    {
      kind: "triangle",
      vertices_or_points: [
        { id: "C", label: "C", x: 327, y: 62 },
        { id: "A", label: "A", x: 234, y: 290 },
        { id: "E", label: "E", x: 327, y: 290 },
      ],
    },
  ],
  angle_markings: [],
  length_markings: [],
};

describe("GeometryFigure — fits its frame", () => {
  it("caps the SVG's height and lets the viewBox scale the whole drawing into it", () => {
    const { container } = render(<GeometryFigure data={tall} />);
    const holder = container.querySelector("figure > div")!;
    const svg = holder.querySelector("svg")!;
    // The cap sits on the SVG itself (not only on its wrapper, which let it spill out).
    expect(holder.className).toContain("[&>svg]:max-h-[28rem]");
    expect(holder.className).toContain("[&>svg]:w-full");
    expect(holder.className).toContain("[&>svg]:h-auto");
    expect(svg.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
    // Labels sit inside the viewBox, so scaling the box keeps them in the frame.
    const [x, y, w, h] = svg.getAttribute("viewBox")!.split(" ").map(Number);
    for (const text of svg.querySelectorAll("text")) {
      const tx = Number(text.getAttribute("x"));
      const ty = Number(text.getAttribute("y"));
      expect(tx).toBeGreaterThan(x);
      expect(tx).toBeLessThan(x + w);
      expect(ty).toBeGreaterThan(y);
      expect(ty).toBeLessThan(y + h);
    }
  });
});

// @vitest-environment node
//
// Unit tests for buildGeometrySvg — the deterministic 2D-geometry → SVG
// renderer. The Stage-6.6 promotion gate rasterizes this output to
// compare against the screenshot, and GeometryFigure renders it to
// students, so the invariants here matter: valid SVG out, graceful
// bail when there are no coordinates, and XML-safe text.

import { describe, it, expect } from "vitest";
import { buildGeometrySvg, type GeometryFigureData } from "./geometry-svg";

const triangle: GeometryFigureData = {
  kind: "geometric",
  shapes: [
    {
      kind: "triangle",
      label: "RST",
      vertices_or_points: [
        { label: "R", x: 255, y: 170 },
        { label: "S", x: 425, y: 80 },
        { label: "T", x: 425, y: 170 },
      ],
    },
  ],
  angle_markings: [{ at_vertex: "T", right_angle: true }],
  length_markings: [{ on_segment: ["R", "T"], value: "12" }],
  notes: "Right triangle RST with the right angle at T.",
};

describe("buildGeometrySvg", () => {
  it("renders a triangle with a polygon, viewBox, and vertex labels", () => {
    const { svg, renderable } = buildGeometrySvg(triangle);
    expect(renderable).toBe(true);
    expect(svg).toContain("<svg");
    expect(svg).toMatch(/viewBox="[-\d. ]+"/);
    expect(svg).toContain("<polygon");
    // all three vertex labels present
    for (const v of ["R", "S", "T"]) expect(svg).toContain(`>${v}<`);
  });

  it("draws the right-angle marker (a path) and the length value", () => {
    const { svg } = buildGeometrySvg(triangle);
    expect(svg).toContain("<path"); // right-angle square
    expect(svg).toContain(">12<"); // length marking
  });

  it("renders a lone line segment as a polyline, not a polygon", () => {
    const { svg } = buildGeometrySvg({
      kind: "geometric",
      shapes: [
        {
          kind: "line_segment",
          vertices_or_points: [
            { label: "A", x: 0, y: 0 },
            { label: "B", x: 100, y: 0 },
          ],
        },
      ],
    });
    expect(svg).toContain("<polyline");
    expect(svg).not.toContain("<polygon");
  });

  it("bails (renderable=false) when there are no coordinates", () => {
    const r = buildGeometrySvg({
      kind: "geometric",
      shapes: [{ kind: "triangle", vertices_or_points: [{ label: "A" }, { label: "B" }] }],
    });
    expect(r.renderable).toBe(false);
    expect(r.svg).toBeNull();
    expect(r.reason).toBe("no_coordinates");
  });

  it("XML-escapes label/title text", () => {
    const { svg } = buildGeometrySvg({
      kind: "geometric",
      notes: "a < b & c",
      shapes: [
        {
          kind: "line_segment",
          vertices_or_points: [
            { label: "A&B", x: 0, y: 0 },
            { label: "C", x: 10, y: 10 },
          ],
        },
      ],
    });
    expect(svg).toContain("a &lt; b &amp; c");
    expect(svg).toContain("A&amp;B");
    expect(svg).not.toMatch(/<title>a < b/);
  });
});

// @vitest-environment node
//
// Unit tests for buildGeometrySvg — the deterministic 2D-geometry → SVG
// renderer. The Stage-6.6 promotion gate rasterizes this output to
// compare against the screenshot, and GeometryFigure renders it to
// students, so the invariants here matter: valid SVG out, graceful
// bail when there are no coordinates, and XML-safe text.

import { describe, it, expect } from "vitest";
import { buildGeometrySvg, katexToUnicode, type GeometryFigureData } from "./geometry-svg";

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

  it("renders angle-measure labels (the part the gate cares about)", () => {
    const { svg } = buildGeometrySvg({
      kind: "geometric",
      shapes: [
        {
          kind: "triangle",
          vertices_or_points: [
            { label: "A", x: 0, y: 0 },
            { label: "B", x: 100, y: 0 },
            { label: "C", x: 0, y: 100 },
          ],
        },
      ],
      angle_markings: [{ at_vertex: "A", measure: "30°" }],
    });
    expect(svg).toContain("30°");
  });

  it("converts LaTeX angle measures to Unicode (no raw markup in the SVG)", () => {
    const { svg } = buildGeometrySvg({
      kind: "geometric",
      shapes: [
        {
          kind: "triangle",
          vertices_or_points: [
            { label: "A", x: 0, y: 0 },
            { label: "B", x: 100, y: 0 },
            { label: "C", x: 0, y: 100 },
          ],
        },
      ],
      angle_markings: [{ at_vertex: "A", measure: "x^{\\circ}" }],
      length_markings: [{ on_segment: ["A", "B"], value: "$5\\sqrt{2}$" }],
    });
    expect(svg).toContain("x°");
    expect(svg).toContain("5√2");
    expect(svg).not.toContain("circ");
    expect(svg).not.toContain("sqrt");
  });

  it("fans out two angles marked at the same vertex instead of stacking them", () => {
    const { svg } = buildGeometrySvg({
      kind: "geometric",
      shapes: [
        {
          kind: "polygon",
          vertices_or_points: [
            { label: "P", x: 0, y: 100 },
            { label: "Q", x: 100, y: 0 },
            { label: "R", x: 200, y: 100 }, // shared vertex of both angles
            { label: "S", x: 300, y: 0 },
            { label: "T", x: 400, y: 100 },
          ],
        },
      ],
      // Both angles at R both marked "x°" (e.g. △QRP and △SRT).
      angle_markings: [
        { at_vertex: "R", measure: "x°" },
        { at_vertex: "R", measure: "x°" },
      ],
    });
    const labels = [...svg!.matchAll(/<text x="([\d.-]+)"[^>]*>x°<\/text>/g)];
    expect(labels.length).toBe(2); // both rendered
    expect(labels[0][1]).not.toBe(labels[1][1]); // at different positions
  });

  it("resolves an angle at_vertex given as coordinates (unlabeled intersection)", () => {
    const { svg } = buildGeometrySvg({
      kind: "geometric",
      shapes: [
        {
          kind: "line_segment",
          vertices_or_points: [
            { label: null, x: 0, y: 100 },
            { label: null, x: 200, y: 100 },
          ],
        },
        {
          kind: "line_segment",
          vertices_or_points: [
            { label: null, x: 100, y: 0 },
            { label: null, x: 100, y: 200 },
          ],
        },
      ],
      // No vertex is labeled — the angle is anchored by coordinates only.
      angle_markings: [{ at_vertex: "intersection at (100, 100)", measure: "y°" }],
    });
    expect(svg).toContain("y°");
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

  it("XML-escapes label/title text after LaTeX conversion", () => {
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

describe("katexToUnicode", () => {
  it.each([
    ["x^{\\circ}", "x°"],
    ["$30^\\circ$", "30°"],
    ["45\\degree", "45°"],
    ["5\\sqrt{2}", "5√2"],
    ["\\sqrt 3", "√3"],
    ["\\overline{AB}", "AB"],
    ["\\triangle ABC", "△ ABC"],
    ["a \\parallel b", "a ∥ b"],
    ["x^2", "x²"],
    ["plain text", "plain text"],
    ["30°", "30°"], // already-Unicode passes through unchanged
  ])("converts %j → %j", (input, expected) => {
    expect(katexToUnicode(input)).toBe(expected);
  });

  it("is null/undefined safe", () => {
    expect(katexToUnicode(null)).toBe("");
    expect(katexToUnicode(undefined)).toBe("");
  });
});

describe("buildGeometrySvg — labels clear of a side passing through the vertex", () => {
  it("keeps X off line RS when X sits on RS", () => {
    const { svg } = buildGeometrySvg({
      layout_version: "balanced-v1",
      shapes: [
        {
          kind: "triangle",
          vertices_or_points: [
            { id: "R", label: "R", x: 100, y: 0 },
            { id: "S", label: "S", x: 300, y: 300 },
            { id: "T", label: "T", x: 100, y: 300 },
          ],
        },
        {
          kind: "triangle",
          vertices_or_points: [
            { id: "X", label: "X", x: 140, y: 60 },
            { id: "Y", label: "Y", x: 260, y: 60 },
            { id: "Z", label: "Z", x: 260, y: 240 },
          ],
        },
      ],
      angle_markings: [],
      length_markings: [],
    });
    const m = svg!.match(/<text x="([\d.-]+)" y="([\d.-]+)"[^>]*>X<\/text>/)!;
    const [x, y] = [Number(m[1]), Number(m[2])];
    // Distance from the label centre to line RS (through (100,0) and (300,300)).
    const distance = Math.abs(300 * (x - 100) - 200 * y) / Math.hypot(200, 300);
    expect(distance).toBeGreaterThan(8);
    // And outside triangle XYZ's corner (left of X, i.e. not between XY and XZ).
    expect(x).toBeLessThan(140);
  });
});

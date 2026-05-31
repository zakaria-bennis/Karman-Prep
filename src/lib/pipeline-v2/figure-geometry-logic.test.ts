// @vitest-environment node
//
// Unit tests for the Phase 9D/9E geometry + 3D logic
// (scripts/lib/figure-geometry-logic.mjs). These extractions are stored
// admin-only (the student keeps the screenshot), so validation is light:
// it just confirms there's a usable structure to keep, discriminated by
// kind ("geometric" | "3d_shape").

import { describe, it, expect } from "vitest";
import {
  GEOMETRY_SHAPE_KINDS,
  SOLID_KINDS,
  GEOMETRY_EXTRACT_PROMPT,
  SHAPE_3D_EXTRACT_PROMPT,
  validateGeometryData,
  stampGeometryProvenance,
  deriveGeometryComplexity,
  geometryAltText,
} from "../../../scripts/lib/figure-geometry-logic.mjs";

describe("validateGeometryData — 2D geometry", () => {
  const triangle = {
    is_geometry: true,
    shapes: [
      {
        kind: "triangle",
        label: "ABC",
        vertices_or_points: [
          { label: "A", x: 0, y: 0 },
          { label: "B", x: 4, y: 0 },
          { label: "C", x: 0, y: 3 },
        ],
      },
    ],
    angle_markings: [{ at_vertex: "A", measure: null, right_angle: true }],
    length_markings: [{ on_segment: ["A", "B"], value: "4" }],
    relationships: [],
    notes: "Right triangle ABC with the right angle at A.",
  };

  it("accepts a triangle and discriminates kind=geometric", () => {
    const r = validateGeometryData(triangle, "geometric");
    expect(r.ok).toBe(true);
    expect(r.data?.kind).toBe("geometric");
    expect(r.data?.shapes).toHaveLength(1);
    expect(r.data?.angle_markings).toHaveLength(1);
  });

  it("rejects an explicit non-geometry and an empty shape list", () => {
    expect(validateGeometryData({ is_geometry: false }, "geometric").errors).toContain(
      "not_geometry"
    );
    expect(validateGeometryData({ is_geometry: true, shapes: [] }, "geometric").errors).toContain(
      "no_shapes"
    );
  });

  it("rejects an empty response", () => {
    expect(validateGeometryData(null, "geometric").errors).toContain("empty_response");
  });
});

describe("validateGeometryData — 3D shapes", () => {
  const cylinder = {
    is_3d: true,
    solid_kind: "cylinder",
    is_net: false,
    dimensions: [
      { label: "radius", value: "3" },
      { label: "height", value: "10" },
    ],
    labels: [],
    notes: "A cylinder of radius 3 and height 10.",
  };

  it("accepts a cylinder and discriminates kind=3d_shape", () => {
    const r = validateGeometryData(cylinder, "3d_shape");
    expect(r.ok).toBe(true);
    expect(r.data?.kind).toBe("3d_shape");
    expect(r.data?.solid_kind).toBe("cylinder");
    expect(r.data?.is_net).toBe(false);
  });

  it("rejects a non-3d response and a missing solid_kind", () => {
    expect(validateGeometryData({ is_3d: false }, "3d_shape").errors).toContain("not_3d");
    expect(validateGeometryData({ is_3d: true }, "3d_shape").errors).toContain(
      "missing_solid_kind"
    );
  });
});

describe("stampGeometryProvenance", () => {
  it("adds provenance without mutating the input", () => {
    const core = validateGeometryData(
      { is_geometry: true, shapes: [{ kind: "circle" }] },
      "geometric"
    ).data!;
    const stamped = stampGeometryProvenance(core, {
      extractedBy: "gemini-2.5-pro@2026-05-31",
      extractedAt: "2026-05-31T00:00:00.000Z",
    });
    expect(stamped.extracted_by).toBe("gemini-2.5-pro@2026-05-31");
    expect(stamped.extracted_at).toBe("2026-05-31T00:00:00.000Z");
    expect(core).not.toHaveProperty("extracted_by");
  });
});

describe("deriveGeometryComplexity + geometryAltText", () => {
  it("buckets complexity for 2D + 3D", () => {
    expect(deriveGeometryComplexity({ kind: "geometric", shapes: [{ kind: "point" }] })).toBe(
      "simple"
    );
    expect(
      deriveGeometryComplexity({
        kind: "geometric",
        shapes: Array(6).fill({ kind: "line_segment" }),
        angle_markings: Array(4).fill({}),
        length_markings: Array(3).fill({}),
        relationships: [],
      })
    ).toBe("dense"); // 13 elements
  });

  it("prefers the model note for alt text, else synthesizes", () => {
    expect(geometryAltText({ kind: "geometric", notes: "Right triangle ABC." })).toBe(
      "Right triangle ABC."
    );
    expect(
      geometryAltText({
        kind: "3d_shape",
        solid_kind: "rectangular_prism",
        is_net: true,
        notes: null,
      })
    ).toContain("rectangular prism (net)");
    expect(
      geometryAltText({ kind: "geometric", shapes: [{ kind: "circle" }, { kind: "triangle" }] })
    ).toContain("2 shapes");
  });
});

describe("constants + prompts", () => {
  it("exposes shape + solid kind vocabularies", () => {
    expect(GEOMETRY_SHAPE_KINDS).toContain("triangle");
    expect(GEOMETRY_SHAPE_KINDS).toContain("other");
    expect(SOLID_KINDS).toContain("cylinder");
    expect(SOLID_KINDS).toContain("pyramid");
  });

  it("prompts carry their is_* guards + figure-only rule", () => {
    expect(GEOMETRY_EXTRACT_PROMPT).toMatch(/is_geometry/);
    expect(GEOMETRY_EXTRACT_PROMPT).toMatch(/do NOT transcribe the question stem/i);
    expect(SHAPE_3D_EXTRACT_PROMPT).toMatch(/is_3d/);
    expect(SHAPE_3D_EXTRACT_PROMPT).toMatch(/solid_kind/);
  });
});

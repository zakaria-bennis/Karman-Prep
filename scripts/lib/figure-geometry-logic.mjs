// Pure logic for Phase 9D (2D geometry) + 9E (3D shapes & nets).
//
// These are deliberately DIFFERENT from tables/charts/graphs: the
// extraction is stored in figure_geometry_data for ADMIN tooling, but the
// student keeps seeing the SCREENSHOT in v1. The proposal's rule —
// "clean-looking wrong geometry is more dangerous than a real screenshot"
// — means we never flip figure_kind to a structured renderer here. The
// runner (extract-figure-structure.mjs) stores the data + records
// figure_quality, and figure_kind stays as the screenshot.
//
// Because nothing renders from this data yet, validation is intentionally
// LIGHT: confirm the model produced a usable, well-formed structure to
// store; per-element geometric correctness is a human-review concern (the
// admin UI surfaces "here's what we extracted, verify it"). Promotion to a
// student-facing renderer is a v2 decision once extractions have a track
// record.
//
// The vision model emits structured JSON, never SVG (proposal Decision 1).

/** 2D shape kinds we recognize. "other" captures anything unanticipated
 *  (hexagons, composed shapes, sectors…) so we still store + surface it. */
export const GEOMETRY_SHAPE_KINDS = Object.freeze([
  "triangle",
  "quadrilateral",
  "circle",
  "line_segment",
  "polygon",
  "arc",
  "point",
  "other",
]);

/** 3D solid kinds (9E). "other" + nets handled via fields below. */
export const SOLID_KINDS = Object.freeze([
  "cube",
  "rectangular_prism",
  "triangular_prism",
  "cylinder",
  "cone",
  "sphere",
  "pyramid",
  "other",
]);

// ── Prompts (one per dimensionality; the runner picks by figure_kind) ──

/** 2D geometry (9D). Enhanced from the Pre-9A benchmark's geometric prompt
 *  with an is_geometry guard + a free-form note. */
export const GEOMETRY_EXTRACT_PROMPT = `You are looking at a figure cropped from an SAT math question. Decide whether it is a 2D GEOMETRY diagram (triangles, quadrilaterals, circles, line segments, polygons, composed shapes with angle/length markings).

If it is NOT 2D geometry (a data table, a coordinate-plane chart/graph, a 3D solid, a photo, etc.), return {"is_geometry": false}.

If it IS, extract its structure. Read labels and markings faithfully; do NOT invent measures that aren't shown. Use KaTeX for any math in values (e.g. $30^\\circ$, $5\\sqrt{2}$). Return strict JSON only:

{
  "is_geometry": true,
  "shapes": [
    { "kind": "triangle" | "quadrilateral" | "circle" | "line_segment" | "polygon" | "arc" | "point" | "other",
      "label": "<e.g. 'ABC' or null>",
      "vertices_or_points": [ { "label": "A", "x": <num or null>, "y": <num or null> }, ... ] }
  ],
  "angle_markings": [ { "at_vertex": "A", "measure": "<e.g. '30°' or null>", "right_angle": true | false } ],
  "length_markings": [ { "on_segment": ["A", "B"], "value": "<e.g. '5' or null>" } ],
  "relationships": [ { "kind": "parallel" | "perpendicular" | "congruent" | "similar" | "shared_edge" | "tangent", "between": ["...", "..."] } ],
  "notes": "<one sentence describing the figure, for a screen reader>"
}

Only the figure itself — do NOT transcribe the question stem or answer choices.`;

/** 3D shapes & nets (9E). */
export const SHAPE_3D_EXTRACT_PROMPT = `You are looking at a figure cropped from an SAT math question. Decide whether it is a 3D SOLID or the NET (flattened unfolding) of one — cubes, rectangular/triangular prisms, cylinders, cones, spheres, pyramids.

If it is NOT a 3D solid or net (a 2D geometry diagram, a table, a chart, etc.), return {"is_3d": false}.

If it IS, extract its structure. Read labels and dimensions faithfully; do NOT invent values. Use KaTeX for math in values. Return strict JSON only:

{
  "is_3d": true,
  "solid_kind": "cube" | "rectangular_prism" | "triangular_prism" | "cylinder" | "cone" | "sphere" | "pyramid" | "other",
  "is_net": true | false,
  "dimensions": [ { "label": "<e.g. 'radius', 'height', 'edge', 'slant height'>", "value": "<e.g. '5' or null>" } ],
  "labels": [ "<vertex/face labels shown, e.g. 'A', 'B'>" ],
  "notes": "<one sentence describing the solid, for a screen reader>"
}

Only the figure itself — do NOT transcribe the question stem or answer choices.`;

// ── Helpers ────────────────────────────────────────────────────

const isNonEmptyString = (v) => typeof v === "string" && v.trim() !== "";
const asStringOrNull = (v) => (isNonEmptyString(v) ? v : null);
const asArray = (v) => (Array.isArray(v) ? v : []);

// ── Validation (LIGHT — admin-only, screenshot renders) ────────

/**
 * Validate + normalize a geometry/3D extraction enough to STORE it. Returns
 * a discriminated `data` (kind: "geometric" | "3d_shape"). Light by design:
 * the screenshot renders regardless, so this only rejects responses with no
 * usable structure to keep.
 *
 * @param {any} parsed
 * @param {"geometric"|"3d_shape"} kind
 * @returns {{ok: boolean, errors: string[], data: ({kind: string, shapes?: any[], solid_kind?: string, is_net?: boolean, dimensions?: any[], labels?: any[], angle_markings?: any[], length_markings?: any[], relationships?: any[], notes: string|null})|null}}
 */
export function validateGeometryData(parsed, kind) {
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, errors: ["empty_response"], data: null };
  }

  if (kind === "3d_shape") {
    if (parsed.is_3d === false) return { ok: false, errors: ["not_3d"], data: null };
    if (!isNonEmptyString(parsed.solid_kind)) {
      return { ok: false, errors: ["missing_solid_kind"], data: null };
    }
    const data = {
      kind: "3d_shape",
      solid_kind: parsed.solid_kind,
      is_net: parsed.is_net === true,
      dimensions: asArray(parsed.dimensions),
      labels: asArray(parsed.labels),
      notes: asStringOrNull(parsed.notes),
    };
    return { ok: true, errors: [], data };
  }

  // 2D geometry
  if (parsed.is_geometry === false) return { ok: false, errors: ["not_geometry"], data: null };
  const shapes = asArray(parsed.shapes);
  if (shapes.length === 0) return { ok: false, errors: ["no_shapes"], data: null };
  const data = {
    kind: "geometric",
    shapes,
    angle_markings: asArray(parsed.angle_markings),
    length_markings: asArray(parsed.length_markings),
    relationships: asArray(parsed.relationships),
    notes: asStringOrNull(parsed.notes),
  };
  return { ok: true, errors: [], data };
}

/**
 * Stamp model + timestamp provenance onto stored geometry data (kept
 * separate from validation so the validator stays pure).
 *
 * @param {object} data
 * @param {{extractedBy: string, extractedAt: string}} prov
 * @returns {{kind: string, extracted_by: string, extracted_at: string}}
 */
export function stampGeometryProvenance(data, { extractedBy, extractedAt }) {
  return { ...data, extracted_by: extractedBy, extracted_at: extractedAt };
}

/**
 * Deterministic complexity from extracted structure (proposal Decision 6).
 * @param {object} data
 * @returns {"simple" | "medium" | "dense"}
 */
export function deriveGeometryComplexity(data) {
  let n = 0;
  if (data?.kind === "3d_shape") {
    n = asArray(data.dimensions).length + asArray(data.labels).length + 1;
  } else {
    n =
      asArray(data?.shapes).length +
      asArray(data?.angle_markings).length +
      asArray(data?.length_markings).length +
      asArray(data?.relationships).length;
  }
  if (n < 5) return "simple";
  if (n < 12) return "medium";
  return "dense";
}

/**
 * Screen-reader summary for figure_quality.alt_text. Prefers the model's
 * one-sentence note; falls back to a synthesized description.
 *
 * @param {object} data
 * @returns {string}
 */
export function geometryAltText(data) {
  if (isNonEmptyString(data?.notes)) return data.notes.trim();
  if (data?.kind === "3d_shape") {
    const word = String(data.solid_kind ?? "solid").replace(/_/g, " ");
    return `A 3D ${word}${data.is_net ? " (net)" : ""}.`;
  }
  const shapes = asArray(data?.shapes);
  const kinds = [...new Set(shapes.map((s) => String(s?.kind ?? "shape").replace(/_/g, " ")))];
  return `A geometric figure with ${shapes.length} shape${shapes.length === 1 ? "" : "s"}${
    kinds.length ? ` (${kinds.join(", ")})` : ""
  }.`;
}

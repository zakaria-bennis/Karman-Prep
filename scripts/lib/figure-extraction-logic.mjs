// Pure logic for Phase 9A figure-structure enrichment (the IMAGE → HTML
// table path). The runner — scripts/pdf-pipeline/extract-figure-structure.mjs
// — does the I/O (Supabase, R2 image fetch, the vision call); everything
// here is pure + unit-tested (figure-extraction-logic.test.ts), so the
// schema validation, alt-text, complexity scoring, and figure_quality
// shape can't drift from the runner that depends on them.
//
// Design rules (from docs/phase-9-figure-pipeline-proposal.md):
//   · Two-call pattern: CLASSIFY first, then EXTRACT typed by kind
//     (Decision 7 — a single discriminated-union schema across tables /
//     charts / graphs / geometry is unreliable).
//   · The vision model emits structured JSON, NEVER raw HTML/SVG
//     (Decision 1). A deterministic renderer (QuestionTable.tsx) turns
//     figure_table_data into accessible HTML.
//   · Screenshot is the safe default (Decision 5 / the proposal's
//     fallback chain). When table validation fails, the row keeps its
//     screenshot and figure_quality records WHY — failure is explicit.
//   · Tables validate STRUCTURALLY (rectangularity, header/width match,
//     non-empty cells), not by perceptual hash: an ivory-on-dark HTML
//     table can't hash-match a black-on-white PDF crop, so a hash check
//     is the wrong tool for tables. Perceptual validation belongs in
//     9B/9C where SVG geometry should match the source.

// ── Constants ─────────────────────────────────────────────────

/** The classifier's figure_kind values. Mirrors the widened
 *  quiz_questions.figure_kind CHECK (migration 20260531000000), minus
 *  'image'/'svg' which are render-target kinds, not classifications. */
export const FIGURE_KINDS = Object.freeze([
  "table",
  "chart",
  "graph",
  "geometric",
  "3d_shape",
  "other",
]);

/** figure_quality.validation_status — the outcome of the enrichment
 *  attempt for one figure. */
export const VALIDATION_STATUS = Object.freeze({
  VALIDATED: "validated",
  VALIDATED_WITH_WARNINGS: "validated_with_warnings",
  FALLBACK_USED: "fallback_used",
  EXTRACTION_FAILED: "extraction_failed",
});

/** figure_quality.used_fallback_level — 0 = structured representation
 *  used; 3 = full screenshot fallback. Levels 1/2 (figure_crop /
 *  expanded_question_crop) are reserved for the render-time chain and
 *  unused by the 9A table path. */
export const FALLBACK_LEVEL = Object.freeze({
  STRUCTURED: 0,
  SCREENSHOT: 3,
});

/** Bump when the table renderer (QuestionTable.tsx) changes in a way
 *  that would alter output for the same figure_table_data, so we can
 *  re-render systematically. */
export const TABLE_RENDERER_VERSION = "table@1.0.0";

// ── Prompts (one CLASSIFY, one typed EXTRACT for tables) ───────

/** Classify a single figure crop. JSON-only; consumed by
 *  extract-figure-structure.mjs which routes 'table' to the extractor
 *  and records every other kind for later sub-phases (9B-9E). */
export const CLASSIFY_PROMPT = `You are looking at a single figure cropped from an SAT practice test.

Classify it into EXACTLY ONE category:
  · table       — a data table: rows and columns of values, usually with headers
  · chart       — bar / line / pie / scatter / boxplot
  · graph       — a coordinate plane with axes (a function plot OR plotted points)
  · geometric   — 2D geometry: triangles, quadrilaterals, circles, line segments, angle/length marks
  · 3d_shape    — cubes, cylinders, cones, spheres, pyramids, or nets of solids
  · other        — none of the above; say what you actually see

Return JSON only, no prose:
{
  "figure_kind": "table" | "chart" | "graph" | "geometric" | "3d_shape" | "other",
  "confidence": 0.0-1.0,
  "model_called_it_a": "short free-form description, e.g. '5-row data table of state populations'"
}`;

/**
 * Build the table-extraction prompt. Optionally include a short question
 * snippet so the model can tell the table apart from the surrounding
 * stem / answer choices (a frequent failure: pulling choice text into a
 * table cell).
 *
 * @param {string|null} [questionContext]
 * @returns {string}
 */
export function buildTableExtractPrompt(questionContext) {
  const ctx =
    questionContext && questionContext.trim()
      ? `\n\nQUESTION CONTEXT (for disambiguation only — do NOT transcribe any of this into the table):\n${questionContext.trim().slice(0, 400)}`
      : "";
  return `Transcribe this DATA TABLE into structured JSON, faithfully.

RULES
- Preserve every value exactly: numbers, currency symbols, units, signs.
- Wrap math in $...$ for KaTeX (e.g. $x^2$, $\\frac{1}{2}$, $-3.5$).
- header_row = the printed column labels (concise). null if the table has no header row.
- The first cell of each body row is usually a row label — keep it as the first column value.
- Every body row MUST have the same number of cells as the header row (or as each other if no header). Do not drop or merge cells.
- caption = the title shown directly above the table, else null. footer_note = a source line / footnote below it, else null.
- Do NOT include the question stem, answer choices, or any surrounding prose — only the table itself.${ctx}

Return JSON only:
{
  "caption": "string | null",
  "header_row": ["col 1", "col 2", ...] | null,
  "rows": [["r1c1", "r1c2", ...], ...],
  "footer_note": "string | null",
  "confidence": 0.0-1.0
}`;
}

// ── Helpers ───────────────────────────────────────────────────

const isNonEmptyString = (v) => typeof v === "string" && v.trim() !== "";
const asStringOrNull = (v) => (isNonEmptyString(v) ? v : null);

/**
 * Coerce a raw extractor payload into the canonical figure_table_data
 * shape consumed by QuestionTable.tsx:
 *   { caption: string|null, header_row: string[]|null, rows: string[][], footer_note: string|null }
 * Cells are stringified (the model sometimes returns numbers); structure
 * is preserved as-is so validateTableData can judge it.
 *
 * @param {any} raw
 * @returns {{caption: string|null, header_row: string[]|null, rows: string[][], footer_note: string|null}}
 */
export function normalizeTableData(raw) {
  const cellToString = (c) => (c == null ? "" : typeof c === "string" ? c : String(c));
  const header = Array.isArray(raw?.header_row) ? raw.header_row.map(cellToString) : null;
  const rows = Array.isArray(raw?.rows)
    ? raw.rows.map((r) => (Array.isArray(r) ? r.map(cellToString) : [cellToString(r)]))
    : [];
  return {
    caption: asStringOrNull(raw?.caption),
    header_row: header && header.length > 0 ? header : null,
    rows,
    footer_note: asStringOrNull(raw?.footer_note),
  };
}

// ── Schema validation (structural) ────────────────────────────

/**
 * Structurally validate normalized table data. Catches the "clean-looking
 * wrong" table failures the proposal calls out (Decision 4): a missing
 * column (ragged rows) or a missing row label. Returns errors (block the
 * structured render → screenshot fallback) and warnings (render, but flag).
 *
 * @param {{caption?: string|null, header_row?: string[]|null, rows?: string[][], footer_note?: string|null}} data
 * @returns {{ok: boolean, errors: string[], warnings: string[], rowCount: number, colCount: number}}
 */
export function validateTableData(data) {
  const errors = [];
  const warnings = [];
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const header = Array.isArray(data?.header_row) ? data.header_row : null;

  if (rows.length === 0) {
    errors.push("no_rows: table has zero body rows");
    return { ok: false, errors, warnings, rowCount: 0, colCount: 0 };
  }
  if (!rows.every((r) => Array.isArray(r))) {
    errors.push("malformed_rows: every row must be an array of cells");
    return { ok: false, errors, warnings, rowCount: rows.length, colCount: 0 };
  }

  // Rectangularity — all body rows the same width (a ragged table means a
  // dropped/merged cell, the classic table-extraction error).
  const widths = [...new Set(rows.map((r) => r.length))];
  if (widths.length > 1) {
    errors.push(`ragged_rows: body rows have differing column counts (${widths.join(", ")})`);
  }
  const colCount = header?.length ?? rows[0].length;
  if (colCount < 1) errors.push("no_columns: table has zero columns");

  // Header / body width agreement.
  if (header && header.length > 0 && widths.length === 1 && widths[0] !== header.length) {
    errors.push(
      `header_width_mismatch: header has ${header.length} columns but body rows have ${widths[0]}`
    );
  }

  // Soft signals — render, but worth a human glance.
  if (!header || header.length === 0) {
    warnings.push("no_header: table has no header row (rendering headerless)");
  }
  const emptyCells = rows.reduce((n, r) => n + r.filter((c) => !isNonEmptyString(c)).length, 0);
  if (emptyCells > 0) {
    warnings.push(`empty_cells: ${emptyCells} blank cell(s) — may be intentional gaps`);
  }
  if (header && new Set(header.map((h) => h.trim())).size !== header.length) {
    warnings.push("duplicate_headers: two header labels are identical");
  }

  return { ok: errors.length === 0, errors, warnings, rowCount: rows.length, colCount };
}

// ── Complexity + alt text ─────────────────────────────────────

/**
 * Deterministic complexity from the extracted structure (Decision 6 — not
 * LLM judgment). Drives renderer sizing / review heuristics downstream.
 *
 * @param {{header_row?: string[]|null, rows?: string[][]}} data
 * @returns {"simple" | "medium" | "dense"}
 */
export function deriveTableComplexity(data) {
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const cols = data?.header_row?.length ?? rows[0]?.length ?? 0;
  const cells = rows.length * cols;
  if (cells < 15) return "simple";
  if (cells < 40) return "medium";
  return "dense";
}

/**
 * Screen-reader summary for figure_quality.alt_text (replaces the raster
 * image_alt for structured tables). Concise: caption + dimensions +
 * column labels.
 *
 * @param {{caption?: string|null, header_row?: string[]|null, rows?: string[][]}} data
 * @returns {string}
 */
export function tableAltText(data) {
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const cols = data?.header_row?.length ?? rows[0]?.length ?? 0;
  const lead = isNonEmptyString(data?.caption) ? `${data.caption.trim()}. ` : "";
  const dims = `Data table with ${rows.length} row${rows.length === 1 ? "" : "s"} and ${cols} column${cols === 1 ? "" : "s"}`;
  const colList =
    Array.isArray(data?.header_row) && data.header_row.length > 0
      ? `. Columns: ${data.header_row.map((h) => String(h).trim()).join(", ")}`
      : "";
  return `${lead}${dims}${colList}.`;
}

// ── figure_quality builder ────────────────────────────────────

/**
 * Assemble the figure_quality JSONB written to quiz_questions. One builder
 * so every code path produces the same shape (documented in the
 * 20260531000000 migration + docs/phase-9-handoff.md §6).
 *
 * @param {object} o
 * @param {string} o.validationStatus  one of VALIDATION_STATUS
 * @param {number} o.usedFallbackLevel one of FALLBACK_LEVEL
 * @param {string[]} [o.schemaErrors]
 * @param {number} [o.modelConfidence]
 * @param {string} [o.altText]
 * @param {string} [o.classifiedAs]    the classifier's figure_kind
 * @param {string} [o.modelCalledItA]  free-form classifier note
 * @param {string} [o.rendererVersion]
 * @returns {{validation_status: string, used_fallback_level: number, schema_errors: string[], visual_validation: null, extraction_model_confidence: number|null, alt_text: string|null, diagnostic: {classified_as: string|null, model_called_it_a: string|null, renderer_version: string}}}
 */
export function buildFigureQuality({
  validationStatus,
  usedFallbackLevel,
  schemaErrors = [],
  modelConfidence = null,
  altText = null,
  classifiedAs = null,
  modelCalledItA = null,
  rendererVersion = TABLE_RENDERER_VERSION,
}) {
  return {
    validation_status: validationStatus,
    used_fallback_level: usedFallbackLevel,
    schema_errors: Array.isArray(schemaErrors) ? schemaErrors : [],
    // 9A tables validate structurally, not by perceptual hash — see the
    // module header. Reserved for 9B/9C SVG geometry.
    visual_validation: null,
    extraction_model_confidence: typeof modelConfidence === "number" ? modelConfidence : null,
    alt_text: altText,
    diagnostic: {
      classified_as: classifiedAs,
      model_called_it_a: modelCalledItA,
      renderer_version: rendererVersion,
    },
  };
}

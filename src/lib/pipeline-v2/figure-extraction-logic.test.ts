// @vitest-environment node
//
// Unit tests for the Phase 9A figure-structure logic
// (scripts/lib/figure-extraction-logic.mjs). The runner
// extract-figure-structure.mjs depends on these invariants:
//
//   1. Structural validation catches the "clean-looking wrong" table
//      failures (ragged rows, header/width mismatch) → screenshot
//      fallback. Headerless / blank-cell tables are warnings, not
//      errors (still renderable).
//   2. normalizeTableData produces the exact figure_table_data shape
//      QuestionTable.tsx renders.
//   3. figure_quality always has the documented shape, with
//      visual_validation null for tables (validated structurally).
//   4. The prompts keep the table-vs-stem separation + KaTeX rule.

import { describe, expect, it } from "vitest";
import {
  FIGURE_KINDS,
  VALIDATION_STATUS,
  FALLBACK_LEVEL,
  TABLE_RENDERER_VERSION,
  CLASSIFY_PROMPT,
  buildTableExtractPrompt,
  normalizeTableData,
  validateTableData,
  deriveTableComplexity,
  tableAltText,
  buildFigureQuality,
} from "../../../scripts/lib/figure-extraction-logic.mjs";

describe("normalizeTableData", () => {
  it("stringifies numeric cells and preserves structure", () => {
    const out = normalizeTableData({
      caption: "Populations",
      header_row: ["State", "Pop"],
      rows: [
        ["CA", 39000000],
        ["TX", 30000000],
      ],
      footer_note: "Source: Census",
    });
    expect(out).toEqual({
      caption: "Populations",
      header_row: ["State", "Pop"],
      rows: [
        ["CA", "39000000"],
        ["TX", "30000000"],
      ],
      footer_note: "Source: Census",
    });
  });

  it("collapses an empty / missing header to null and blank caption to null", () => {
    expect(
      normalizeTableData({ header_row: [], rows: [["a"]], caption: "  " }).header_row
    ).toBeNull();
    expect(normalizeTableData({ rows: [["a"]] }).caption).toBeNull();
    expect(normalizeTableData({ rows: [["a"]] }).footer_note).toBeNull();
  });

  it("never throws on malformed input (defensive)", () => {
    expect(normalizeTableData(null).rows).toEqual([]);
    expect(normalizeTableData({ rows: "not-an-array" }).rows).toEqual([]);
  });
});

describe("validateTableData — passes clean tables", () => {
  it("accepts a rectangular table with header", () => {
    const r = validateTableData({
      caption: null,
      header_row: ["A", "B"],
      rows: [
        ["1", "2"],
        ["3", "4"],
      ],
      footer_note: null,
    });
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.rowCount).toBe(2);
    expect(r.colCount).toBe(2);
  });
});

describe("validateTableData — blocks structurally-broken tables", () => {
  it("flags ragged rows (a dropped/merged cell)", () => {
    const r = validateTableData({
      header_row: ["A", "B"],
      rows: [["1", "2"], ["3"]],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.startsWith("ragged_rows"))).toBe(true);
  });

  it("flags header/body width mismatch (a missing column)", () => {
    const r = validateTableData({
      header_row: ["A", "B", "C"],
      rows: [
        ["1", "2"],
        ["3", "4"],
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.startsWith("header_width_mismatch"))).toBe(true);
  });

  it("flags an empty table", () => {
    const r = validateTableData({ header_row: ["A"], rows: [] });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.startsWith("no_rows"))).toBe(true);
  });
});

describe("validateTableData — warns but still renders", () => {
  it("warns on a headerless table without erroring", () => {
    const r = validateTableData({
      header_row: null,
      rows: [
        ["1", "2"],
        ["3", "4"],
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.startsWith("no_header"))).toBe(true);
  });

  it("warns on blank cells and duplicate headers", () => {
    const r = validateTableData({
      header_row: ["A", "A"],
      rows: [["1", ""]],
    });
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.startsWith("empty_cells"))).toBe(true);
    expect(r.warnings.some((w) => w.startsWith("duplicate_headers"))).toBe(true);
  });
});

describe("deriveTableComplexity", () => {
  it("buckets by cell count", () => {
    expect(deriveTableComplexity({ header_row: ["A", "B"], rows: [["1", "2"]] })).toBe("simple");
    expect(
      deriveTableComplexity({
        header_row: ["A", "B", "C", "D"],
        rows: Array(5).fill(["1", "2", "3", "4"]),
      })
    ).toBe("medium"); // 4 cols × 5 rows = 20
    expect(
      deriveTableComplexity({
        header_row: Array(8).fill("c"),
        rows: Array(6).fill(Array(8).fill("x")),
      })
    ).toBe("dense"); // 8 × 6 = 48
  });
});

describe("tableAltText", () => {
  it("summarizes caption, dimensions, and columns for screen readers", () => {
    const alt = tableAltText({
      caption: "State data",
      header_row: ["State", "Population"],
      rows: [
        ["CA", "39M"],
        ["TX", "30M"],
      ],
    });
    expect(alt).toContain("State data");
    expect(alt).toContain("2 rows");
    expect(alt).toContain("2 columns");
    expect(alt).toContain("State, Population");
  });

  it("handles singular row/column wording", () => {
    expect(tableAltText({ caption: null, header_row: ["Only"], rows: [["1"]] })).toContain(
      "1 row and 1 column"
    );
  });
});

describe("buildFigureQuality", () => {
  it("produces the documented shape with visual_validation null", () => {
    const q = buildFigureQuality({
      validationStatus: VALIDATION_STATUS.VALIDATED,
      usedFallbackLevel: FALLBACK_LEVEL.STRUCTURED,
      modelConfidence: 0.97,
      altText: "Data table with 2 rows and 2 columns.",
      classifiedAs: "table",
      modelCalledItA: "2-row table",
    });
    expect(q.validation_status).toBe("validated");
    expect(q.used_fallback_level).toBe(0);
    expect(q.visual_validation).toBeNull();
    expect(q.schema_errors).toEqual([]);
    expect(q.extraction_model_confidence).toBe(0.97);
    expect(q.diagnostic.classified_as).toBe("table");
    expect(q.diagnostic.renderer_version).toBe(TABLE_RENDERER_VERSION);
  });

  it("carries schema errors on the fallback path", () => {
    const q = buildFigureQuality({
      validationStatus: VALIDATION_STATUS.FALLBACK_USED,
      usedFallbackLevel: FALLBACK_LEVEL.SCREENSHOT,
      schemaErrors: ["ragged_rows: ..."],
    });
    expect(q.validation_status).toBe("fallback_used");
    expect(q.used_fallback_level).toBe(3);
    expect(q.schema_errors).toHaveLength(1);
  });
});

describe("prompts", () => {
  it("CLASSIFY_PROMPT lists every figure kind and asks for JSON only", () => {
    for (const kind of FIGURE_KINDS) expect(CLASSIFY_PROMPT).toContain(kind);
    expect(CLASSIFY_PROMPT).toMatch(/JSON only/i);
    expect(CLASSIFY_PROMPT).toMatch(/model_called_it_a/);
  });

  it("buildTableExtractPrompt enforces KaTeX + table/stem separation", () => {
    const p = buildTableExtractPrompt(null);
    expect(p).toMatch(/KaTeX/);
    expect(p).toMatch(/same number of cells/i);
    expect(p).toMatch(/Do NOT include the question stem/i);
  });

  it("buildTableExtractPrompt injects question context for disambiguation", () => {
    const p = buildTableExtractPrompt("Which value is greatest?");
    expect(p).toContain("Which value is greatest?");
    expect(p).toMatch(/do NOT transcribe/i);
  });
});

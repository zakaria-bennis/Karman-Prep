// @vitest-environment node
//
// Vitest for the Phase 8.1 hotfix: rowToImportInput MUST inject
// source_pdf when the extractor JSON doesn't include it.
//
// This is the regression that the Phase 8.3 smoke test caught —
// the extractor's responseSchema in extract-with-gemini.mjs doesn't
// emit source_pdf, so the import code has to inject it from the
// PDF path passed on the CLI. Otherwise every row goes in with
// source_pdf=NULL and Stages 4-14 silently no-op.

import { describe, expect, it } from "vitest";
import {
  rowToImportInput,
  preflightImportRows,
} from "../../../scripts/pdf-pipeline/import-json-direct-row";

const version = "a".repeat(64);

// Minimum-viable row that passes the domain check.
function validRow(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    question_text: "If x + 2 = 5, what is x?",
    correct_answer: "3",
    domain: "algebra",
    choice_a: "1",
    choice_b: "2",
    choice_c: "3",
    choice_d: "4",
    difficulty: 2,
    question_format: "multiple_choice",
    concept_slug: "linear-equations-one-variable",
    topic_cluster: "linear_equations_in_one_variable",
    source_page: 7,
    answer_source: "extracted",
    import_status: "ok",
    ...extra,
  };
}

describe("rowToImportInput — source_pdf injection (Phase 8.1 hotfix)", () => {
  it("injects defaultSourcePdf when row.source_pdf is missing", () => {
    const out = rowToImportInput(validRow(), "202406asiav2.pdf");
    expect("error" in out).toBe(false);
    if (!("error" in out)) {
      expect(out.source_pdf).toBe("202406asiav2.pdf");
    }
  });

  it("injects defaultSourcePdf when row.source_pdf is null", () => {
    const out = rowToImportInput(validRow({ source_pdf: null }), "202406asiav2.pdf");
    if (!("error" in out)) {
      expect(out.source_pdf).toBe("202406asiav2.pdf");
    }
  });

  it("rejects an empty explicit source_pdf before import", () => {
    const out = rowToImportInput(validRow({ source_pdf: "" }), "202406asiav2.pdf");
    expect(out).toEqual({ error: 'source_pdf must match source file "202406asiav2.pdf"' });
  });

  it("rejects an explicit source_pdf for a different file", () => {
    const out = rowToImportInput(validRow({ source_pdf: "hand-edited.pdf" }), "202406asiav2.pdf");
    expect(out).toEqual({ error: 'source_pdf must match source file "202406asiav2.pdf"' });
  });

  it("accepts an explicit source_pdf matching the CLI file", () => {
    const out = rowToImportInput(validRow({ source_pdf: "202406asiav2.pdf" }), "202406asiav2.pdf");
    expect("error" in out).toBe(false);
    if (!("error" in out)) expect(out.source_pdf).toBe("202406asiav2.pdf");
  });

  it("still validates domain before injection (rejects unknown domain)", () => {
    const out = rowToImportInput(validRow({ domain: "bogus" }), "202406asiav2.pdf");
    expect("error" in out).toBe(true);
    if ("error" in out) {
      expect(out.error).toMatch(/unknown.*domain.*bogus/i);
    }
  });

  it("works with a full path-style PDF arg (caller strips basename)", () => {
    // The CLI is responsible for stripping basename — the function
    // takes the already-stripped name. We document that contract here.
    const out = rowToImportInput(validRow(), "202406asiav2.pdf");
    if (!("error" in out)) {
      expect(out.source_pdf).not.toContain("/");
      expect(out.source_pdf).toBe("202406asiav2.pdf");
    }
  });
});

describe("versioned source identity preflight", () => {
  const identified = {
    section: "math",
    module_number: 1,
    question_number: 1,
    occurrence_index: 1,
  };

  it("preserves explicit identity and source provenance", () => {
    const result = rowToImportInput(
      validRow({
        ...identified,
        source_provider: "box",
        source_document_id: "1892233086581",
        source_provider_version_id: "2087154443381",
      }),
      "released.pdf",
      version
    );
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result).toMatchObject({
        source_version: version,
        source_section: "math",
        source_module: "M1",
        source_question_number: 1,
        source_occurrence: 1,
        source_provider: "box",
        source_document_id: "1892233086581",
      });
    }
  });

  it("keeps incomplete legacy identity under human review", () => {
    const result = rowToImportInput(validRow(), "released.pdf", version);
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.source_version).toBeUndefined();
      expect(result.import_status).toBe("needs_review");
      expect(result.import_flag_reason).toMatch(/Missing stable source question identity/);
    }
  });

  it("stops duplicate identities before any writes, including retries in one batch", () => {
    const rows = [validRow(identified), validRow(identified)];
    const result = preflightImportRows(rows, "released.pdf", version, true);
    expect(result.errors).toContain("rows 1 and 2: duplicate source identity");
  });

  it("strict mode blocks missing identity; legacy mode records it for review", () => {
    const rows = [validRow()];
    expect(preflightImportRows(rows, "released.pdf", version, true).errors).toEqual([
      "row 1: missing stable source identity",
    ]);
    const legacy = preflightImportRows(rows, "released.pdf", version, false);
    expect(legacy.errors).toEqual([]);
    expect(legacy.inputs[0].import_status).toBe("needs_review");
  });

  it("adapts nested Box provenance and rejects a mismatched file checksum", () => {
    const row = validRow({
      source_page: undefined,
      sourceDocument: { provider: "box", fileId: "file-123" },
      sourceVersion: { boxVersionId: "version-456", sha256: version },
      occurrence: {
        section: "math",
        module: "M2",
        visibleQuestionNumber: "2",
        occurrenceIndex: 1,
        pageIndexStart: 4,
        regions: [{ pageIndex: 4, bbox: [10, 20, 30, 40] }],
      },
    });
    const prepared = preflightImportRows([row], "renamed.pdf", version, true);
    expect(prepared.errors).toEqual([]);
    expect(prepared.inputs[0]).toMatchObject({
      source_provider: "box",
      source_document_id: "file-123",
      source_provider_version_id: "version-456",
      source_section: "math",
      source_module: "M2",
      source_question_number: 2,
      source_page: 5,
    });
    expect(preflightImportRows([row], "renamed.pdf", "b".repeat(64), true).errors).toEqual([
      "row 1: source version checksum differs from source file",
    ]);
  });
});

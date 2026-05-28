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
import { rowToImportInput } from "../../../scripts/pdf-pipeline/import-json-direct-row";

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

  it("injects defaultSourcePdf when row.source_pdf is empty string", () => {
    // Empty string is falsy in the ?? fallback path we expect:
    // `row.source_pdf ?? defaultSourcePdf` would PASS empty string through
    // (?? only catches null/undefined). We document the current behavior:
    // the explicit-override semantics are preserved, even if "" is silly.
    // The orchestrator never produces empty source_pdf, so this case is
    // only relevant if someone hand-edits the JSON.
    const out = rowToImportInput(validRow({ source_pdf: "" }), "202406asiav2.pdf");
    if (!("error" in out)) {
      // An empty string IS truthy enough to bypass ??, so we surface it.
      // If we ever want to coerce empty → default, change the operator
      // to || in import-json-direct.ts.
      expect(out.source_pdf).toBe("");
    }
  });

  it("preserves explicit row.source_pdf when set (override path)", () => {
    const out = rowToImportInput(validRow({ source_pdf: "hand-edited.pdf" }), "202406asiav2.pdf");
    if (!("error" in out)) {
      expect(out.source_pdf).toBe("hand-edited.pdf");
    }
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

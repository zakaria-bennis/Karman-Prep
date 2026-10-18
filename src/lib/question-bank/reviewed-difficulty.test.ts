// @vitest-environment node
import { describe, expect, it } from "vitest";
import { rowToReviewedImportInput } from "../../../scripts/pdf-pipeline/import-json-direct-row";
import {
  REVIEWED_DIFFICULTY_RUBRIC_VERSION,
  validateReviewedDifficulty,
} from "./reviewed-difficulty";

function row(overrides: Record<string, unknown> = {}) {
  return {
    question_text: "Solve x + 2 = 5.",
    correct_answer: "3",
    domain: "algebra",
    question_format: "numeric_entry",
    concept_slug: "linear-equations-one-variable",
    difficulty: "mastery", // Legacy/source rating must not override D's numeric assessment.
    difficulty_level: 2,
    difficulty_rationale: "One direct arithmetic operation.",
    difficulty_confidence: 0.95,
    difficulty_rubric_version: REVIEWED_DIFFICULTY_RUBRIC_VERSION,
    difficulty_solution_sha256: "a".repeat(64),
    difficulty_content_sha256: "b".repeat(64),
    difficulty_uncertain: false,
    skill_uncertain: false,
    difficulty_selectable_for_downstream: true,
    skill_selectable_for_downstream: true,
    source_exam_readiness_withdrawn: false,
    source_quality_hold: false,
    current_version: true,
    website_import_ready: true,
    history: { attempt_ids: ["old-attempt"], original_difficulty: "mastery" },
    ...overrides,
  };
}

describe("reviewed D-to-import contract", () => {
  it("retains numeric difficulty and source lineage together after integration", () => {
    const sourceVersion = "c".repeat(64);
    const result = rowToReviewedImportInput(
      row({
        difficulty_level: 7,
        source_provider: "box",
        source_document_id: "synthetic-document",
        source_provider_version_id: "synthetic-provider-version",
        section: "math",
        module_number: 2,
        question_number: 4,
        occurrence_index: 1,
      }),
      "released.pdf",
      { sourceVersion }
    );
    expect("error" in result).toBe(false);
    if ("error" in result) throw new Error(result.error);
    expect(result.input).toMatchObject({
      difficulty: 7,
      source_version: sourceVersion,
      source_provider: "box",
      source_document_id: "synthetic-document",
      source_provider_version_id: "synthetic-provider-version",
      source_section: "math",
      source_module: "M2",
      source_question_number: 4,
      source_occurrence: 1,
      source_identity_required: true,
    });
  });

  it.each([1, 2, 3, 4, 5, 6, 7])(
    "retains D level %i and evidence without rewriting source/history",
    (level) => {
      const original = row({ difficulty_level: level });
      const snapshot = JSON.stringify(original);
      const result = rowToReviewedImportInput(original, "released.pdf");
      expect("error" in result).toBe(false);
      if ("error" in result) throw new Error(result.error);
      expect(result.input.difficulty).toBe(level);
      expect(result.input.concept_slug).toBe(original.concept_slug);
      expect(result.input.source_pdf).toBe("released.pdf");
      expect(result.assessment.difficulty_level).toBe(level);
      expect(result.assessment.difficulty_solution_sha256).toBe(
        original.difficulty_solution_sha256
      );
      expect(JSON.stringify(original)).toBe(snapshot);
    }
  );

  it.each([undefined, null, "", "4", 0, 8, 2.5, "mastery", NaN, Infinity])(
    "rejects invalid D numeric rating %s",
    (level) => {
      expect(validateReviewedDifficulty(row({ difficulty_level: level })).ok).toBe(false);
    }
  );

  it.each([
    ["difficulty_rationale", " "],
    ["difficulty_confidence", undefined],
    ["difficulty_confidence", -0.1],
    ["difficulty_confidence", 1.1],
    ["difficulty_rubric_version", "unknown"],
    ["difficulty_solution_sha256", ""],
    ["difficulty_content_sha256", "not-a-hash"],
  ])("holds incomplete evidence %s", (field, value) => {
    const result = rowToReviewedImportInput(row({ [field as string]: value }), "released.pdf");
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toMatch(/needs review/);
  });

  it("does not recover a missing numeric rating from a supplied legacy band", () => {
    const result = rowToReviewedImportInput(row({ difficulty_level: undefined }), "released.pdf");
    expect("error" in result).toBe(true);
  });

  it.each([
    ["difficulty_uncertain", true],
    ["skill_uncertain", true],
    ["difficulty_selectable_for_downstream", false],
    ["skill_selectable_for_downstream", false],
    ["source_exam_readiness_withdrawn", true],
    ["source_quality_hold", true],
    ["current_version", false],
  ])("preserves the %s hold at the importer boundary", (field, value) => {
    expect(
      "error" in rowToReviewedImportInput(row({ [field as string]: value }), "released.pdf")
    ).toBe(true);
  });

  it("allows preview-only dry-run validation but prevents write-path normalization", () => {
    const preview = row({ website_import_ready: false });
    expect("error" in rowToReviewedImportInput(preview, "released.pdf")).toBe(true);
    expect(
      "error" in rowToReviewedImportInput(preview, "released.pdf", { allowPreview: true })
    ).toBe(false);
  });
});

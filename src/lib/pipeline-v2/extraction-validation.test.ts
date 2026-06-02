// @vitest-environment node
//
// Unit tests for the Stage 1 post-extraction validator
// (scripts/lib/extraction-validation.mjs). Kimi JSON-object mode does
// not enforce enums/schema/taxonomy, so this code is the real guard:
// it computes a full report, flags rows with obvious row-level problems
// needs_review, and surfaces aggregate problems (low counts, missing
// question numbers) as warnings — without ever fabricating or deleting
// rows.
//
// Pure tests, no IO (the validator takes plain row objects).

import { describe, expect, it } from "vitest";
import {
  validateExtraction,
  flagRowsNeedingReview,
  formatValidationReport,
  deriveTopicClusters,
} from "../../../scripts/lib/extraction-validation.mjs";

// A fully-valid Math multiple-choice row using real canonical taxonomy
// values (domain algebra → cluster "Algebra", a real concept slug).
function mathRow(overrides: Record<string, unknown> = {}) {
  const row = {
    extraction_order: 1,
    section: "math",
    module_number: 1,
    question_number: 1,
    question_number_visible: "1",
    question_text: "Solve for x.",
    choice_a: "1",
    choice_b: "2",
    choice_c: "3",
    choice_d: "4",
    correct_answer: "B",
    difficulty: 3,
    topic_cluster: "Algebra",
    passage: "",
    passage_intro: "",
    passage_a: "",
    passage_b: "",
    question_format: "multiple_choice",
    numeric_tolerance: "",
    domain: "algebra",
    concept_slug: "linear-equations-one-variable",
    answer_source: "extracted",
    source_page: 1,
    has_figure: false,
    figure_alt: "",
    import_status: "ok",
    import_flag_reason: "",
    ...overrides,
  };
  // Keep the visible number in sync with question_number unless a test
  // sets it explicitly (the mismatch test does), so overriding only
  // question_number doesn't trip the visible-mismatch check.
  if (overrides.question_number_visible === undefined) {
    row.question_number_visible = String(row.question_number);
  }
  return row;
}

const issueArrays = (report: ReturnType<typeof validateExtraction>) =>
  Object.entries(report.issues).filter(([, v]) => Array.isArray(v) && v.length > 0);

describe("validateExtraction — metrics", () => {
  it("counts totals, sections, formats, and modules", () => {
    const rows = [
      mathRow({ extraction_order: 1, question_number: 1 }),
      mathRow({
        extraction_order: 2,
        question_number: 2,
        question_format: "numeric_entry",
        choice_a: "",
        choice_b: "",
        choice_c: "",
        choice_d: "",
      }),
      mathRow({ extraction_order: 3, question_number: 3, section: "math", module_number: 2 }),
    ];
    const { metrics } = validateExtraction(rows);
    expect(metrics.total_questions).toBe(3);
    expect(metrics.math_count).toBe(3);
    expect(metrics.rw_count).toBe(0);
    expect(metrics.multiple_choice_count).toBe(2);
    expect(metrics.numeric_entry_count).toBe(1);
    expect(metrics.module_counts["math|1"]).toBe(2);
    expect(metrics.module_counts["math|2"]).toBe(1);
  });
});

describe("validateExtraction — clean rows produce no row-level issues", () => {
  it("flags nothing for fully-valid rows", () => {
    const rows = [
      mathRow({ extraction_order: 1, question_number: 1 }),
      mathRow({ extraction_order: 2, question_number: 2 }),
    ];
    const report = validateExtraction(rows);
    expect(report.rowsToFlag).toHaveLength(0);
    expect(issueArrays(report)).toHaveLength(0);
  });
});

describe("validateExtraction — invalid enums and slugs are caught + flagged", () => {
  it("catches invalid domain / topic_cluster / concept_slug / format / answer_source / import_status", () => {
    const rows = [
      mathRow({ domain: "not_a_domain" }),
      mathRow({ topic_cluster: "Not A Cluster" }),
      mathRow({ concept_slug: "made-up-slug" }),
      mathRow({ question_format: "essay" }),
      mathRow({ answer_source: "guessed" }),
      mathRow({ import_status: "active" }),
    ];
    const r = validateExtraction(rows);
    expect(r.issues.invalid_domains).toHaveLength(1);
    expect(r.issues.invalid_topic_clusters).toHaveLength(1);
    expect(r.issues.invalid_concept_slugs).toHaveLength(1);
    expect(r.issues.invalid_question_formats).toHaveLength(1);
    expect(r.issues.invalid_answer_sources).toHaveLength(1);
    expect(r.issues.invalid_import_statuses).toHaveLength(1);
    // every one maps obviously to its row → all flagged
    expect(r.rowsToFlag).toHaveLength(6);
  });
});

describe("validateExtraction — choice / passage / answer / page rules", () => {
  it("flags a multiple-choice row missing a choice", () => {
    const r = validateExtraction([mathRow({ choice_d: "" })]);
    expect(r.issues.missing_choices_for_multiple_choice).toHaveLength(1);
  });

  it("flags a numeric-entry row that still carries choices", () => {
    const r = validateExtraction([mathRow({ question_format: "numeric_entry", choice_a: "x" })]);
    expect(r.issues.choices_present_for_numeric_entry).toHaveLength(1);
  });

  it("flags a Reading & Writing row with no passage", () => {
    const r = validateExtraction([
      mathRow({
        section: "reading_writing",
        domain: "info_ideas",
        topic_cluster: "Information & Ideas",
        concept_slug: "central-ideas-and-details",
        passage: "",
      }),
    ]);
    expect(r.issues.empty_rw_passage).toHaveLength(1);
  });

  it("flags a Math row that carries passage text", () => {
    const r = validateExtraction([mathRow({ passage: "stray passage on a math row" })]);
    expect(r.issues.math_passage_not_empty).toHaveLength(1);
  });

  it("flags passage duplicated into question_text", () => {
    const passage =
      "The Apollo Moon landings left detectors and produced large amounts of data for study.";
    const r = validateExtraction([
      mathRow({
        section: "reading_writing",
        domain: "info_ideas",
        topic_cluster: "Information & Ideas",
        concept_slug: "central-ideas-and-details",
        passage,
        question_text: `${passage} Which choice completes the text?`,
      }),
    ]);
    expect(r.issues.passage_duplicated_in_question_text).toHaveLength(1);
  });

  it("flags a missing correct_answer and an invalid source_page", () => {
    const r = validateExtraction([mathRow({ correct_answer: "", source_page: 0 })]);
    expect(r.issues.missing_correct_answer).toHaveLength(1);
    expect(r.issues.invalid_source_page).toHaveLength(1);
  });

  it("flags a question_number that does not match question_number_visible", () => {
    // The smoke caught the model using a global running count (qnum 28,
    // visible "1") instead of restarting per module. This is the guard.
    const r = validateExtraction([mathRow({ question_number: 28, question_number_visible: "1" })]);
    expect(r.issues.question_number_visible_mismatch).toHaveLength(1);
    expect(r.rowsToFlag[0].reasons).toContain("question_number_visible_mismatch");
  });

  it("does not flag when question_number matches question_number_visible", () => {
    const r = validateExtraction([mathRow({ question_number: 7, question_number_visible: "7" })]);
    expect(r.issues.question_number_visible_mismatch).toHaveLength(0);
  });

  it("flags a reading_writing row carrying a math domain (data_analysis)", () => {
    // The smoke caught R&W command-of-evidence questions ("uses data from
    // the table") mislabeled domain=data_analysis. section must match the
    // domain's subject.
    const r = validateExtraction([
      mathRow({
        section: "reading_writing",
        domain: "data_analysis",
        topic_cluster: "Problem-Solving & Data Analysis",
        passage: "A table of values.",
      }),
    ]);
    expect(r.issues.section_domain_mismatch).toHaveLength(1);
    expect(r.rowsToFlag[0].reasons).toContain("section_domain_mismatch");
  });

  it("does not flag when section and domain agree", () => {
    const mathOk = validateExtraction([mathRow({ section: "math", domain: "algebra" })]);
    const rwOk = validateExtraction([
      mathRow({
        section: "reading_writing",
        domain: "conventions",
        topic_cluster: "Standard English Conventions",
        passage: "Some stimulus.",
      }),
    ]);
    expect(mathOk.issues.section_domain_mismatch).toHaveLength(0);
    expect(rwOk.issues.section_domain_mismatch).toHaveLength(0);
  });
});

describe("validateExtraction — aggregate warnings (no row mutation)", () => {
  it("reports missing question numbers per module (the math-tail case)", () => {
    const rows = Array.from({ length: 19 }, (_, i) =>
      mathRow({ extraction_order: i + 1, question_number: i + 1 })
    );
    const r = validateExtraction(rows);
    // Math module 1 expects 22; we have 1..19 → 20,21,22 missing.
    expect(r.issues.missing_question_numbers_by_section_module["math|1"]).toEqual([20, 21, 22]);
    // ...as an aggregate problem, not a per-row flag.
    expect(r.rowsToFlag).toHaveLength(0);
    expect(r.warnings.some((w) => w.includes("missing question numbers: 20, 21, 22"))).toBe(true);
  });

  it("reports duplicate question numbers", () => {
    const rows = [
      mathRow({ extraction_order: 1, question_number: 5 }),
      mathRow({ extraction_order: 2, question_number: 5 }),
    ];
    const r = validateExtraction(rows);
    expect(r.issues.duplicate_question_numbers_by_section_module["math|1"]).toEqual([5]);
  });

  it("warns on low total / math counts and zero numeric-entry", () => {
    const r = validateExtraction([mathRow()]);
    expect(r.warnings.some((w) => w.startsWith("total="))).toBe(true);
    expect(r.warnings.some((w) => w.includes("numeric_entry_count = 0"))).toBe(true);
  });

  it("warns when extraction_order is not a 1..N sequence", () => {
    const rows = [mathRow({ extraction_order: 1 }), mathRow({ extraction_order: 5 })];
    const r = validateExtraction(rows);
    expect(r.warnings.some((w) => w.includes("extraction_order is not a unique"))).toBe(true);
  });
});

describe("flagRowsNeedingReview — mutates only flagged rows, preserves model reasons", () => {
  it("sets needs_review + appends validation reasons, counting new flags", () => {
    const rows = [mathRow({ domain: "bogus" }), mathRow()];
    const report = validateExtraction(rows);
    const flagged = flagRowsNeedingReview(rows, report);
    expect(flagged).toBe(1);
    expect(rows[0].import_status).toBe("needs_review");
    expect(rows[0].import_flag_reason).toContain("validation:invalid_domain");
    // clean row untouched
    expect(rows[1].import_status).toBe("ok");
  });

  it("preserves a reason the model already supplied", () => {
    const rows = [
      mathRow({
        concept_slug: "bogus",
        import_status: "needs_review",
        import_flag_reason: "uncertain_required_visual",
      }),
    ];
    const report = validateExtraction(rows);
    const flagged = flagRowsNeedingReview(rows, report);
    // already needs_review → not a NEW flag
    expect(flagged).toBe(0);
    expect(rows[0].import_flag_reason).toContain("uncertain_required_visual");
    expect(rows[0].import_flag_reason).toContain("validation:invalid_concept_slug");
  });

  it("never deletes or adds rows", () => {
    const rows = [mathRow({ domain: "bogus" }), mathRow()];
    const before = rows.length;
    flagRowsNeedingReview(rows, validateExtraction(rows));
    expect(rows).toHaveLength(before);
  });
});

describe("formatValidationReport", () => {
  it("renders a multi-line summary string", () => {
    const out = formatValidationReport(validateExtraction([mathRow()]));
    expect(typeof out).toBe("string");
    expect(out).toMatch(/counts: total=1/);
    expect(out).toMatch(/rows to flag needs_review:/);
  });
});

describe("deriveTopicClusters — topic_cluster is derived from domain", () => {
  it("overwrites a wrong topic_cluster with the canonical one for the domain", () => {
    // The smoke caught the model emitting granular skill names here.
    const rows = [mathRow({ domain: "info_ideas", topic_cluster: "Vocabulary in Context" })];
    const changed = deriveTopicClusters(rows);
    expect(changed).toBe(1);
    expect(rows[0].topic_cluster).toBe("Information & Ideas");
    // ...and the validator now sees it as valid.
    expect(validateExtraction(rows).issues.invalid_topic_clusters).toHaveLength(0);
  });

  it("does not change a row whose topic_cluster is already canonical", () => {
    const rows = [mathRow({ domain: "algebra", topic_cluster: "Algebra" })];
    expect(deriveTopicClusters(rows)).toBe(0);
  });

  it("leaves a row with an invalid domain untouched (validator flags it)", () => {
    const rows = [mathRow({ domain: "not_a_domain", topic_cluster: "whatever" })];
    expect(deriveTopicClusters(rows)).toBe(0);
    expect(rows[0].topic_cluster).toBe("whatever");
  });
});

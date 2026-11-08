// ============================================================
// Unit tests for the versioned catalog topic gate the publish gate
// runs (scripts/lib/catalog-topic-validation.mjs). Split out of
// publish-gate-logic.test.ts to keep that file under 700 lines.
// ============================================================

import { describe, it, expect } from "vitest";
import { verifiedCatalogTopic } from "../../../scripts/lib/catalog-topic-validation.mjs";

describe("versioned catalog topic gate", () => {
  const packageHash = "b".repeat(64);
  const studentHash = "c".repeat(64);
  const question = {
    subject: "math",
    domain: "algebra",
    topic_cluster: "Algebra",
    source_version: "a".repeat(64),
    source_section: "math",
    source_module: "M1",
    source_question_number: 2,
  };
  const evidence = {
    question_id: "2025-09_US_V1_MATH_M1_Q02",
    B_package_sha256: packageHash,
    B_student_sha256: studentHash,
    source_pdf_sha256: question.source_version,
    student_publication_allowed: true,
    D_original_record: {
      stable_question_id: "2025-09_US_V1_MATH_M1_Q02",
      content_sha256: packageHash,
      selectable_skill: "Linear equations in one variable",
      uncertain: false,
      selectable_for_downstream: true,
    },
    approved_tags: {
      schema_version: 1,
      stable_question_id: "2025-09_US_V1_MATH_M1_Q02",
      catalog_skill_id: "ma-skill-linear-equations-in-one-variable",
      catalog_domain_id: "algebra",
      domain_label: "Algebra",
      skill_label: "Linear equations in one variable",
      tag_binding_manifest_sha256: "d".repeat(64),
      pilot_row_sha256: "e".repeat(64),
      content_sha256: packageHash,
      student_content_sha256: studentHash,
      question_payload_sha256: "f".repeat(64),
    },
  };
  it("accepts only a publication-sealed exact catalog topic", () => {
    expect(verifiedCatalogTopic(question, evidence)).toBe(true);
    expect(
      verifiedCatalogTopic(question, { ...evidence, student_publication_allowed: false })
    ).toBe(false);
    expect(verifiedCatalogTopic({ ...question, source_question_number: 3 }, evidence)).toBe(false);
    expect(verifiedCatalogTopic(question, { ...evidence, B_student_sha256: "0".repeat(64) })).toBe(
      false
    );
  });
});

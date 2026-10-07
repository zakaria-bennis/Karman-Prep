// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { bindApprovedPrivatePilotTags } from "../../../scripts/pdf-pipeline/approved-tag-binding";
import { canonicalJson, sha256Hex } from "../../../scripts/pdf-pipeline/reviewed-input-hash";

const enc = new TextEncoder();
const taxonomyBytes = readFileSync(resolve("src/data/curriculum/approved-skill-taxonomy.json"));
const original = {
  stable_question_id: "synthetic-math-m1-q1",
  question_text: "What is 2 + 3?",
  correct_answer: "5",
  domain: "algebra",
  concept_slug: null,
  difficulty_content_sha256: "b".repeat(64),
  reviewed_answer: {
    kind: "official",
    printed_answer: "5",
    independently_verified_answer: "5",
    evidence: {
      B_package_sha256: "a".repeat(64),
      B_student_sha256: "b".repeat(64),
      original_png_sha256: "c".repeat(64),
      D_original_record: {
        domain: "Algebra",
        selectable_skill: "Linear equations in one variable",
        partial_B_output_version: "B-synthetic-v1",
      },
    },
  },
};

function fixture() {
  const batch = {
    local_only: true,
    production_import_allowed: false,
    student_publication_allowed: false,
    questions: [original],
  };
  const batchBytes = enc.encode(JSON.stringify(batch));
  const binding = {
    stable_question_id: original.stable_question_id,
    pilot_row_sha256: sha256Hex(canonicalJson(original)),
    B_output_version: "B-synthetic-v1",
    B_question_content_sha256: "a".repeat(64),
    B_student_content_sha256: "b".repeat(64),
    B_source_png_sha256: "c".repeat(64),
    D_record: {
      domain: "Algebra",
      selectable_skill: "Linear equations in one variable",
      uncertain: false,
      selectable_for_downstream: true,
    },
    approved39_mapping: {
      section: "Math",
      domain: "Algebra",
      D_domain_display_label: "Algebra",
      selectable_skill: "Linear equations in one variable",
      selectable: true,
    },
    verified_import_tags: { domain: "algebra", topic_cluster: "Algebra" },
    source_version_ref: {
      B_output_version: "B-synthetic-v1",
      content_sha256: "a".repeat(64),
      student_content_sha256: "b".repeat(64),
    },
  };
  const manifest = {
    schema_version: "D-private-pilot-tag-binding-manifest-v1",
    inputs: {
      pilot_batch_sha256: sha256Hex(batchBytes),
      pilot_row_count: 1,
      importer_current_approved39_skill_taxonomy_sha256: sha256Hex(taxonomyBytes),
    },
    counts: { verified_domain_topic_cluster_skill_bindings: 1 },
    tag_bindings: [binding],
  };
  const manifestBytes = enc.encode(JSON.stringify(manifest));
  return {
    batchBytes,
    manifestBytes,
    expectedManifestSha256: sha256Hex(manifestBytes),
    approvedTaxonomyBytes: taxonomyBytes,
    batch,
    manifest,
  };
}

describe("approved private-pilot tag binding", () => {
  it("adds exact canonical IDs while preserving original wording and key provenance", () => {
    const rows = bindApprovedPrivatePilotTags(fixture());
    expect(rows).toHaveLength(1);
    expect(rows[0].question_text).toBe(original.question_text);
    expect(rows[0].topic_cluster).toBe("Algebra");
    expect(rows[0].concept_slug).toBeNull();
    expect(rows[0].reviewed_answer).toMatchObject({
      ...original.reviewed_answer,
      evidence: {
        ...original.reviewed_answer.evidence,
        approved_tags: {
          catalog_skill_id: "ma-skill-linear-equations-in-one-variable",
          catalog_domain_id: "algebra",
        },
      },
    });
  });

  it("rejects changed source bytes, D skill, row or taxonomy before any write", () => {
    const valid = fixture();
    const changedBatch = enc.encode(
      JSON.stringify({ ...valid.batch, questions: [{ ...original, question_text: "Changed" }] })
    );
    expect(() => bindApprovedPrivatePilotTags({ ...valid, batchBytes: changedBatch })).toThrow(
      "pilot batch"
    );
    const changedManifest = enc.encode(
      JSON.stringify({
        ...valid.manifest,
        tag_bindings: [
          {
            ...valid.manifest.tag_bindings[0],
            D_record: {
              ...valid.manifest.tag_bindings[0].D_record,
              selectable_skill: "Linear functions",
            },
          },
        ],
      })
    );
    expect(() =>
      bindApprovedPrivatePilotTags({ ...valid, manifestBytes: changedManifest })
    ).toThrow("manifest bytes");
    expect(() =>
      bindApprovedPrivatePilotTags({ ...valid, approvedTaxonomyBytes: enc.encode("changed") })
    ).toThrow("taxonomy");
  });
});

import { describe, expect, it } from "vitest";
import {
  canonicalJson,
  sha256Hex,
  verifyFrozenReviewedInput,
} from "../../../scripts/pdf-pipeline/frozen-reviewed-input";

const enc = new TextEncoder();
const row = {
  stable_question_id: "synthetic-math-m1-q1",
  question_text: "Solve $x^2 = 9$ without changing this wording.",
  choice_a: "$-3$",
  choice_b: "$3$",
  correct_answer: "B",
  domain: "algebra",
  topic_cluster: "Algebra",
  concept_slug: null,
  difficulty_content_sha256: "b".repeat(64),
  reviewed_answer: {
    kind: "official",
    printed_answer: "B",
    independently_verified_answer: "B",
    evidence: {
      B_package_sha256: "a".repeat(64),
      B_student_sha256: "b".repeat(64),
      approved_tags: {
        schema_version: 1,
        stable_question_id: "synthetic-math-m1-q1",
        catalog_skill_id: "ma-skill-linear-equations-in-one-variable",
        catalog_domain_id: "algebra",
        domain_label: "Algebra",
        skill_label: "Linear equations in one variable",
        tag_binding_manifest_sha256: "c".repeat(64),
        pilot_row_sha256: "d".repeat(64),
        content_sha256: "a".repeat(64),
        student_content_sha256: "b".repeat(64),
      },
    },
  },
  source_version: {
    content_sha256: "a".repeat(64),
    student_content_sha256: "b".repeat(64),
  },
};
const pdfBytes = enc.encode("%PDF-synthetic-frozen-source");
function fixture(rows: unknown[] = [row]) {
  const jsonBytes = enc.encode(
    JSON.stringify({ import_policy: "reviewed-difficulty", questions: rows })
  );
  const manifestBytes = enc.encode(
    JSON.stringify({
      schema_version: 1,
      reviewed_json_sha256: sha256Hex(jsonBytes),
      source_pdf_sha256: sha256Hex(pdfBytes),
      rows: rows.map((value) => {
        const current = value as typeof row;
        return {
          stable_question_id: current.stable_question_id,
          row_sha256: sha256Hex(canonicalJson(current)),
          content_sha256: current.source_version.content_sha256,
          student_content_sha256: current.source_version.student_content_sha256,
        };
      }),
    })
  );
  return {
    manifestBytes,
    expectedManifestSha256: sha256Hex(manifestBytes),
    jsonBytes,
    pdfBytes,
    rows,
  };
}

describe("frozen reviewed import input", () => {
  it("hashes equivalent row objects without depending on property order", () => {
    expect(canonicalJson({ b: { y: 1, x: 2 }, a: [3, 4] })).toBe(
      canonicalJson({ a: [3, 4], b: { x: 2, y: 1 } })
    );
  });

  it("accepts exact bytes, current row content and source version hashes", () => {
    expect(verifyFrozenReviewedInput(fixture())).toEqual({ ok: true, verifiedRows: 1 });
  });

  it("rejects edited manifest, JSON, PDF, row content or source version before writing", () => {
    const valid = fixture();
    for (const changed of [
      { ...valid, manifestBytes: enc.encode(`${new TextDecoder().decode(valid.manifestBytes)} `) },
      { ...valid, jsonBytes: enc.encode(`${new TextDecoder().decode(valid.jsonBytes)} `) },
      { ...valid, pdfBytes: enc.encode("%PDF-synthetic-replaced-source") },
      { ...valid, rows: [{ ...row, choice_b: "$-3$" }] },
      {
        ...valid,
        rows: [
          {
            ...row,
            source_version: { ...row.source_version, content_sha256: "c".repeat(64) },
          },
        ],
      },
    ]) {
      expect(verifyFrozenReviewedInput(changed)).toMatchObject({ ok: false });
    }
  });

  it("rejects a manifest regenerated from altered content when its approved hash stays pinned", () => {
    const approved = fixture();
    const altered = fixture([{ ...row, question_text: "Solve a different equation." }]);
    expect(
      verifyFrozenReviewedInput({
        ...altered,
        expectedManifestSha256: approved.expectedManifestSha256,
      })
    ).toMatchObject({ ok: false, error: expect.stringContaining("manifest bytes differ") });
  });

  it("rejects duplicate stable identities even when all hashes match", () => {
    expect(verifyFrozenReviewedInput(fixture([row, row]))).toMatchObject({
      ok: false,
      error: expect.stringContaining("identity differs or repeats"),
    });
  });

  it("holds absent or conflicting approved tags and stale D content bindings", () => {
    expect(
      verifyFrozenReviewedInput(
        fixture([{ ...row, reviewed_answer: { ...row.reviewed_answer, evidence: {} } }])
      )
    ).toMatchObject({
      ok: false,
      error: expect.stringContaining("approved tag evidence"),
    });
    expect(verifyFrozenReviewedInput(fixture([{ ...row, topic_cluster: "Wrong" }]))).toMatchObject({
      ok: false,
      error: expect.stringContaining("catalog skill/domain/topic"),
    });
    expect(
      verifyFrozenReviewedInput(
        fixture([{ ...row, concept_slug: "linear-equations-one-variable" }])
      )
    ).toMatchObject({
      ok: true,
    });
    expect(
      verifyFrozenReviewedInput(fixture([{ ...row, concept_slug: "rhetorical-synthesis" }]))
    ).toMatchObject({
      ok: false,
      error: expect.stringContaining("legacy concept link"),
    });
    expect(
      verifyFrozenReviewedInput(fixture([{ ...row, difficulty_content_sha256: "c".repeat(64) }]))
    ).toMatchObject({ ok: false, error: expect.stringContaining("approved tag evidence differs") });
  });
});

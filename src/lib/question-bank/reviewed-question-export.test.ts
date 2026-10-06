// @vitest-environment node
import { describe, expect, it } from "vitest";
import { prepareReviewedQuestionExport } from "./reviewed-question-export";
import { adaptAgentDDifficulty } from "./agent-d-difficulty";
import {
  AGENT_D_DIFFICULTY_RUBRIC_VERSION,
  REVIEWED_DIFFICULTY_RUBRIC_VERSION,
} from "./reviewed-difficulty";

const hash = (letter: string) => letter.repeat(64);
function fixture(level = 4) {
  const source = {
    B_output_version: "B-final",
    B_manifest_sha256: hash("a"),
    B_final_version_sha256: hash("b"),
    content_sha256: hash("c"),
    student_content_sha256: hash("d"),
  };
  const record = {
    stable_question_id: "exam-m1-q1",
    D_output_version: "D-final",
    D_classifications_sha256: hash("f"),
    content_sha256: source.content_sha256,
    difficulty_level: level,
    difficulty_rationale: "  Multi-step setup.  ",
    difficulty_confidence: 0.9,
    difficulty_rubric_version: REVIEWED_DIFFICULTY_RUBRIC_VERSION,
    D_difficulty_rubric_version: AGENT_D_DIFFICULTY_RUBRIC_VERSION,
    difficulty_solution_sha256: hash("e"),
    difficulty_content_sha256: source.student_content_sha256,
    difficulty_uncertain: false,
    skill_uncertain: false,
    difficulty_selectable_for_downstream: true,
    skill_selectable_for_downstream: true,
    source_exam_readiness_withdrawn: false,
    website_import_ready: false,
    source_version: source,
    untouched_history: { previous_versions: ["D-old"], previous_rating: 2 },
  };
  const candidate = {
    identity: {
      stable_question_id: record.stable_question_id,
      D_output_version: record.D_output_version,
      D_classifications_sha256: record.D_classifications_sha256,
      source_version: source,
      accepted_solution_sha256: record.difficulty_solution_sha256,
      source_quality_hold: false,
      current_version: true,
    },
    website_row: {
      question_text: "Solve x + 2 = 5.",
      correct_answer: "3",
      domain: "algebra",
      question_format: "numeric_entry",
      concept_slug: "linear-equations-one-variable",
      difficulty: "mastery",
      website_import_ready: true,
    },
  };
  return { record, candidate };
}

describe("lossless actual D engineering adapter and local export", () => {
  it.each([1, 2, 3, 4, 5, 6, 7])(
    "exports level %i unchanged, preserving all source evidence and preview hold",
    (level) => {
      const { record, candidate } = fixture(level);
      const before = JSON.stringify({ record, candidate });
      const output = prepareReviewedQuestionExport([candidate], [record], "released.pdf");
      const question = output.export.questions[0];
      expect(question.difficulty_level).toBe(level);
      expect(question.difficulty).toBe(level);
      expect(question.difficulty_rationale).toBe(record.difficulty_rationale);
      expect(question.difficulty_confidence).toBe(record.difficulty_confidence);
      expect(question.website_import_ready).toBe(false);
      expect(question.source_version).toEqual(record.source_version);
      expect(question.difficulty_content_sha256).toBe(record.source_version.student_content_sha256);
      expect(output.audit.assessments[0].original_D_record).toEqual(record);
      expect(output.audit.assessments[0].original_website_row).toEqual(candidate.website_row);
      expect(JSON.stringify({ record, candidate })).toBe(before);
      expect(output.export.import_policy).toBe("reviewed-difficulty");
    }
  );

  it.each([
    "B_output_version",
    "B_manifest_sha256",
    "B_final_version_sha256",
    "content_sha256",
    "student_content_sha256",
  ])("rejects stale %s rather than using an older rating", (key) => {
    const { record, candidate } = fixture();
    const changed = {
      ...candidate.identity,
      source_version: {
        ...candidate.identity.source_version,
        [key]: key === "B_output_version" ? "B-new" : hash("0"),
      },
    };
    expect(() => adaptAgentDDifficulty(record, changed)).toThrow(/version mismatch/);
  });

  it.each([
    ["difficulty_uncertain", true],
    ["skill_uncertain", true],
    ["difficulty_selectable_for_downstream", false],
    ["skill_selectable_for_downstream", false],
    ["source_exam_readiness_withdrawn", true],
    ["website_import_ready", true],
    ["difficulty_solution_sha256", hash("0")],
    ["difficulty_content_sha256", hash("0")],
    ["content_sha256", hash("0")],
    ["difficulty_level", "4"],
    ["D_output_version", "D-old"],
    ["D_classifications_sha256", hash("0")],
    ["stable_question_id", "other-question"],
  ])("holds conflicting or blocked D field %s", (field, value) => {
    const { record, candidate } = fixture();
    expect(() =>
      adaptAgentDDifficulty({ ...record, [field as string]: value }, candidate.identity)
    ).toThrow();
  });

  it.each([
    ["source_quality_hold", true],
    ["current_version", false],
  ])("requires explicit cleared %s in the approved source identity", (field, value) => {
    const { record, candidate } = fixture();
    expect(() =>
      adaptAgentDDifficulty(record, { ...candidate.identity, [field as string]: value })
    ).toThrow();
  });

  it("rejects duplicate identities and a missing assessment", () => {
    const { record, candidate } = fixture();
    expect(() =>
      prepareReviewedQuestionExport([candidate], [record, record], "released.pdf")
    ).toThrow(/Duplicate D/);
    expect(() =>
      prepareReviewedQuestionExport([candidate, candidate], [record], "released.pdf")
    ).toThrow(/Duplicate website/);
    expect(() => prepareReviewedQuestionExport([candidate], [], "released.pdf")).toThrow(
      /Missing D/
    );
  });

  it("fails the entire export if a later candidate is held", () => {
    const { record, candidate } = fixture();
    expect(() =>
      prepareReviewedQuestionExport(
        [
          candidate,
          {
            ...candidate,
            identity: { ...candidate.identity, stable_question_id: "held-question" },
          },
        ],
        [record, { ...record, stable_question_id: "held-question", difficulty_uncertain: true }],
        "released.pdf"
      )
    ).toThrow(/needs review/);
  });
});

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { evaluateQuizAnswer, prepareQuizSession } from "@/lib/quiz-session";
import {
  numericAnswerSetFromEvidence,
  reviewedNumericAnswers,
  validateNumericImport,
} from "@/lib/question-bank/numeric-answer-set";
import { canonicalEvidence, importAnswerEvidence } from "@/lib/question-bank/import-provenance";
import { toStudentQuizQuestion } from "@/lib/student-quiz-payload";
import type { ImportQuestionInput } from "@/lib/question-bank/import-core";
import type { QuestionResponse, QuizQuestionWithChoices } from "@/types/quiz";

// Frozen Q252 source bytes and evidence identifiers from Q252-reviewed-private-input.json.
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const binding = {
  question_text: "252. |8 - x| = 2\nWhat is a possible solution to the given equation?",
  raw_question_text: "252. |8 − x| = 2\nWhat is a possible solution to the given equation?",
  correct_answer: "6",
  answer_format: "numeric_entry",
  source_version: "30cc368f1eb76e55a772a782edd4d08b9859b08cb7ff6c3024ab5cccb8ffdb7c",
  source_section: "math",
  source_module: "M1",
  source_question_number: 252,
  source_occurrence: 55,
};
const set = {
  version: 1,
  answers: ["6", "10"],
  question_text_sha256: "a65f0fd0304d0d0e2acd4e3f641421f3d2c69a5b79a79f909e6f3ca145235567",
  raw_question_text_sha256: "acf52712ece45159713e7fc4e2e9a34089c6c4099e4fd5dcd502cd859f0acd4a",
  source_version: binding.source_version,
  source_section: "math",
  source_module: "M1",
  source_question_number: 252,
  source_occurrence: 55,
  answer_key_artifact_sha256: "c6ab8268c2d617b2590df7ecfc30e0fb0eae603fbff4c1324964de15d3f313f4",
  independent_review_sha256s: [sha("branch review"), sha("substitution review")],
  rationale: "Exhaustive branches and substitution confirm both roots.",
};
const reviewed = {
  kind: "independently_confirmed_generated" as const,
  printed_answer: null,
  independently_verified_answer: "6",
  generated_key_artifact_sha256: set.answer_key_artifact_sha256,
  independent_review_sha256s: set.independent_review_sha256s,
  evidence: { numeric_answer_set: set },
};
const row = {
  ...binding,
  question_format: "numeric_entry",
  domain: "algebra",
  reviewed_answer: reviewed,
} as ImportQuestionInput;
function question(value: unknown = set): QuizQuestionWithChoices {
  return {
    ...binding,
    id: "q252",
    node_id: "qa-only",
    answer_choices: [],
    numeric_tolerance: 0,
    difficulty_level: 1,
    difficulty: "foundational",
    display_order: 1,
    reviewed_numeric_answers: reviewedNumericAnswers(binding, value),
  } as unknown as QuizQuestionWithChoices;
}

describe("independent Q252 numeric answer-set acceptance", () => {
  it("binds actual displayed/raw source bytes and retains the generated key without an official mapping", () => {
    expect(sha(binding.question_text)).toBe(set.question_text_sha256);
    expect(sha(binding.raw_question_text)).toBe(set.raw_question_text_sha256);
    expect(validateNumericImport(row)).toEqual([]);
    expect(importAnswerEvidence(row)).toMatchObject({
      printed_answer: null,
      official_answer_available: false,
    });
    expect(row.correct_answer).toBe("6");
    expect(
      reviewedNumericAnswers(binding, numericAnswerSetFromEvidence(importAnswerEvidence(row)))
    ).toEqual(["6", "10"]);
  });

  it.each(["6", "10", "12/2", "20/2", "6.0", "10.0"])("accepts equivalent answer %s", (answer) => {
    expect(evaluateQuizAnswer(answer, question())).toBe(true);
  });
  it.each(["8", "6 or 10", "10 cm", "1/0", "1e1", "0xA", "Infinity"])(
    "rejects wrong or invalid answer %s",
    (answer) => {
      expect(evaluateQuizAnswer(answer, question())).toBe(false);
    }
  );
  it("keeps single-key behavior when no reviewed set exists and hides keys at start", () => {
    const legacy = { ...question(), reviewed_numeric_answers: undefined };
    expect(evaluateQuizAnswer("6", legacy)).toBe(true);
    expect(evaluateQuizAnswer("10", legacy)).toBe(false);
    const start = toStudentQuizQuestion(question());
    expect(JSON.stringify(start)).not.toMatch(
      /reviewed_numeric_answers|correct_answer|answer_key_artifact|independent_review/
    );
  });
  it.each([
    [{ question_text: "changed" }, set],
    [{ raw_question_text: "changed" }, set],
    [{ source_version: sha("different PDF") }, set],
    [{ source_module: "M2" }, set],
    [{ source_question_number: 253 }, set],
    [{ source_occurrence: 56 }, set],
    [binding, { ...set, answer_key_artifact_sha256: "bad" }],
    [binding, { ...set, answers: ["6", "12/2"] }],
    [binding, { ...set, independent_review_sha256s: [sha("same"), sha("same")] }],
    [binding, null],
  ])("holds stale or malformed provenance %#", (changedBinding, changedSet) => {
    expect(() => reviewedNumericAnswers({ ...binding, ...changedBinding }, changedSet)).toThrow();
  });
  it("conflicts on a changed reviewed set during exact private import replay", () => {
    const stored = importAnswerEvidence(row);
    expect(canonicalEvidence(stored)).toBe(canonicalEvidence(importAnswerEvidence({ ...row })));
    const changed = {
      ...row,
      reviewed_answer: {
        ...reviewed,
        evidence: { numeric_answer_set: { ...set, answers: ["6", "10.0"] } },
      },
    } as ImportQuestionInput;
    expect(validateNumericImport(changed)).toEqual([]);
    expect(canonicalEvidence(importAnswerEvidence(changed))).not.toBe(canonicalEvidence(stored));
  });
  it("preserves saved historical answer and score when preparing a resumed session", () => {
    const saved = [
      { question_id: "q252", student_answer: "10", is_correct: false },
    ] as QuestionResponse[];
    const resumed = prepareQuizSession([question()], saved);
    expect(resumed.responses).toEqual(saved);
    expect(resumed.responses[0].student_answer).toBe("10");
    expect(resumed.responses[0].is_correct).toBe(false);
    expect(evaluateQuizAnswer("10", question())).toBe(true);
  });
});

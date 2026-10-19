import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { evaluateQuizAnswer } from "@/lib/quiz-session";
import { toStudentQuizQuestion } from "@/lib/student-quiz-payload";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import {
  numericAnswerSetFromEvidence,
  reviewedNumericAnswers,
  validateNumericImport,
} from "./numeric-answer-set";
import { importAnswerEvidence } from "./import-provenance";
import type { ImportQuestionInput } from "./import-core";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const binding = {
  question_text: "What is a possible solution of |8-x|=2?",
  raw_question_text: "What is a possible solution of |8-x|=2?",
  answer_format: "numeric_entry",
  correct_answer: "6",
  source_version: hash("synthetic source PDF"),
  source_section: "math",
  source_module: "M1",
  source_question_number: 1,
  source_occurrence: 1,
};
const set = {
  version: 1,
  answers: ["6", "10"],
  question_text_sha256: hash(binding.question_text),
  raw_question_text_sha256: hash(binding.raw_question_text),
  source_version: binding.source_version,
  source_section: "math",
  source_module: "M1",
  source_question_number: 1,
  source_occurrence: 1,
  answer_key_artifact_sha256: hash("synthetic key 6"),
  independent_review_sha256s: [hash("algebra review"), hash("substitution review")],
  rationale: "8-x=2 or 8-x=-2; both 6 and 10 give absolute difference 2.",
};
const row: ImportQuestionInput = {
  ...binding,
  question_format: "numeric_entry",
  domain: "algebra",
  source_section: "math",
  source_module: "M1",
  reviewed_answer: {
    kind: "independently_confirmed_generated",
    printed_answer: null,
    independently_verified_answer: "6",
    generated_key_artifact_sha256: set.answer_key_artifact_sha256,
    independent_review_sha256s: set.independent_review_sha256s,
    evidence: { numeric_answer_set: set },
  },
};
function question(value: unknown = set) {
  return {
    ...binding,
    numeric_tolerance: 0,
    answer_choices: [],
    reviewed_numeric_answers: reviewedNumericAnswers(binding, value),
  } as unknown as QuizQuestionWithChoices;
}

describe("source-bound reviewed numeric answer set", () => {
  it.each(["6", "10", "12/2", "20/2", " 10.0 "])("accepts valid numeric answer %s", (answer) => {
    expect(evaluateQuizAnswer(answer, question())).toBe(true);
  });
  it.each(["8", "2", "-6", "6.1", "", "6 or 10", "10 meters", "1/0", "0xA", "1e1", "Infinity"])(
    "rejects invalid answer %s",
    (answer) => {
      expect(evaluateQuizAnswer(answer, question())).toBe(false);
    }
  );
  it("preserves single-key behavior when no reviewed set is present", () => {
    const q = { ...binding, numeric_tolerance: 0 } as unknown as QuizQuestionWithChoices;
    expect(evaluateQuizAnswer("6", q)).toBe(true);
    expect(evaluateQuizAnswer("10", q)).toBe(false);
  });
  it.each([
    { question_text_sha256: hash("different stem") },
    { raw_question_text_sha256: hash("changed source") },
    { source_version: hash("different PDF") },
    { source_occurrence: 2 },
    { answers: ["10"] },
    { answers: ["6", "12/2"] },
    { independent_review_sha256s: [hash("same"), hash("same")] },
    { answers: ["6", "x"] },
    { rationale: "" },
  ])("holds invalid or stale evidence: %j", (change) => {
    expect(() => question({ ...set, ...change })).toThrow();
  });
  it("fails closed for an explicitly malformed set", () => {
    expect(() => question(null)).toThrow();
  });
  it("retains the independent key and evidence without creating an official key", () => {
    expect(validateNumericImport(row)).toEqual([]);
    const stored = importAnswerEvidence(row);
    expect(stored).toMatchObject({ printed_answer: null, official_answer_available: false });
    expect(reviewedNumericAnswers(binding, numericAnswerSetFromEvidence(stored))).toEqual([
      "6",
      "10",
    ]);
    expect(row.correct_answer).toBe("6");
  });
  it("rejects a numeric set from a different generated key artifact", () => {
    expect(
      validateNumericImport({
        ...row,
        reviewed_answer: {
          ...row.reviewed_answer!,
          evidence: {
            numeric_answer_set: { ...set, answer_key_artifact_sha256: hash("different key") },
          },
        },
      })
    ).not.toEqual([]);
  });
  it("does not disclose accepted answers or review provenance before answering", () => {
    const payload = toStudentQuizQuestion(question());
    expect(payload).not.toHaveProperty("reviewed_numeric_answers");
    expect(JSON.stringify(payload)).not.toMatch(/correct_answer|answer_key|review_sha256/);
  });
});

import { describe, expect, it } from "vitest";
import { DIAGNOSTIC_QUESTIONS } from "@/data/diagnostic-questions";
import { canonicalDiagnosticAnswers } from "./diagnostic-submission";

const valid = () =>
  DIAGNOSTIC_QUESTIONS.map((question) => ({
    questionId: question.id,
    selectedAnswer: question.correct,
  }));

describe("canonical diagnostic submission", () => {
  it("scores against the canonical bank regardless of submitted order", () => {
    const result = canonicalDiagnosticAnswers(valid().reverse());
    expect(result).toHaveLength(35);
    expect(result?.every((answer) => answer.correct)).toBe(true);
    expect(result?.map((answer) => answer.questionId)).toEqual(
      DIAGNOSTIC_QUESTIONS.map((q) => q.id)
    );
  });

  it("does not trust a forged correctness flag", () => {
    const payload: Array<{ questionId: string; selectedAnswer: string; correct: boolean }> =
      valid().map((answer) => ({ ...answer, correct: true }));
    payload[0].selectedAnswer = "?";
    expect(canonicalDiagnosticAnswers(payload)?.[0].correct).toBe(false);
  });

  it("rejects missing, duplicate, and foreign question IDs", () => {
    expect(canonicalDiagnosticAnswers(valid().slice(1))).toBeNull();
    const repeated = valid();
    repeated[0] = repeated[1];
    expect(canonicalDiagnosticAnswers(repeated)).toBeNull();
    const foreign = valid();
    foreign[0] = { questionId: "not-in-bank", selectedAnswer: "A" };
    expect(canonicalDiagnosticAnswers(foreign)).toBeNull();
  });
});

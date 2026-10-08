import { describe, expect, it } from "vitest";
import fixture from "./reviewed-passage.fixture.json";
import { reviewedPassageForQuestion } from "./reviewed-passage";
import { toStudentQuizQuestion } from "@/lib/student-quiz-payload";
import { toQuizReviewContent } from "@/lib/quiz-review-content";
import type { QuizQuestionWithChoices } from "@/types/quiz";

const question = () => structuredClone(fixture) as unknown as QuizQuestionWithChoices;
describe("exact reviewed Petry passage binding", () => {
  it("preserves every original word and the stored row while restoring semantic structure", () => {
    const q = question();
    const before = JSON.stringify(q);
    const display = reviewedPassageForQuestion(q)!;
    expect(
      [display.intro.replace(/<\/?i>/g, ""), display.excerpt, display.copyright].join(" ")
    ).toBe(q.passage);
    expect(display.intro).toContain("<i>The Street</i>");
    expect(JSON.stringify(q)).toBe(before);
  });
  it.each([
    ["id", "another-question"],
    ["source_version", "changed-pdf"],
    ["source_document_id", "different-document"],
    ["source_page", 13],
    ["source_question_number", 9],
    ["passage", fixture.passage + " altered"],
    ["question_text", "Another ask?"],
    ["passage_intro", "Already structured"],
  ])("leaves changed %s untouched", (field, value) => {
    expect(reviewedPassageForQuestion({ ...question(), [field]: value })).toBeUndefined();
  });
  it("rejects changed choices and duplicate labels", () => {
    const q = question();
    q.answer_choices[0].choice_text += " altered";
    expect(reviewedPassageForQuestion(q)).toBeUndefined();
    const duplicate = question();
    duplicate.answer_choices[1] = duplicate.answer_choices[0];
    expect(reviewedPassageForQuestion(duplicate)).toBeUndefined();
  });
  it("adds identical display to practice/review without exposing an unanswered key or source metadata", () => {
    const q = question();
    const start = toStudentQuizQuestion(q);
    expect(start.reviewed_passage).toEqual(toQuizReviewContent(q).reviewed_passage);
    expect(start.passage).toBe(q.passage);
    expect(start.question_text).toBe(q.question_text);
    expect(start).not.toHaveProperty("correct_answer");
    expect(start).not.toHaveProperty("source_version");
    expect(start.answer_choices.every((c) => !("is_correct" in c))).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { approvedCatalogEvidence, catalogQuestion } from "../../../tests/fixtures/approved-catalog";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import { catalogQuestionPayloadHash } from "@/lib/question-bank/catalog-question-scope";
import { buildCatalogDeliverySnapshot, toCatalogStudentQuestion } from "./delivery-contract";

function fixture() {
  const q = catalogQuestion() as unknown as QuizQuestionWithChoices;
  const evidence = approvedCatalogEvidence();
  evidence.approved_tags.question_payload_sha256 = catalogQuestionPayloadHash(q);
  return buildCatalogDeliverySnapshot(q, evidence);
}

describe("frozen answer-free source display projection", () => {
  it("preserves exactly the three reviewed display strings without re-deriving from omitted source metadata", () => {
    const snapshot = fixture();
    const display = {
      intro: "Source <i>title</i>.",
      excerpt: "Exact source excerpt.",
      copyright: "Copyright line",
    };
    snapshot.student.reviewed_passage = display;
    expect("source_document_id" in snapshot.student).toBe(false);
    const delivered = toCatalogStudentQuestion(snapshot);
    expect(delivered.reviewed_passage).toEqual(display);
    expect(delivered.reviewed_passage).not.toBe(display);
    expect("answer" in delivered).toBe(false);
    expect("evidence" in delivered).toBe(false);
    expect("correct_answer" in delivered).toBe(false);
    expect("explanation_text" in delivered).toBe(false);
    expect("binding" in delivered).toBe(false);
    expect(delivered.answer_choices.every((choice) => !("is_correct" in choice))).toBe(true);
  });
  it.each([
    { intro: "Intro", excerpt: "Excerpt", copyright: "Copyright", privateKey: "A" },
    { intro: "Intro", excerpt: 42, copyright: "Copyright" },
    { intro: "Intro", excerpt: "Excerpt" },
    null,
  ])("holds malformed or expanded annotations instead of leaking metadata", (display) => {
    const snapshot = fixture();
    Object.assign(snapshot.student, { reviewed_passage: display });
    expect(() => toCatalogStudentQuestion(snapshot)).toThrow("Saved practice session is invalid");
  });
  it("retains the existing answer-free projection when no annotation was approved", () => {
    const snapshot = fixture();
    const delivered = toCatalogStudentQuestion(snapshot);
    expect(delivered.question_text).toBe(snapshot.student.question_text);
    expect(delivered.reviewed_passage).toBeUndefined();
    expect("correct_answer" in delivered).toBe(false);
  });
});

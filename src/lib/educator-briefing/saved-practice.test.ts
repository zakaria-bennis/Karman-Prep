import { describe, expect, it } from "vitest";
import { presentSavedSession, practiceSummary } from "./saved-practice";
import { saved, response, questionId } from "./fixtures.test-helper";
describe("historical student display projection", () => {
  it("preserves the original answer and version without private keys or explanations", () => {
    const result = presentSavedSession(saved(), [response()]);
    expect(result.questions[0]).toMatchObject({
      question: { id: questionId, question_text: "What is x if x + 2 = 5?" },
      originalAnswer: "B",
      originalCorrect: false,
    });
    expect(JSON.stringify(result)).not.toMatch(
      /PRIVATE_|correct_answer|explanation_text|payloadSha256/
    );
  });
  it("keeps null scores explicit and counts only recorded misses", () => {
    const result = practiceSummary(presentSavedSession(saved({ score: null }), [response()]));
    expect(result.score).toBeNull();
    expect(result.missed).toEqual([
      { ordinal: 0, questionText: "What is x if x + 2 = 5?", originalAnswer: "B" },
    ]);
  });
  it("unanswered practice has no inferred miss or completed result", () => {
    const result = practiceSummary(
      presentSavedSession(saved({ completed_at: null, score: null }), [])
    );
    expect(result).toMatchObject({ answered: 0, total: 1, missed: [], completedAt: null });
  });
  it("does not treat missing completed response data as zero misses", () => {
    expect(() => presentSavedSession(saved(), [])).toThrow("answer details are unavailable");
  });
  it.each([
    { ordinal: 1 },
    { question_id: "77777777-7777-4777-8777-777777777777" },
    { session_id: "77777777-7777-4777-8777-777777777777" },
  ])("rejects mismatched response %s", (changes) => {
    expect(() => presentSavedSession(saved(), [response(changes)])).toThrow();
  });
  it("rejects duplicate response ordinals", () => {
    expect(() => presentSavedSession(saved(), [response(), response()])).toThrow("order");
  });
  it("rejects a snapshot outside the saved skill", () => {
    const s = saved();
    (s.snapshots[0] as { binding: { catalogSkillId: string } }).binding.catalogSkillId =
      "different";
    expect(() => presentSavedSession(s, [response()])).toThrow("binding");
  });
  it("preserves an explicit reviewed passage while stripping private fields", () => {
    const s = saved();
    (s.snapshots[0] as { student: Record<string, unknown> }).student.reviewed_passage = {
      intro: "Synthetic intro",
      excerpt: "Synthetic excerpt",
      copyright: "Synthetic note",
    };
    expect(
      presentSavedSession(s, [response()]).questions[0].question.reviewed_passage
    ).toMatchObject({ excerpt: "Synthetic excerpt" });
  });
});

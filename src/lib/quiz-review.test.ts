import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ attempt: vi.fn(), responses: vi.fn(), questions: vi.fn() }));
vi.mock("@/lib/supabase/queries/quiz/attempts", () => ({
  fetchQuizAttemptForStudent: mocks.attempt,
  fetchResponsesForAttempt: mocks.responses,
}));
vi.mock("@/lib/supabase/queries/quiz/questions", () => ({
  fetchQuestionsForNode: mocks.questions,
}));
import { fetchCompletedQuizReview } from "./quiz-review";
const id = "d07d4da8-1187-4e90-897a-78a5135f4dd6";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.attempt.mockResolvedValue({
    id,
    student_id: "student-owner",
    node_id: "ma-00",
    completed_at: "2026-10-06T12:00:00Z",
  });
  mocks.responses.mockResolvedValue([
    { id: "r1", question_id: "q1", student_answer: "A", is_correct: false },
    { id: "r2", question_id: "withdrawn", student_answer: "3", is_correct: true },
  ]);
  mocks.questions.mockResolvedValue([
    { id: "q1", correct_answer: "B" },
    { id: "unanswered", correct_answer: "C" },
  ]);
});
describe("completed student quiz review", () => {
  it("rejects malformed URLs without database reads", async () => {
    expect(await fetchCompletedQuizReview("student-owner", "not-an-id")).toBeNull();
    expect(mocks.attempt).not.toHaveBeenCalled();
  });
  it.each([
    null,
    { id, student_id: "someone-else", completed_at: "now" },
    { id, student_id: "student-owner", completed_at: null },
  ])(
    "does not reveal questions or keys for inaccessible or active attempts (%j)",
    async (attempt) => {
      mocks.attempt.mockResolvedValue(attempt);
      expect(await fetchCompletedQuizReview("student-owner", id)).toBeNull();
      expect(mocks.responses).not.toHaveBeenCalled();
      expect(mocks.questions).not.toHaveBeenCalled();
    }
  );
  it("scopes the attempt to its owner and limits review to answered, currently published questions", async () => {
    const review = await fetchCompletedQuizReview("student-owner", id);
    expect(mocks.attempt).toHaveBeenCalledExactlyOnceWith(id, "student-owner");
    expect(mocks.questions).toHaveBeenCalledExactlyOnceWith("ma-00");
    expect(review?.items).toHaveLength(2);
    expect(review?.items[0].question?.correct_answer).toBe("B");
    expect(review?.items[1].question).toBeNull();
    expect(review?.items[1].response.is_correct).toBe(true);
    expect(JSON.stringify(review)).not.toContain("unanswered");
  });
  it("propagates a read failure instead of presenting an empty history", async () => {
    mocks.responses.mockRejectedValue(new Error("database unavailable"));
    await expect(fetchCompletedQuizReview("student-owner", id)).rejects.toThrow(
      "database unavailable"
    );
  });
});

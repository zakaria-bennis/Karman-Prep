import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchQuestionsForNode: vi.fn(),
  createQuizAttempt: vi.fn(),
  fetchIncompleteQuizAttempt: vi.fn(),
  fetchResponsesForAttempt: vi.fn(),
  fetchQuizAttemptForStudent: vi.fn(),
  finalizeQuizAttempt: vi.fn(),
  updateNodeAfterQuiz: vi.fn(),
  fetchNodeStatusBundle: vi.fn(),
  recordQuestionResponse: vi.fn(),
}));

vi.mock("@/lib/auth/dev-auth", () => ({
  safeAuth: async () => ({ userId: "dev_seed_student_stuck" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/queries/quiz", () => ({
  ...mocks,
  flagQuestion: vi.fn(),
  updateWatchPercentage: vi.fn(),
}));

import { actionCompleteQuiz, actionRecordResponse, actionStartQuiz } from "./quiz-actions";

beforeEach(() => vi.clearAllMocks());

describe("quiz actions", () => {
  it("does not create an orphan attempt for a node with no approved questions", async () => {
    mocks.fetchQuestionsForNode.mockResolvedValue([]);
    await expect(actionStartQuiz("ma-empty")).rejects.toThrow("no questions");
    expect(mocks.createQuizAttempt).not.toHaveBeenCalled();
  });

  it("resumes a prior incomplete attempt without creating a second one", async () => {
    mocks.fetchQuestionsForNode.mockResolvedValue([{ id: "q1" }]);
    mocks.fetchIncompleteQuizAttempt.mockResolvedValue({ id: "a1" });
    mocks.fetchResponsesForAttempt.mockResolvedValue([{ question_id: "q1" }]);
    await expect(actionStartQuiz("ma-00")).resolves.toMatchObject({
      attemptId: "a1",
      responses: [{ question_id: "q1" }],
    });
    expect(mocks.createQuizAttempt).not.toHaveBeenCalled();
  });

  it("applies node progress once when completion is retried", async () => {
    mocks.fetchQuizAttemptForStudent.mockResolvedValue({ node_id: "ma-00", completed_at: null });
    mocks.fetchQuestionsForNode.mockResolvedValue([
      { id: "q1", difficulty: "foundational", difficulty_level: 1, display_order: 1 },
    ]);
    mocks.fetchResponsesForAttempt.mockResolvedValue([{ question_id: "q1", is_correct: true }]);
    mocks.finalizeQuizAttempt.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    mocks.updateNodeAfterQuiz.mockResolvedValue({ newStatus: "partially_complete" });
    mocks.fetchNodeStatusBundle.mockResolvedValue({ status: "partially_complete" });
    const input = {
      attemptId: "a1",
      nodeId: "ma-00",
      subject: "math" as const,
    };
    await actionCompleteQuiz(input);
    await actionCompleteQuiz(input);
    expect(mocks.finalizeQuizAttempt).toHaveBeenCalledTimes(2);
    expect(mocks.updateNodeAfterQuiz).toHaveBeenCalledTimes(1);
  });

  it("rejects a question outside the approved pool before recording", async () => {
    mocks.fetchQuizAttemptForStudent.mockResolvedValue({ node_id: "ma-00", completed_at: null });
    mocks.fetchQuestionsForNode.mockResolvedValue([{ id: "approved" }]);
    await expect(
      actionRecordResponse({
        attempt_id: "a1",
        question_id: "draft",
        student_answer: "A",
        response_time_seconds: 3,
      })
    ).rejects.toThrow("approved node pool");
    expect(mocks.recordQuestionResponse).not.toHaveBeenCalled();
  });
});

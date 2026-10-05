import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchQuestionsForNode: vi.fn(),
  createQuizAttempt: vi.fn(),
  fetchResponsesForAttempt: vi.fn(),
  fetchQuizAttemptForStudent: vi.fn(),
  completeQuizAttemptAtomic: vi.fn(),
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
  fetchNodeStatusBundle: vi.fn(),
}));

import { actionCompleteQuiz, actionRecordResponse, actionStartQuiz } from "./quiz-actions";

const question = {
  id: "00000000-0000-4000-8000-000000000001",
  node_id: "ma-00",
  question_text: "What is 2 + 2?",
  correct_answer: "B",
  answer_format: "multiple_choice",
  difficulty: "foundational",
  difficulty_level: 1,
  display_order: 1,
  explanation_text: "2 + 2 = 4",
  explanation_per_choice: null,
  numeric_tolerance: null,
  desmos_strategy: "Use a calculator",
  answer_choices: [
    {
      id: "c1",
      question_id: "00000000-0000-4000-8000-000000000001",
      letter: "A",
      choice_text: "3",
      is_correct: false,
    },
    {
      id: "c2",
      question_id: "00000000-0000-4000-8000-000000000001",
      letter: "B",
      choice_text: "4",
      is_correct: true,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetchQuestionsForNode.mockResolvedValue([question]);
  mocks.createQuizAttempt.mockResolvedValue({ id: "00000000-0000-4000-8000-000000000010" });
  mocks.fetchResponsesForAttempt.mockResolvedValue([]);
  mocks.fetchQuizAttemptForStudent.mockResolvedValue({
    id: "00000000-0000-4000-8000-000000000010",
    node_id: "ma-00",
    completed_at: null,
  });
});

describe("quiz actions", () => {
  it("does not create an orphan attempt for a node with no approved questions", async () => {
    mocks.fetchQuestionsForNode.mockResolvedValue([]);
    await expect(actionStartQuiz("ma-89")).rejects.toThrow("no questions");
    expect(mocks.createQuizAttempt).not.toHaveBeenCalled();
  });

  it("sends no key or explanation before answering, and restores review only for saved answers", async () => {
    const fresh = await actionStartQuiz("ma-00");
    expect(JSON.stringify(fresh)).not.toMatch(
      /correct_answer|is_correct|explanation|desmos_strategy/
    );
    mocks.fetchResponsesForAttempt.mockResolvedValue([
      {
        question_id: "00000000-0000-4000-8000-000000000001",
        student_answer: "A",
        is_correct: false,
      },
    ]);
    const resumed = await actionStartQuiz("ma-00");
    expect(resumed.reviews["00000000-0000-4000-8000-000000000001"]).toMatchObject({
      correct_answer: "B",
      studentAnswer: "A",
    });
    expect(resumed.questions[0].answer_choices[1]).not.toHaveProperty("is_correct");
  });

  it("returns the stored first answer's review on retry", async () => {
    mocks.recordQuestionResponse.mockResolvedValue({ student_answer: "B", is_correct: true });
    const review = await actionRecordResponse({
      attempt_id: "00000000-0000-4000-8000-000000000010",
      question_id: "00000000-0000-4000-8000-000000000001",
      student_answer: "A",
      response_time_seconds: 3,
    });
    expect(review).toMatchObject({ isCorrect: true, studentAnswer: "B", correct_answer: "B" });
    expect(mocks.recordQuestionResponse).toHaveBeenCalledWith(
      expect.objectContaining({ student_id: "dev_seed_student_stuck" })
    );
  });

  it("uses one atomic completion call for progress", async () => {
    mocks.fetchResponsesForAttempt.mockResolvedValue([
      { question_id: "00000000-0000-4000-8000-000000000001", is_correct: true },
    ]);
    mocks.completeQuizAttemptAtomic.mockResolvedValue({
      score: 100,
      newStatus: "partially_complete",
      confidenceBand: "mastered",
    });
    await expect(
      actionCompleteQuiz({
        attemptId: "00000000-0000-4000-8000-000000000010",
        nodeId: "ma-00",
        subject: "math",
      })
    ).resolves.toMatchObject({ score: 100 });
    expect(mocks.completeQuizAttemptAtomic).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000010",
      "dev_seed_student_stuck",
      "ma-00",
      expect.objectContaining({ expectedCount: 1 })
    );
  });

  it("replays a completed attempt without depending on the current question pool", async () => {
    mocks.fetchQuizAttemptForStudent.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000010",
      node_id: "ma-00",
      completed_at: "2026-10-04T00:00:00Z",
    });
    mocks.fetchQuestionsForNode.mockResolvedValue([]);
    mocks.completeQuizAttemptAtomic.mockResolvedValue({
      score: 100,
      newStatus: "partially_complete",
      confidenceBand: "mastered",
    });
    await expect(
      actionCompleteQuiz({
        attemptId: "00000000-0000-4000-8000-000000000010",
        nodeId: "ma-00",
        subject: "math",
      })
    ).resolves.toMatchObject({ score: 100 });
    expect(mocks.fetchQuestionsForNode).not.toHaveBeenCalled();
  });

  it("rejects a future approved question until it is next", async () => {
    mocks.fetchQuestionsForNode.mockResolvedValue([
      question,
      { ...question, id: "00000000-0000-4000-8000-000000000002", display_order: 2 },
    ]);
    await expect(
      actionRecordResponse({
        attempt_id: "00000000-0000-4000-8000-000000000010",
        question_id: "00000000-0000-4000-8000-000000000002",
        student_answer: "A",
        response_time_seconds: 3,
      })
    ).rejects.toThrow("not next");
    expect(mocks.recordQuestionResponse).not.toHaveBeenCalled();
  });

  it("rejects a question outside the approved pool before recording", async () => {
    await expect(
      actionRecordResponse({
        attempt_id: "00000000-0000-4000-8000-000000000010",
        question_id: "00000000-0000-4000-8000-000000000003",
        student_answer: "A",
        response_time_seconds: 3,
      })
    ).rejects.toThrow("approved node pool");
    expect(mocks.recordQuestionResponse).not.toHaveBeenCalled();
  });
});

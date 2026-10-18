// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ start: vi.fn(), record: vi.fn(), complete: vi.fn() }));
vi.mock("@/app/learn/quiz-actions", () => ({
  actionStartQuiz: mocks.start,
  actionRecordResponse: mocks.record,
  actionCompleteQuiz: mocks.complete,
  actionFlagQuestion: vi.fn(),
}));
vi.mock("@/lib/sounds", () => ({ playSound: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { QuizProvider, useQuiz } from "@/contexts/QuizContext";

function Journey() {
  const { state, startQuiz, selectAnswer, submitAnswer, nextQuestion } = useQuiz();
  return (
    <>
      <button onClick={() => void startQuiz("ma-00", "math")}>Resume</button>
      <button onClick={() => selectAnswer("A")}>Choose A</button>
      <button onClick={() => void submitAnswer()}>Submit answer</button>
      <button onClick={() => void nextQuestion()}>Next question</button>
      <output>{`${state.phase}:${state.currentIndex}:${state.selectedQuestions[state.currentIndex]?.id}`}</output>
    </>
  );
}

const q = (id: string, order: number) => ({
  id,
  display_order: order,
  difficulty_level: 1,
  difficulty: "foundational",
  subject: "math",
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("practice navigation integration acceptance", () => {
  it("accepts keyboard Next once, then resumes the saved next question", async () => {
    const questions = [q("q1", 1), q("q2", 2), q("q3", 3)];
    const saved = [
      { question_id: "q1", student_answer: "A", is_correct: false, response_time_seconds: 1 },
    ];
    mocks.start.mockResolvedValue({ attemptId: "a1", questions, responses: saved, reviews: {} });
    mocks.record.mockResolvedValue({ studentAnswer: "A", isCorrect: false });
    const user = userEvent.setup();
    const view = render(
      <QuizProvider>
        <Journey />
      </QuizProvider>
    );
    await user.click(screen.getByRole("button", { name: "Resume" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("answering:1:q2"));
    await user.click(screen.getByRole("button", { name: "Choose A" }));
    await user.click(screen.getByRole("button", { name: "Submit answer" }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("submitted_wrong:1:q2")
    );
    screen.getByRole("button", { name: "Next question" }).focus();
    await user.keyboard("{Enter}");
    fireEvent.click(screen.getByRole("button", { name: "Next question" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("answering:2:q3"));
    expect(mocks.complete).not.toHaveBeenCalled();
    view.unmount();
    mocks.start.mockResolvedValueOnce({
      attemptId: "a1",
      questions,
      responses: [
        ...saved,
        { question_id: "q2", student_answer: "A", is_correct: false, response_time_seconds: 1 },
      ],
      reviews: {},
    });
    render(
      <QuizProvider>
        <Journey />
      </QuizProvider>
    );
    await user.click(screen.getByRole("button", { name: "Resume" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("answering:2:q3"));
  });
});

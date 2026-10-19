// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  record: vi.fn(),
  complete: vi.fn(),
}));
vi.mock("@/app/learn/quiz-actions", () => ({
  actionStartQuiz: mocks.start,
  actionRecordResponse: mocks.record,
  actionCompleteQuiz: mocks.complete,
  actionFlagQuestion: vi.fn(),
}));
vi.mock("@/lib/sounds", () => ({ playSound: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { QuizProvider, useQuiz } from "./QuizContext";

function Probe() {
  const { state, startQuiz, selectAnswer, submitAnswer, nextQuestion } = useQuiz();
  return (
    <>
      <button onClick={() => void startQuiz("ma-00", "math")}>Start</button>
      <button onClick={() => selectAnswer("A")}>Choose</button>
      <button onClick={() => void submitAnswer()}>Submit</button>
      <button
        onClick={() => {
          void nextQuestion();
          void nextQuestion();
        }}
      >
        Next twice
      </button>
      <output>
        {state.phase}:{state.currentIndex}:{state.selectedQuestions[state.currentIndex]?.id}
      </output>
    </>
  );
}

afterEach(() => vi.clearAllMocks());

describe("quiz navigation", () => {
  it("advances once when Next is clicked twice before the view updates", async () => {
    mocks.start.mockResolvedValue({
      attemptId: "attempt-1",
      questions: [
        { id: "q1", display_order: 1, difficulty_level: 1, difficulty: "foundational" },
        { id: "q2", display_order: 2, difficulty_level: 1, difficulty: "foundational" },
      ],
      responses: [],
      reviews: {},
    });
    mocks.record.mockResolvedValue({ studentAnswer: "A", isCorrect: false });
    render(
      <QuizProvider>
        <Probe />
      </QuizProvider>
    );
    fireEvent.click(screen.getByText("Start"));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("answering:0:q1"));
    fireEvent.click(screen.getByText("Choose"));
    fireEvent.click(screen.getByText("Submit"));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("submitted_wrong:0:q1")
    );
    fireEvent.click(screen.getByText("Next twice"));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("answering:1:q2"));
    expect(mocks.complete).not.toHaveBeenCalled();
  });
});

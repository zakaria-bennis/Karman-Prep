// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ start: vi.fn() }));
vi.mock("@/app/learn/quiz-actions", () => ({
  actionStartQuiz: mocks.start,
  actionRecordResponse: vi.fn(),
  actionCompleteQuiz: vi.fn(),
  actionFlagQuestion: vi.fn(),
}));
vi.mock("@/lib/sounds", () => ({ playSound: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
import { QuizProvider, useQuiz } from "./QuizContext";
function Probe({ subject }: { subject: "math" | "reading" }) {
  const { state, startQuiz, toggleDesmos } = useQuiz();
  return (
    <>
      <button onClick={() => void startQuiz("node", subject)}>Start</button>
      <button onClick={toggleDesmos}>Force calculator</button>
      <output>
        {state.phase}:{state.isDesmosOpen ? "open" : "closed"}
      </output>
    </>
  );
}
describe("calculator action boundaries", () => {
  it.each(["math", "reading"] as const)(
    "enforces the current %s subject at the action layer",
    async (subject) => {
      mocks.start.mockResolvedValue({
        attemptId: "local",
        questions: [{ id: "q", subject, difficulty: "intermediate", difficulty_level: 3 }],
        responses: [],
        reviews: {},
      });
      render(
        <QuizProvider>
          <Probe subject={subject} />
        </QuizProvider>
      );
      fireEvent.click(screen.getByText("Start"));
      await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("answering:closed"));
      fireEvent.click(screen.getByText("Force calculator"));
      expect(screen.getByRole("status")).toHaveTextContent(
        subject === "math" ? "answering:open" : "answering:closed"
      );
    }
  );
});

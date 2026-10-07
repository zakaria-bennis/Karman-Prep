// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MATH_NODES } from "@/data/curriculum";
import type { QuizState, useQuiz } from "@/contexts/QuizContext";
import type { StudentQuizQuestion } from "@/types/quiz";
import QuizEngine from "./QuizEngine";

let quiz: ReturnType<typeof useQuiz>;
vi.mock("@/contexts/QuizContext", () => ({ useQuiz: () => quiz }));
vi.mock("./DesmosWindow", () => ({ default: () => null }));
vi.mock("./Scratchpad", () => ({ default: () => null }));
vi.mock("./QuizResults", () => ({ default: () => <div>Results</div> }));
vi.mock("./quiz/BottomToolbar", () => ({ BottomToolbar: () => null }));
vi.mock("./quiz/VideoPromptBanner", () => ({ VideoPromptBanner: () => null }));

const question: StudentQuizQuestion = {
  id: "equation-choice",
  node_id: "ma-02",
  question_text: "Which region contains no solutions to $3x - 7y > 21$?",
  question_type: "math_computation",
  difficulty: "foundational",
  difficulty_level: 1,
  answer_format: "multiple_choice",
  hint: null,
  image_url: null,
  image_alt: null,
  subject: "math",
  topic_cluster: "Algebra",
  display_order: 0,
  passage_intro: null,
  passage: null,
  passage_a: null,
  passage_b: null,
  figure_kind: null,
  figure_table_data: null,
  figure_chart_data: null,
  figure_geometry_data: null,
  answer_choices: [
    {
      id: "choice-a",
      question_id: "equation-choice",
      letter: "A",
      choice_text: "A point where $x < 0$ and $y > 0$.",
    },
  ],
};

beforeEach(() => {
  const state: QuizState = {
    phase: "answering",
    nodeId: "ma-02",
    subject: "math",
    attemptId: "synthetic-test",
    allQuestions: [question],
    selectedQuestions: [question],
    reviews: {},
    usedQuestionIds: new Set([question.id]),
    currentIndex: 0,
    currentLevel: 1,
    selectedAnswer: null,
    questionStartedAt: 0,
    records: [],
    adaptivePath: [],
    consecutiveWrong: 0,
    isDesmosOpen: false,
    isScratchpadOpen: false,
    score: null,
    correctCount: 0,
    targetLength: 1,
    confidenceBand: null,
    newStatus: null,
  };
  quiz = {
    state,
    startQuiz: vi.fn(async () => {}),
    selectAnswer: vi.fn(),
    submitAnswer: vi.fn(async () => {}),
    nextQuestion: vi.fn(async () => {}),
    dismissVideoPrompt: vi.fn(),
    flagCurrent: vi.fn(async () => {}),
    toggleDesmos: vi.fn(),
    toggleScratchpad: vi.fn(),
    reset: vi.fn(),
    retakeQuiz: vi.fn(async () => {}),
  };
});
afterEach(() => vi.useRealTimers());

function mount(onClose = vi.fn()) {
  return render(
    <QuizEngine
      node={{ ...MATH_NODES[0], status: "available" }}
      onClose={onClose}
      onGoToNext={null}
    />
  );
}

describe("quiz activity and math answer selection", () => {
  it("passes the saved attempt through when the engine starts", async () => {
    quiz.state = { ...quiz.state, phase: "idle" };
    render(
      <QuizEngine
        node={{ ...MATH_NODES[0], status: "available" }}
        resumeAttemptId="00000000-0000-4000-8000-000000000010"
        onClose={vi.fn()}
        onGoToNext={null}
      />
    );
    expect(quiz.startQuiz).toHaveBeenCalledExactlyOnceWith(
      "ma-00",
      "math",
      "00000000-0000-4000-8000-000000000010"
    );
  });
  it.each(["pointer", "keyboard"])(
    "keeps reviewed serialized exponential choices selectable by %s",
    (input) => {
      const q = {
        ...question,
        answer_choices: [{ ...question.answer_choices[0], choice_text: "f(x) = −3^x + 1" }],
      };
      quiz.state = { ...quiz.state, selectedQuestions: [q], allQuestions: [q] };
      const { baseElement } = mount();
      const target = baseElement.querySelector("button .source-function-math .msupsub")!;
      expect(target).toBeTruthy();
      expect(baseElement.querySelector("button annotation")?.textContent).toBe("f(x) = -3^{x} + 1");
      if (input === "pointer") {
        fireEvent.pointerDown(target);
        expect(target.isConnected).toBe(true);
        fireEvent.pointerUp(target);
        fireEvent.click(target);
      } else {
        const button = target.closest("button")!;
        button.focus();
        fireEvent.click(button, { detail: 0 });
      }
      expect(quiz.selectAnswer).toHaveBeenCalledExactlyOnceWith("A");
    }
  );
  it("preserves the pressed equation element until its choice click completes", () => {
    const { baseElement } = mount();
    const target = baseElement.querySelector("button .katex-html .mrel")!;
    expect(target).toBeTruthy();
    fireEvent.pointerDown(target);
    // Native browsers suppress click if its pointer-down target is detached.
    expect(target.isConnected).toBe(true);
    fireEvent.pointerUp(target);
    fireEvent.click(target);
    expect(quiz.selectAnswer).toHaveBeenCalledExactlyOnceWith("A");
  });

  it("keeps non-pointer activation of the answer choice", () => {
    const { baseElement } = mount();
    const button = baseElement.querySelector("button .katex")!.closest("button")!;
    button.focus();
    fireEvent.click(button, { detail: 0 });
    expect(quiz.selectAnswer).toHaveBeenCalledExactlyOnceWith("A");
  });

  it("still extends the results inactivity timer after pointer activity", () => {
    vi.useFakeTimers();
    quiz.state = { ...quiz.state, phase: "complete", score: 100, confidenceBand: "mastered" };
    const onClose = vi.fn();
    mount(onClose);
    act(() => vi.advanceTimersByTime(90_000));
    fireEvent.pointerDown(screen.getByText("Results"));
    act(() => vi.advanceTimersByTime(90_000));
    expect(onClose).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(30_000));
    expect(quiz.reset).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});

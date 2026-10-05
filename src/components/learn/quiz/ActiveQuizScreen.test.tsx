// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StudentQuizQuestion } from "@/types/quiz";
import type { MappedNode } from "../ConstellationMap";
import { ActiveQuizScreen } from "./ActiveQuizScreen";

vi.mock("@/contexts/QuizContext", () => ({
  useQuiz: () => ({
    state: {
      phase: "answering",
      targetLength: 1,
      records: [],
      currentIndex: 0,
      selectedAnswer: null,
      reviews: {},
    },
  }),
}));
afterEach(cleanup);

function showQuestion(q: StudentQuizQuestion, onSelectAnswer = vi.fn()) {
  render(
    <ActiveQuizScreen
      node={{ subject: "math", topic: "Practice" } as MappedNode}
      q={q}
      onClose={() => {}}
      onSelectAnswer={onSelectAnswer}
      onSubmit={() => {}}
      onFlagClick={() => {}}
      showExplanations={false}
      onToggleExplanations={() => {}}
      onNext={() => {}}
    />
  );
  return onSelectAnswer;
}
const base = {
  id: "visual-review",
  question_text: "What is the value?",
  topic_cluster: "Practice",
  answer_choices: [],
} as unknown as StudentQuizQuestion;

describe("student answer presentation", () => {
  it("labels the numeric input and allows a fraction without exposing an answer", () => {
    const onSelect = showQuestion({ ...base, answer_format: "numeric_entry" });
    const input = screen.getByRole("textbox", { name: "Your answer" }) as HTMLInputElement;
    expect(input.placeholder).toBe("Number or fraction");
    expect(input.inputMode).toBe("text");
    fireEvent.change(input, { target: { value: "11/28" } });
    expect(onSelect).toHaveBeenCalledWith("11/28");
    expect(screen.queryByText(/Correct:/)).toBeNull();
  });

  it("keeps each table attached to its own answer radio", () => {
    showQuestion({
      ...base,
      answer_format: "multiple_choice",
      answer_choices: ["A", "B", "C", "D"].map((letter, index) => ({
        id: letter,
        question_id: base.id,
        letter,
        choice_text: "Table",
        choice_table_data: { header_row: ["x", "y"], rows: [["1", String(index + 10)]] },
      })),
    } as StudentQuizQuestion);
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    for (const [index, letter] of ["A", "B", "C", "D"].entries()) {
      const figure = screen.getByRole("figure", { name: `Choice ${letter} data table` });
      expect(within(figure).getByText(String(index + 10))).toBeTruthy();
      expect(screen.getByRole("radio", { name: `Choice ${letter}` })).toBeTruthy();
    }
    expect(document.querySelector("button table")).toBeNull();
  });
});

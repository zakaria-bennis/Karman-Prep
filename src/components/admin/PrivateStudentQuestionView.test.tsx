// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { catalogQuestion } from "../../../tests/fixtures/approved-catalog";
import { toStudentQuizQuestion } from "@/lib/student-quiz-payload";
import type { QuizQuestionWithChoices } from "@/types/quiz";

const actions = vi.hoisted(() => ({
  actionStartQuiz: vi.fn(),
  actionRecordResponse: vi.fn(),
  actionCompleteQuiz: vi.fn(),
  actionFlagQuestion: vi.fn(),
}));
vi.mock("@/app/learn/quiz-actions", () => actions);
vi.mock("@/lib/sounds", () => ({ playSound: vi.fn() }));
import PrivateStudentQuestionView from "./PrivateStudentQuestionView";

describe("actual student component in private unanswered inspection", () => {
  it("renders actual math/formatting and disables all quiz writes and answer feedback", () => {
    const question = {
      ...catalogQuestion(),
      question_text: "Solve $x+1=3$. [[u]]Reviewed span[[/u]]",
      explanation_text: "hidden explanation",
      correct_answer: "hidden key",
    } as unknown as QuizQuestionWithChoices;
    const { container } = render(
      <PrivateStudentQuestionView
        question={toStudentQuizQuestion(question)}
        payloadSha256={"a".repeat(64)}
      />
    );
    expect(container.querySelector(".katex")).not.toBeNull();
    expect(screen.getByText("Reviewed span")).toBeTruthy();
    expect(container.querySelector("[data-private-student-view]")).toHaveAttribute(
      "data-payload-sha256",
      "a".repeat(64)
    );
    const choice = container.querySelector("fieldset button:not([aria-label])")!;
    expect(choice).toHaveTextContent("A3");
    expect(choice).toBeDisabled();
    fireEvent.click(choice);
    fireEvent.click(screen.getByLabelText("Close quiz"));
    expect(screen.queryByText("Submit Answer")).toBeNull();
    expect(container.textContent).not.toContain("hidden explanation");
    expect(container.textContent).not.toContain("hidden key");
    expect(screen.getByText(/Private review/)).toBeTruthy();
    for (const action of Object.values(actions)) expect(action).not.toHaveBeenCalled();
  });
  it("uses the actual numeric input and native table without exposing the stored key", () => {
    const question = {
      ...catalogQuestion(),
      answer_format: "numeric_entry",
      correct_answer: "secret numeric key",
      figure_kind: "table",
      figure_table_data: { kind: "table", header_row: ["x", "y"], rows: [["1", "2"]] },
    } as unknown as QuizQuestionWithChoices;
    const { container } = render(
      <PrivateStudentQuestionView
        question={toStudentQuizQuestion(question)}
        payloadSha256={"b".repeat(64)}
      />
    );
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("table")).toBeTruthy();
    expect(container.textContent).not.toContain("secret numeric key");
    for (const action of Object.values(actions)) expect(action).not.toHaveBeenCalled();
  });
});

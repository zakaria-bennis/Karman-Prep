// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { toStudentQuizQuestion } from "@/lib/student-quiz-payload";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import { catalogQuestion } from "../../../../tests/fixtures/approved-catalog";
import CatalogPoolPreview from "./CatalogPoolPreview";

describe("read-only admitted question previews", () => {
  it("lets students browse every question with no answer entry or key disclosure", () => {
    const questions = [1, 2].map((n) =>
      toStudentQuizQuestion({
        ...catalogQuestion(`00000000-0000-4000-8000-00000000000${n}`),
        question_text: `Preview question ${n}`,
      } as unknown as QuizQuestionWithChoices)
    );
    const reload = vi.fn();
    render(<CatalogPoolPreview questions={questions} onReload={reload} />);
    expect(screen.getByText("Preview question 1")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Choice A" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next preview" }));
    expect(screen.getByText("Preview question 2")).toBeTruthy();
    expect(screen.queryByText(/Preview [0-9]+ of/)).toBeNull();
    expect(screen.getByRole("button", { name: "Next preview" })).toBeDisabled();
    expect(screen.queryByText(/Correct answer:/)).toBeNull();
    expect(screen.queryByText(/explanation/i)).toBeNull();
    expect(reload).not.toHaveBeenCalled();
  });
  it("offers a read-only retry for an empty or unavailable pool", () => {
    const reload = vi.fn();
    render(<CatalogPoolPreview questions={[]} onReload={reload} />);
    fireEvent.click(screen.getByRole("button", { name: "Reload questions" }));
    expect(reload).toHaveBeenCalledOnce();
    expect(screen.queryByRole("radio")).toBeNull();
  });
});

// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import RapidReviewClient from "./RapidReviewClient";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/components/learn/quiz/ActiveQuizScreen", () => ({
  ActiveQuizScreen: ({ q }: { q: QuizQuestionWithChoices }) => <div>{q.question_text}</div>,
}));

const rows = [
  {
    id: "q-1",
    answer_choices: [],
    question_text: "First stem",
    import_status: "ok",
    correct_answer: "B",
    answer_format: "multiple_choice",
    numeric_tolerance: null,
  },
  {
    id: "q-2",
    answer_choices: [],
    question_text: "Second stem",
    import_status: "needs_review",
    correct_answer: "17",
    answer_format: "numeric_entry",
    numeric_tolerance: 0.5,
  },
] as unknown as QuizQuestionWithChoices[];

describe("RapidReviewClient", () => {
  it("keeps answers hidden until explicit reveal, filters and jumps by ID", async () => {
    const user = userEvent.setup();
    render(<RapidReviewClient questions={rows} />);
    expect(screen.getByText("First stem")).toBeInTheDocument();
    expect(screen.queryByText("Answer: B.")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Filter by status"), "needs_review");
    expect(screen.getByText("Second stem")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reveal answer" }));
    expect(screen.getByText("Answer:")).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Filter by status"), "all");
    await user.click(screen.getByRole("button", { name: "Next question" }));
    expect(screen.queryByText("17")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Jump to question ID"), "q-1");
    await user.click(screen.getByRole("button", { name: "Jump" }));
    expect(screen.getByText("First stem")).toBeInTheDocument();
  });

  it("supports repeated next clicks, keyboard focus protection, and theme changes", async () => {
    const user = userEvent.setup();
    const { container } = render(<RapidReviewClient questions={rows} />);
    const input = screen.getByLabelText("Jump to question ID");
    input.focus();
    fireEvent.keyDown(input, { key: "ArrowRight" });
    expect(screen.getByText("First stem")).toBeInTheDocument();
    input.blur();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("Second stem")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next question" }));
    await user.click(screen.getByRole("button", { name: "Next question" }));
    expect(screen.getByText("Second stem")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next question" }));
    expect(screen.getByText("Second stem")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Switch to light preview" }));
    expect(container.querySelector(".rapid-preview-light")).toBeTruthy();
  });
});

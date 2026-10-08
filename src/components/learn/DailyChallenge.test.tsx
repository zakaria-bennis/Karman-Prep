// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DailyChallenge from "./DailyChallenge";
import type { StudentQuizQuestion } from "@/types/quiz";

const action = vi.hoisted(() => vi.fn());
vi.mock("@/app/learn/daily-challenge-actions", () => ({ actionReviewDailyAnswer: action }));

const question = {
  id: "00000000-0000-4000-8000-000000000001",
  subject: "math",
  topic_cluster: "Advanced Math",
  difficulty_level: 5,
  answer_format: "multiple_choice",
  question_text: "Reviewed question fixture",
  passage_intro: null,
  passage: null,
  passage_a: null,
  passage_b: null,
  figure_kind: null,
  figure_table_data: null,
  figure_chart_data: null,
  figure_geometry_data: null,
  image_url: null,
  image_alt: null,
  answer_choices: [
    {
      id: "choice-a",
      question_id: "00000000-0000-4000-8000-000000000001",
      letter: "A",
      choice_text: "209",
      choice_table_data: null,
    },
    {
      id: "choice-b",
      question_id: "00000000-0000-4000-8000-000000000001",
      letter: "B",
      choice_text: "201",
      choice_table_data: null,
    },
  ],
} as StudentQuizQuestion;

describe("DailyChallenge", () => {
  it("shows both reviewed-content empty states without a substitute question", () => {
    render(<DailyChallenge math={{ state: "empty" }} reading={{ state: "empty" }} />);
    expect(screen.getByText("No reviewed Math question is available for today.")).toBeTruthy();
    expect(
      screen.getByText("No reviewed Reading & Writing question is available for today.")
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Check answer" })).toBeNull();
  });

  it("reveals the reviewed answer only after checking a selected response", async () => {
    action.mockResolvedValue({
      correct_answer: "A",
      numeric_tolerance: null,
      explanation_text: "Reviewed explanation",
      explanation_per_choice: null,
      desmos_strategy: null,
      isCorrect: false,
      studentAnswer: "B",
    });
    render(
      <DailyChallenge
        math={{ state: "ready", value: { day: "2026-10-08", subject: "math", question } }}
        reading={{ state: "empty" }}
      />
    );
    expect(screen.queryByText(/Correct answer:/)).toBeNull();
    const check = screen.getByRole("button", { name: "Check answer" });
    expect((check as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: /B\./ }));
    fireEvent.click(check);
    expect(await screen.findByText("Not quite")).toBeTruthy();
    expect(screen.getByText(/Correct answer:/)).toBeTruthy();
    expect(screen.queryByText("Reviewed explanation")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show explanation" }));
    expect(screen.getByText("Reviewed explanation")).toBeTruthy();
    expect(action).toHaveBeenCalledWith({
      subject: "math",
      day: "2026-10-08",
      questionId: question.id,
      answer: "B",
    });
  });
});

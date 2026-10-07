// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildLearnDashboard } from "@/lib/learn/dashboard";
import type { QuizAttempt } from "@/types/quiz";
import LearnDashboard from "./LearnDashboard";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));
afterEach(cleanup);

describe("learn dashboard navigation", () => {
  it("gives a new student a subject choice and real practice, review, and support routes", () => {
    render(<LearnDashboard dashboard={buildLearnDashboard([], [])} />);
    expect(screen.getByRole("heading", { name: "Choose a subject to begin" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Reading & Writing" })[0]).toHaveAttribute(
      "href",
      "/learn/reading"
    );
    expect(screen.getByRole("link", { name: "View quiz history" })).toHaveAttribute(
      "href",
      "/dashboard/student/quizzes"
    );
    expect(screen.getByRole("link", { name: "View schedule" })).toHaveAttribute(
      "href",
      "/dashboard/student/schedule"
    );
    expect(screen.queryByText(/% mastered/)).toBeNull();
  });

  it("opens the saved lesson and exact quiz review", () => {
    const attempts = [
      {
        id: "open",
        node_id: "ma-00",
        completed_at: null,
        questions_answered: 2,
        questions_correct: 1,
      },
      {
        id: "finished",
        node_id: "rw-00",
        completed_at: "2026-10-07T12:00:00Z",
        questions_answered: 3,
        questions_correct: 2,
      },
    ] as QuizAttempt[];
    render(<LearnDashboard dashboard={buildLearnDashboard([], attempts)} />);
    expect(screen.getByRole("link", { name: "Continue practice" })).toHaveAttribute(
      "href",
      "/learn/math/ma-00"
    );
    expect(screen.getByRole("link", { name: "Review saved answers" })).toHaveAttribute(
      "href",
      "/dashboard/student/quizzes/finished"
    );
  });
});

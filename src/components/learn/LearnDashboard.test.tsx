// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildLearnDashboard } from "@/lib/learn/dashboard";
import type { QuizAttempt } from "@/types/quiz";
import LearnDashboard from "./LearnDashboard";
import { getCatalogSkills } from "@/data/curriculum/skill-catalog";

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
        id: "00000000-0000-4000-8000-000000000010",
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
      "/learn/earlier/math?resume=00000000-0000-4000-8000-000000000010"
    );
    expect(screen.getByRole("link", { name: "Review saved answers" })).toHaveAttribute(
      "href",
      "/dashboard/student/quizzes/finished"
    );
  });

  it("opens canonical skills directly from the study desk and switches subjects", () => {
    render(<LearnDashboard dashboard={buildLearnDashboard([], [])} />);
    for (const name of ["Central Ideas and Details", "Command of Evidence", "Inferences"]) {
      const skill = getCatalogSkills("reading").find((entry) => entry.label === name)!;
      expect(screen.getByRole("link", { name })).toHaveAttribute(
        "href",
        `/learn/practice/${skill.id}`
      );
    }
    fireEvent.click(screen.getByRole("button", { name: "Math" }));
    expect(screen.getByRole("button", { name: "Math" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("link", { name: "Inferences" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Algebra" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByRole("link", { name: "Open Math practice" })).toHaveAttribute(
      "href",
      "/learn/math"
    );
  });

  it("keeps earlier lesson evidence in an expandable, clearly labeled detail", async () => {
    const user = userEvent.setup();
    const dashboard = buildLearnDashboard([], []);
    dashboard.subjects[0] = {
      subject: "reading",
      skillCount: 20,
      savedLessons: 3,
      markedMastered: 1,
      underway: 2,
    };
    render(<LearnDashboard dashboard={dashboard} />);
    const summary = screen.getByText("Your saved lesson work");
    const disclosure = summary.closest("details")!;
    expect(disclosure).not.toHaveAttribute("open");
    // JSDOM supports summary click activation; native keyboard activation is a browser check.
    await user.click(summary);
    expect(disclosure).toHaveAttribute("open");
    expect(screen.getByText("3 with saved work; 1 marked mastered; 2 underway")).toBeVisible();
    expect(screen.getByText(/do not measure mastery of the current skill catalog/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Earlier Math lessons" })).toHaveAttribute(
      "href",
      "/learn/earlier/math"
    );
  });

  it("shows a saved diagnostic entry without displaying an inferred score", () => {
    const dashboard = buildLearnDashboard([], []);
    const view = render(<LearnDashboard dashboard={dashboard} />);
    expect(screen.getByRole("link", { name: "Take the diagnostic" })).toHaveAttribute(
      "href",
      "/diagnostic"
    );
    view.rerender(
      <LearnDashboard
        dashboard={dashboard}
        diagnostic={{ score_range_low: 1100, score_range_high: 1200 }}
      />
    );
    expect(screen.getByRole("link", { name: "See diagnostic details" })).toHaveAttribute(
      "href",
      "/dashboard/student/progress"
    );
    expect(screen.queryByRole("link", { name: "Take the diagnostic" })).not.toBeInTheDocument();
    expect(screen.queryByText(/1100|1200|predicted/i)).not.toBeInTheDocument();
  });

  it("surfaces real daily and tutor paths without inventing a daily SAT question", () => {
    render(<LearnDashboard dashboard={buildLearnDashboard([], [])} />);
    expect(screen.getByRole("link", { name: "Open vocabulary and word parts" })).toHaveAttribute(
      "href",
      "/learn/daily#daily-vocabulary"
    );
    expect(screen.getByRole("link", { name: "Open chat" })).toHaveAttribute(
      "href",
      "/dashboard/student/chat"
    );
    expect(screen.queryByText(/question of the day/i)).not.toBeInTheDocument();
  });
});

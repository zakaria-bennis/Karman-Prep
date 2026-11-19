// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RunView } from "@/lib/assembler/run-types";
import { SetEnd, SetStart, bestRun, verdictOf } from "./SetScreens";

vi.mock("@/components/learn/quiz-shell/QuizWorld", () => ({ QuizWorld: () => null }));
vi.mock("@/components/portal/fonts", () => ({ portalFontVars: "" }));
vi.mock("./CoinBurst", () => ({ CoinBurst: () => null }));
vi.mock("@/lib/quiz/reward-sound", () => ({ playRewardSound: vi.fn() }));
vi.mock("@/lib/painting/motion", () => ({ prefersStill: () => true }));

const run = (from: number, to: number, right: number) =>
  ({
    id: "r",
    kind: "practice-set",
    title: "Circles",
    startedAt: "2026-11-18T00:00:00Z",
    sections: [{ questions: Array.from({ length: 8 }, (_, i) => ({ id: `q${i}` })) }],
    reviews: Object.fromEntries(
      Array.from({ length: 8 }, (_, i) => [
        `q${i}`,
        { isCorrect: i < right, studentAnswer: i < right ? "C" : "A", correct_answer: "C" },
      ])
    ),
    completedAt: "2026-11-18T00:06:00Z",
    result: {
      right,
      total: 8,
      sections: [],
      skills: [{ skillId: "s", label: "Circles", from, to, right, total: 8 }],
      tokens: 40,
    },
  }) as unknown as RunView;

afterEach(cleanup);

describe("the skill set's screens", () => {
  it("starts with the skill, where it sits, its length, the level and one button", () => {
    render(
      <SetStart
        name="Circles"
        domain="Geometry and Trigonometry"
        subject="math"
        level={3}
        questions={8}
        onStart={() => {}}
        busy={false}
        exitHref="/learn/math"
      />
    );
    expect(screen.getByRole("heading", { name: "Circles" })).toBeTruthy();
    expect(screen.getByText(/Geometry and Trigonometry/)).toBeTruthy();
    // the ring says how many questions wait, and has a bead for each
    expect(screen.getByText("questions")).toBeTruthy();
    expect(screen.getByText("13 minutes")).toBeTruthy();
    expect(screen.getByText("Understanding")).toBeTruthy();
    expect(screen.getByText(/Calculator/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Start/ })).toBeTruthy();
  });

  it("offers another set when the skill moved up, and names both levels", () => {
    render(<SetEnd run={run(2, 3, 6)} exitHref="/learn/math" againHref="/again" />);
    expect(screen.getByLabelText("6 of 8 right")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Another set/ }).getAttribute("href")).toBe("/again");
    expect(screen.getByText("Understanding")).toBeTruthy();
    expect(screen.getByText("Level up: Understanding")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Strong set" })).toBeTruthy();
    expect(screen.getByText("75")).toBeTruthy();
    expect(screen.getByText("6:00")).toBeTruthy();
    expect(screen.getByText("0:45")).toBeTruthy();
    expect(screen.getByLabelText("40 coins earned")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^Question \d/ })).toHaveLength(8);
  });

  it("sends a student who did not move up to the lesson first, then to try again", () => {
    render(
      <SetEnd run={run(1, 1, 2)} exitHref="/learn/math" lessonHref="/lesson" againHref="/again" />
    );
    expect(screen.getByRole("link", { name: /Lesson/ }).getAttribute("href")).toBe("/lesson");
    expect(screen.getByRole("link", { name: "Try again" }).getAttribute("href")).toBe("/again");
    expect(screen.getByText("Not started")).toBeTruthy();
    // pressing a missed question's bead shows the student's answer and the right one
    const missed = screen.getAllByRole("button", { name: /missed$/ });
    fireEvent.click(missed[0]);
    expect(screen.getByText("Answer: C")).toBeTruthy();
  });

  it("finds a word for how the set went, and the best run", () => {
    expect(verdictOf(8, 8)).toBe("Perfect set");
    expect(verdictOf(6, 8)).toBe("Strong set");
    expect(verdictOf(4, 8)).toBe("Getting there");
    expect(verdictOf(1, 8)).toBe("Tough set");
    expect(bestRun([true, true, false, true, true, true, false])).toBe(3);
    expect(bestRun([])).toBe(0);
  });
});

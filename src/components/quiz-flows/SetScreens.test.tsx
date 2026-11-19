// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RunView } from "@/lib/assembler/run-types";
import { SetEnd, SetStart } from "./SetScreens";

vi.mock("@/components/learn/quiz-shell/QuizWorld", () => ({ QuizWorld: () => null }));
vi.mock("@/components/portal/fonts", () => ({ portalFontVars: "" }));
vi.mock("@/lib/quiz/reward-sound", () => ({ playRewardSound: vi.fn() }));
vi.mock("@/lib/painting/motion", () => ({ prefersStill: () => true }));

const run = (from: number, to: number, right: number) =>
  ({
    id: "r",
    kind: "practice-set",
    title: "Circles",
    sections: [{ questions: Array.from({ length: 10 }, (_, i) => ({ id: `q${i}` })) }],
    reviews: Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [`q${i}`, { isCorrect: i < right }])
    ),
    completedAt: "2026-11-18T00:00:00Z",
    result: {
      right,
      total: 10,
      sections: [],
      skills: [{ skillId: "s", label: "Circles", from, to, right, total: 10 }],
      tokens: 20,
    },
  }) as unknown as RunView;

afterEach(cleanup);

describe("the skill set's screens", () => {
  it("starts with the skill's name, the count and one button", () => {
    render(
      <SetStart
        name="Circles"
        questions={10}
        onStart={() => {}}
        busy={false}
        exitHref="/learn/math"
      />
    );
    expect(screen.getByRole("heading", { name: "Circles" })).toBeTruthy();
    expect(screen.getByText("10 questions")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Start/ })).toBeTruthy();
  });

  it("offers another set when the skill moved up", () => {
    render(<SetEnd run={run(1, 2, 8)} exitHref="/learn/math" againHref="/again" />);
    expect(screen.getByLabelText("8 of 10 right")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Another set/ }).getAttribute("href")).toBe("/again");
    expect(screen.getByText("Learning")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
  });

  it("sends a student who did not move up to the lesson first, then to try again", () => {
    render(
      <SetEnd run={run(1, 1, 2)} exitHref="/learn/math" lessonHref="/lesson" againHref="/again" />
    );
    expect(screen.getByRole("link", { name: /Read the lesson/ }).getAttribute("href")).toBe(
      "/lesson"
    );
    expect(screen.getByRole("link", { name: "Try again" }).getAttribute("href")).toBe("/again");
  });
});

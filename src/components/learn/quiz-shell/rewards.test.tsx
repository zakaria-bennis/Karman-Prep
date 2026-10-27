// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QuizShell, type QuizShellProps } from "./QuizShell";
import { LevelUpCard, bandRank, bandRose } from "./LevelUpCard";
import { modeFor } from "@/lib/quiz/mode";
import type { StudentQuizReview } from "@/types/quiz";
import { longSet } from "../../../../tests/quiz-shell/fixture/questions";

const sounds = vi.hoisted(() => ({ playSound: vi.fn(), enabled: true }));
vi.mock("@/lib/quiz/reward-sound", () => ({
  playRewardSound: (name: string) => sounds.enabled && sounds.playSound(name),
  quizSoundsEnabled: () => sounds.enabled,
  setQuizSounds: (v: boolean) => (sounds.enabled = v),
  subscribeQuizSounds: () => () => undefined,
}));

const items = longSet(6);
const questions = items.map((i) => i.q);
const graded = (
  i: number,
  correct: boolean,
  points: 0 | 10 | 15 = correct ? 10 : 0
): StudentQuizReview => ({
  ...items[i].key,
  isCorrect: correct,
  studentAnswer: correct ? "A" : "B",
  points,
});

function shell(over: Partial<QuizShellProps>) {
  const props: QuizShellProps = {
    mode: modeFor("skill", { hasTutor: false }),
    questions,
    attemptKey: "rewards",
    index: 0,
    section: "Math",
    onNavigate: vi.fn(),
    reviews: {},
    ...over,
  };
  return { props, ...render(<QuizShell {...props} />) };
}

beforeEach(() => {
  sounds.playSound.mockClear();
  sounds.enabled = true;
  sessionStorage.clear();
  localStorage.clear();
});

describe("bottom-bar reward", () => {
  it("says exactly Correct with the points counting up, and plays the jingle", async () => {
    shell({ reviews: { n1: graded(0, true) } });
    const bar = screen.getByRole("status", { name: "Answer result" });
    expect(bar.textContent).toContain("Correct");
    await waitFor(() => expect(bar.textContent).toContain("+10"));
    expect(sounds.playSound).toHaveBeenCalledWith("correct");
  });
  it("a hard question shows +15", async () => {
    shell({ reviews: { n1: graded(0, true, 15) } });
    await waitFor(() =>
      expect(screen.getByRole("status", { name: "Answer result" }).textContent).toContain("+15")
    );
  });
  it("says exactly Not quite for a wrong answer, with no jingle", () => {
    shell({ reviews: { n1: graded(0, false) } });
    expect(screen.getByRole("status", { name: "Answer result" }).textContent).toContain(
      "Not quite"
    );
    expect(sounds.playSound).not.toHaveBeenCalled();
  });
  it("never appears when grading waits until the end or in review", () => {
    shell({
      mode: modeFor("timed", { baseSeconds: 600, hasTutor: false }),
      reviews: { n1: graded(0, true) },
    });
    expect(screen.queryByRole("status", { name: "Answer result" })).toBeNull();
    shell({ mode: modeFor("review", { hasTutor: false }), reviews: { n1: graded(0, true) } });
    expect(screen.queryByRole("status", { name: "Answer result" })).toBeNull();
  });
  it("two correct answers in a row draw different pictures", () => {
    const { rerender, props } = shell({ reviews: { n1: graded(0, true) } });
    const first = document.querySelector("[data-drawing]")?.getAttribute("data-drawing");
    rerender(
      <QuizShell {...props} index={1} reviews={{ n1: graded(0, true), n2: graded(1, true) }} />
    );
    const second = document.querySelector("[data-drawing]")?.getAttribute("data-drawing");
    expect(first).toBeTruthy();
    expect(second).not.toBe(first);
  });
  it("announces the streak from 3 in a row and plays the longer jingle at 5", () => {
    const reviews: Record<string, StudentQuizReview> = {};
    const { rerender, props } = shell({ reviews });
    for (let i = 0; i < 5; i++) {
      reviews[`n${i + 1}`] = graded(i, true);
      rerender(<QuizShell {...props} index={i} reviews={{ ...reviews }} />);
      if (i === 2) expect(screen.getByText("Correct. Plus 10 points. 3 in a row.")).toBeTruthy();
    }
    expect(sounds.playSound).toHaveBeenLastCalledWith("correctStreak");
  });
  it("respects the sound switch", () => {
    sounds.enabled = false;
    shell({ reviews: { n1: graded(0, true) } });
    expect(sounds.playSound).not.toHaveBeenCalled();
  });
});

describe("progress dots", () => {
  it("fill by result for short sets", () => {
    shell({ index: 1, reviews: { n1: graded(0, true) } });
    const dots = screen.getAllByTestId("progress-dot");
    expect(dots).toHaveLength(6);
    expect(dots[0].getAttribute("data-state")).toBe("correct");
    expect(dots[1].getAttribute("data-state")).toBe("current");
  });
  it("long sets show the counter instead", () => {
    const many = longSet(27);
    shell({ questions: many.map((i) => i.q), index: 2 });
    expect(screen.queryAllByTestId("progress-dot")).toHaveLength(0);
    expect(screen.getByRole("button", { name: /Question 3 of 27/ })).toBeTruthy();
  });
});

describe("level up", () => {
  it("ranks bands and shows only when the band rose", () => {
    expect(bandRank("proficient")).toBeGreaterThan(bandRank("developing"));
    const { container, rerender } = render(
      <LevelUpCard
        skill="Linear equations"
        before="developing"
        after="proficient"
        onDone={() => undefined}
      />
    );
    expect(container.textContent).toContain("Linear equations");
    expect(container.textContent).toContain("Proficient");
    rerender(
      <LevelUpCard
        skill="Linear equations"
        before="proficient"
        after="developing"
        onDone={() => undefined}
      />
    );
    expect(container.textContent).toBe("");
    // A first completed set has no band before it: no fanfare, least of all for "Struggling".
    rerender(
      <LevelUpCard skill="Linear equations" before={null} after="struggling" onDone={() => undefined} />
    );
    expect(container.textContent).toBe("");
    expect(bandRose(null, "mastered")).toBe(false);
    expect(bandRose("developing", "proficient")).toBe(true);
  });
});

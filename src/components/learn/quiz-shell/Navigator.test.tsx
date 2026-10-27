// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { modeFor } from "@/lib/quiz/mode";
import { emptyWorkspace } from "@/lib/quiz/workspace";
import { NavigatorGrid, squareName, squaresFor } from "./Navigator";
import { FIXTURE } from "../../../../tests/quiz-shell/fixture/questions";

const qs = FIXTURE.map((f) => f.q);

describe("navigator", () => {
  it("names every state a square carries", () => {
    expect(
      squareName({
        index: 3,
        locked: false,
        answered: true,
        marked: true,
        bookmarked: false,
        verdict: null,
      })
    ).toBe("Question 4, answered, marked for review");
    expect(
      squareName({
        index: 0,
        locked: false,
        answered: true,
        marked: false,
        bookmarked: true,
        verdict: "correct",
      })
    ).toBe("Question 1, answered, bookmarked, correct");
  });
  it("locks squares for questions the adaptive set has not picked yet", () => {
    const squares = squaresFor(
      8,
      qs.slice(0, 2),
      {},
      {},
      {},
      modeFor("skill", { hasTutor: false })
    );
    const onJump = vi.fn();
    render(<NavigatorGrid squares={squares} current={1} onJump={onJump} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(8);
    expect(buttons[5]).toBeDisabled();
    expect(buttons[1]).toHaveAttribute("aria-current", "true");
    fireEvent.click(buttons[0]);
    expect(onJump).toHaveBeenCalledWith(0);
  });
  it("shows right and wrong only in instant mode", () => {
    const ws = { [qs[0].id]: { ...emptyWorkspace(), answer: "A" } };
    const reviews = { [qs[0].id]: { ...FIXTURE[0].key, isCorrect: false, studentAnswer: "A" } };
    expect(
      squaresFor(2, qs, ws, reviews, {}, modeFor("skill", { hasTutor: false }))[0].verdict
    ).toBe("wrong");
    expect(
      squaresFor(2, qs, ws, reviews, {}, modeFor("timed", { baseSeconds: 60, hasTutor: false }))[0]
        .verdict
    ).toBeNull();
  });
});

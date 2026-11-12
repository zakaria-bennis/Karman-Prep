// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RunView } from "@/lib/assembler/run-types";
import { scoreRound, type TrialRoundResult } from "@/lib/student/time-trial";

vi.mock("next/font/google", () => {
  const font = () => ({ className: "", variable: "", style: { fontFamily: "" } });
  return { Caveat: font, Hanken_Grotesk: font, Young_Serif: font };
});
vi.mock("./FlowFrame", () => ({
  FlowFrame: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
import { TrialEnd, trialVerdict } from "./TrialEnd";

const trial = (correct: number, answered = 27, elapsed = 1700): TrialRoundResult =>
  scoreRound({
    section: "reading",
    standing: { round: 2, multiplier: 1.2, referenceAccuracy: 0.75 },
    limitSeconds: 2304,
    elapsedSeconds: elapsed,
    correct,
    answered,
    questions: 27,
  });

const view = (t: TrialRoundResult): RunView => ({
  id: "r1",
  kind: "time-trial",
  title: "Time trial",
  scope: "reading",
  grading: "end",
  startedAt: "2026-11-12T08:00:00.000Z",
  completedAt: "2026-11-12T08:30:00.000Z",
  sections: [],
  current: null,
  reviews: {},
  answered: t.answered,
  total: 27,
  result: { right: t.correct, total: 27, sections: [], skills: [], tokens: 0, trial: t },
});

const user = { name: "Sam", email: null, streak: 0, nav: [], menu: [] };

describe("TrialEnd", () => {
  it("shows accuracy, time used, this round's and next round's pace, and one main action", () => {
    render(
      <TrialEnd
        user={user}
        run={view(trial(24))}
        exitHref="/dashboard/student/library"
        nextHref="/learn/time-trial?section=reading&again=1"
      />
    );
    expect(screen.getByRole("heading", { name: "Round 2 done" })).toBeInTheDocument();
    expect(screen.getByText("89%")).toBeInTheDocument();
    expect(screen.getByText("28:20")).toBeInTheDocument();
    expect(screen.getByText("38:24")).toBeInTheDocument();
    expect(screen.getByText("1.20×")).toBeInTheDocument();
    expect(screen.getByText("1.15×")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Next round" })).toHaveAttribute(
      "href",
      "/learn/time-trial?section=reading&again=1"
    );
    expect(screen.getByRole("link", { name: "Done" })).toHaveAttribute(
      "href",
      "/dashboard/student/library"
    );
  });

  it("says time is up when the clock ran out", () => {
    render(<TrialEnd user={user} run={view(trial(14, 18, 2400))} exitHref="/" nextHref="/n" />);
    expect(screen.getByRole("heading", { name: "Time is up" })).toBeInTheDocument();
  });
});

describe("trialVerdict", () => {
  it("explains the next pace", () => {
    expect(trialVerdict(trial(24))).toMatch(/5% tighter/);
    expect(trialVerdict(trial(18))).toBe(
      "Next round stays at this pace until you get 75% or more right."
    );
  });
});

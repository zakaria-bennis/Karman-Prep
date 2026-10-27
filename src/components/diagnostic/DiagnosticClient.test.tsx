// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SATDomain } from "@/types";
import DiagnosticClient from "./DiagnosticClient";
import { toShellQuestion, type DiagnosticQuestion } from "./diagnostic-question";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/free-diagnostic",
  useRouter: () => ({ replace, push: vi.fn() }),
}));
vi.mock("./DiagnosticResults", () => ({
  default: ({
    answers,
    bookmarkedIds,
  }: {
    answers: Record<string, string>;
    bookmarkedIds: string[];
  }) => (
    <div data-testid="results">
      {JSON.stringify(answers)}|{bookmarkedIds.join(",")}
    </div>
  ),
}));

function q(id: string, domain: SATDomain): DiagnosticQuestion {
  return {
    id,
    domain,
    difficulty: 2,
    conceptId: "c",
    passage: domain === "info_ideas" ? "A short passage about stars." : undefined,
    text: `Prompt ${id}`,
    options: ["A. One", "B) Two", "C. Three", "D. Four"],
    correct: "B",
    explanation: "Because.",
  };
}
const questions = [q("m1", "algebra"), q("m2", "algebra"), q("r1", "info_ideas")];

beforeEach(() => {
  sessionStorage.clear();
  replace.mockClear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => ({ scoring: { total: 1 } }) }))
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("diagnostic question adapter", () => {
  it("turns option strings into lettered choices and keeps the domain as the topic", () => {
    const shell = toShellQuestion(q("m1", "algebra"));
    expect(shell.answer_choices.map((c) => [c.letter, c.choice_text])).toEqual([
      ["A", "One"],
      ["B", "Two"],
      ["C", "Three"],
      ["D", "Four"],
    ]);
    expect(shell.subject).toBe("math");
    expect(toShellQuestion(q("r1", "info_ideas")).subject).toBe("reading");
  });
});

describe("diagnostic on the shared shell", () => {
  it("grades nothing during the test: no explanation and no reward bar", () => {
    render(<DiagnosticClient questions={questions} isSubscribed />);
    fireEvent.click(screen.getAllByRole("radio")[1]);
    expect(screen.queryByText("Because.")).toBeNull();
    expect(screen.queryByRole("status", { name: "Answer result" })).toBeNull();
  });

  it("runs each section on its own countdown, then submits every answer once", async () => {
    render(<DiagnosticClient questions={questions} isSubscribed />);
    expect(screen.getByRole("timer").getAttribute("aria-label")).toBe(
      "Time remaining 32 minutes 00 seconds"
    );
    fireEvent.click(screen.getAllByRole("radio")[1]);
    fireEvent.click(screen.getByRole("button", { name: "Bookmark" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getAllByRole("radio")[2]);
    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit section" }));
    expect(screen.getByRole("timer").getAttribute("aria-label")).toBe(
      "Time remaining 18 minutes 00 seconds"
    );
    expect(screen.getByText("Prompt r1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit section" }));
    await screen.findByTestId("results");
    const body = JSON.parse((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.answers).toEqual([
      { questionId: "m1", selectedAnswer: "B" },
      { questionId: "m2", selectedAnswer: "C" },
      { questionId: "r1", selectedAnswer: "" },
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("results").textContent).toContain("|m1");
  });

  it("a section that runs out of time moves on by itself", async () => {
    vi.useFakeTimers();
    render(<DiagnosticClient questions={questions} isSubscribed />);
    act(() => vi.advanceTimersByTime(32 * 60 * 1000 + 1000));
    expect(screen.getByText("Prompt r1")).toBeTruthy();
  });

  it("shows the retake notice on the first question only", () => {
    render(<DiagnosticClient questions={questions} isSubscribed isRetake />);
    expect(screen.getByText(/retaking the diagnostic/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    const current = document.querySelector("[data-quiz-frame]:not([data-exiting])") as HTMLElement;
    expect(within(current).queryByText(/retaking the diagnostic/i)).toBeNull();
  });

  it("asks before leaving, then leaves", () => {
    render(<DiagnosticClient questions={questions} isSubscribed />);
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(screen.getByRole("button", { name: "Exit" }));
    const dialog = screen.getByRole("dialog", { name: "Leave this section?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Leave" }));
    expect(replace).toHaveBeenCalledWith("/dashboard/student");
  });

  it("a reload keeps the section and submits the answers the student can see", async () => {
    const first = render(<DiagnosticClient questions={questions} isSubscribed />);
    fireEvent.click(screen.getAllByRole("radio")[1]);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit section" }));
    expect(screen.getByText("Prompt r1")).toBeTruthy();
    first.unmount();
    render(<DiagnosticClient questions={questions} isSubscribed />);
    expect(screen.getByText("Prompt r1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit section" }));
    await screen.findByTestId("results");
    const body = JSON.parse((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.answers[0]).toEqual({ questionId: "m1", selectedAnswer: "B" });
  });

  it("leaving and coming back starts a fresh diagnostic", () => {
    const first = render(<DiagnosticClient questions={questions} isSubscribed />);
    fireEvent.click(screen.getAllByRole("radio")[1]);
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(screen.getByRole("button", { name: "Exit" }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Leave this section?" })).getByRole("button", {
        name: "Leave",
      })
    );
    first.unmount();
    render(<DiagnosticClient questions={questions} isSubscribed />);
    expect(screen.getAllByRole("radio")[1]).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("timer").getAttribute("aria-label")).toBe(
      "Time remaining 32 minutes 00 seconds"
    );
  });

  it("applies the student's extra time", () => {
    render(<DiagnosticClient questions={questions} isSubscribed accommodation="double" />);
    expect(screen.getByRole("timer").getAttribute("aria-label")).toBe(
      "Time remaining 64 minutes 00 seconds"
    );
  });

  it("says so when time runs out and the section is submitted", () => {
    vi.useFakeTimers();
    render(<DiagnosticClient questions={questions} isSubscribed />);
    act(() => vi.advanceTimersByTime(32 * 60 * 1000 + 1000));
    expect(screen.getByText("Time is up. Your Math section was submitted.")).toBeTruthy();
  });
});

// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { QuizShell, type QuizShellProps } from "./QuizShell";
import { modeFor } from "@/lib/quiz/mode";
import { FIXTURE } from "../../../../tests/quiz-shell/fixture/questions";

vi.mock("@/app/learn/saved-question-actions", () => ({
  actionToggleBookmark: vi.fn(async () => ({ saved: true })),
  actionFlagForTutor: vi.fn(async () => undefined),
  actionReportProblem: vi.fn(async () => undefined),
}));

const questions = FIXTURE.map((f) => f.q);
function setup(over: Partial<QuizShellProps> = {}) {
  const props: QuizShellProps = {
    mode: modeFor("skill", { hasTutor: false }),
    questions,
    attemptKey: `t-${Math.random()}`,
    index: 1,
    section: "Math",
    onNavigate: vi.fn(),
    onSubmit: vi.fn(),
    reviews: {},
    ...over,
  };
  return { props, ...render(<QuizShell {...props} />) };
}

beforeEach(() => sessionStorage.clear());

describe("answer choices", () => {
  it("are a radio group and picking one enables Submit", () => {
    const { props } = setup();
    const group = screen.getByRole("radiogroup", { name: "Answer choices" });
    const b = within(group).getAllByRole("radio")[1];
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    fireEvent.click(b);
    expect(b).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(props.onSubmit).toHaveBeenCalledWith("math", "B");
  });

  it("crossing out the selected choice clears it and is announced", () => {
    setup();
    const radios = screen.getAllByRole("radio");
    fireEvent.click(radios[1]);
    fireEvent.click(screen.getByRole("button", { name: "Answer eliminator" }));
    fireEvent.click(screen.getByRole("button", { name: "Cross out choice B" }));
    expect(radios[1]).toHaveAttribute("aria-checked", "false");
    // jsdom cannot compute names through KaTeX; real-browser name checks live in Playwright.
    expect(within(radios[1]).getByText(", crossed out")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Restore choice B" }));
    expect(within(radios[1]).queryByText(", crossed out")).toBeNull();
  });

  it("locked mode disables choices and marks the correct one", () => {
    setup({
      mode: modeFor("review", { hasTutor: false }),
      reviews: { math: { ...FIXTURE[1].key, isCorrect: false, studentAnswer: "A" } },
    });
    const radios = screen.getAllByRole("radio");
    radios.forEach((r) => expect(r).toBeDisabled());
    expect(within(radios[1]).getByText(", correct answer")).toBeTruthy();
    expect(within(radios[0]).getByText(", your answer")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Explanation" })).toBeTruthy();
  });
});

describe("question header", () => {
  it("shows mark for review only when grading waits until the end", () => {
    setup();
    expect(screen.queryByRole("button", { name: "Mark for review" })).toBeNull();
  });
  it("end mode has mark for review as a toggle", () => {
    setup({ mode: modeFor("diagnostic", { baseSeconds: 60, hasTutor: false }) });
    const mark = screen.getByRole("button", { name: "Mark for review" });
    expect(mark).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(mark);
    expect(mark).toHaveAttribute("aria-pressed", "true");
  });
  it("shows Flag for my tutor only to tutored students", () => {
    setup();
    expect(screen.queryByRole("button", { name: "Flag for my tutor" })).toBeNull();
  });
  it("tutored students see the flag; bookmark is a toggle", () => {
    setup({ mode: modeFor("skill", { hasTutor: true }) });
    expect(screen.getByRole("button", { name: "Flag for my tutor" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.getByRole("button", { name: "Bookmark" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });
  it("admin preview cannot bookmark", () => {
    setup({ mode: modeFor("preview", { hasTutor: false }) });
    expect(screen.queryByRole("button", { name: "Bookmark" })).toBeNull();
  });
});

describe("other answer formats", () => {
  it("table choices are radios with their tables", () => {
    setup({ index: 3 });
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(screen.getByRole("figure", { name: "Choice C data table" })).toBeTruthy();
  });
  it("numeric entry feeds Submit", () => {
    const { props } = setup({ index: 4 });
    fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(props.onSubmit).toHaveBeenCalledWith("numeric", "12");
  });
  it("a geometry figure is an ink anchor", () => {
    const { container } = setup({ index: 2 });
    expect(container.querySelector("[data-ink-figure] svg")).toBeTruthy();
  });
});

describe("clock", () => {
  it("a countdown shows a timer unless the host draws its own", () => {
    const mode = modeFor("timed", { baseSeconds: 600, hasTutor: false });
    const { unmount } = setup({ mode });
    expect(screen.getByRole("timer")).toBeTruthy();
    unmount();
    setup({ mode, hideClock: true });
    expect(screen.queryByRole("timer")).toBeNull();
  });
});

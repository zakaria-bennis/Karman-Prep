// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { QuizShell, type QuizShellProps } from "./QuizShell";
import { modeFor } from "@/lib/quiz/mode";
import { FIXTURE } from "../../../../tests/quiz-shell/fixture/questions";
import { loadFigureEngine } from "@/components/learn/figures/engine-loader";

// The figure engine (tables included) loads lazily; loaded first, every figure renders at once.
await loadFigureEngine();

vi.mock("@/app/learn/saved-question-actions", () => ({
  actionSetBookmark: vi.fn(async () => ({ saved: true })),
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

describe("section clock after a reload", () => {
  it("resumes from the section's first start, not from full time", () => {
    const attemptKey = "reload-clock";
    sessionStorage.setItem(`karman-quiz-start:${attemptKey}`, String(Date.now() - 100_000));
    setup({ attemptKey, mode: modeFor("timed", { baseSeconds: 600, hasTutor: false }) });
    expect(screen.getByRole("timer").getAttribute("aria-label")).toBe(
      "Time remaining 8 minutes 20 seconds"
    );
  });
  it("remembers the first start for the next reload", () => {
    const attemptKey = "fresh-clock";
    setup({ attemptKey, mode: modeFor("timed", { baseSeconds: 600, hasTutor: false }) });
    expect(Number(sessionStorage.getItem(`karman-quiz-start:${attemptKey}`))).toBeGreaterThan(0);
  });
});

describe("restoring after a reload", () => {
  it("never overwrites saved work with an empty workspace before it loads (strict mode)", async () => {
    const { StrictMode } = await import("react");
    const attemptKey = "strict-restore";
    sessionStorage.setItem(
      `karman-quiz-ws:${attemptKey}`,
      JSON.stringify({
        math: {
          answer: "C",
          crossedOut: [],
          markedForReview: false,
          ink: { strokes: [] },
          undo: [],
          redo: [],
          highlights: [],
        },
      })
    );
    render(
      <StrictMode>
        <QuizShell
          mode={modeFor("diagnostic", { baseSeconds: 600, hasTutor: false })}
          questions={questions}
          attemptKey={attemptKey}
          index={1}
          section="Math"
          onNavigate={vi.fn()}
          reviews={{}}
        />
      </StrictMode>
    );
    expect(screen.getAllByRole("radio")[2]).toHaveAttribute("aria-checked", "true");
    expect(JSON.parse(sessionStorage.getItem(`karman-quiz-ws:${attemptKey}`)!).math.answer).toBe(
      "C"
    );
  });
  it("tells the host about restored answers so it can submit them", () => {
    const attemptKey = "host-restore";
    sessionStorage.setItem(
      `karman-quiz-ws:${attemptKey}`,
      JSON.stringify({
        math: {
          answer: "D",
          crossedOut: [],
          markedForReview: false,
          ink: { strokes: [] },
          undo: [],
          redo: [],
          highlights: [],
        },
      })
    );
    const onSelectAnswer = vi.fn();
    setup({
      attemptKey,
      onSelectAnswer,
      mode: modeFor("diagnostic", { baseSeconds: 600, hasTutor: false }),
    });
    expect(onSelectAnswer).toHaveBeenCalledWith("math", "D");
  });
  it("does not start a section clock while the host is still loading", () => {
    setup({ attemptKey: "pending", loading: true });
    expect(sessionStorage.getItem("karman-quiz-start:pending")).toBeNull();
  });
});

describe("saving markers", () => {
  it("a bookmark that fails to save goes back and says so", async () => {
    const onToggleBookmark = vi.fn(async () => {
      throw new Error("offline");
    });
    setup({ onToggleBookmark });
    fireEvent.click(screen.getByRole("button", { name: "Bookmark" }));
    expect(await screen.findByText("That did not save. Try again.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Bookmark" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });
  it("a question flagged for the tutor stays saved when the bookmark is pressed", () => {
    const onToggleBookmark = vi.fn(async () => undefined);
    setup({
      mode: modeFor("skill", { hasTutor: true }),
      saved: { math: "tutor_flag" },
      onToggleBookmark,
    });
    fireEvent.click(screen.getByRole("button", { name: "Bookmark" }));
    expect(screen.getByRole("button", { name: "Bookmark" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(onToggleBookmark).not.toHaveBeenCalled();
  });
  it("a problem report that fails says so instead of thanking", async () => {
    const onReportProblem = vi.fn(async () => {
      throw new Error("offline");
    });
    setup({ onReportProblem });
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(screen.getByRole("button", { name: "Report a problem" }));
    fireEvent.click(screen.getByRole("button", { name: "Typo or wording" }));
    fireEvent.click(screen.getByRole("button", { name: "Send report" }));
    expect(await screen.findByText("That did not send. Try again.")).toBeTruthy();
    expect(screen.queryByText(/Thanks/)).toBeNull();
  });
});

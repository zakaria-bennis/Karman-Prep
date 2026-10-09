// @vitest-environment jsdom
import { useState } from "react";
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { HighlightablePassage, type PassageHighlight } from "./HighlightablePassage";
import { useDiagnosticState, type DiagnosticQuestion } from "./_hooks/useDiagnosticState";
import { QuestionNavigator } from "./QuestionNavigator";
import DiagnosticClient from "./DiagnosticClient";
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
afterEach(cleanup);
const questions: DiagnosticQuestion[] = [
  {
    id: "a",
    domain: "craft_structure",
    difficulty: 1,
    conceptId: "a",
    passage: "Alpha beta preserves 2/11.",
    text: "What does alpha mean?",
    options: ["A. First", "B. Second"],
    correct: "A",
    explanation: "Explanation.",
  },
  {
    id: "b",
    domain: "craft_structure",
    difficulty: 1,
    conceptId: "b",
    passage: "Other passage.",
    text: "Which statement follows?",
    options: ["A. First", "B. Second"],
    correct: "B",
    explanation: "Explanation.",
  },
];
function MarkHarness() {
  const [marks, setMarks] = useState<PassageHighlight[]>([]);
  return (
    <HighlightablePassage
      passage="Alpha beta preserves 2/11."
      highlights={marks}
      onChange={setMarks}
    />
  );
}
function markPhrase(phrase: string) {
  fireEvent.change(screen.getByLabelText("Exact passage phrase"), { target: { value: phrase } });
  fireEvent.keyDown(screen.getByLabelText("Exact passage phrase"), { key: "Enter" });
}
it("overlays independent highlight and underline without changing text and removes only the chosen mark", () => {
  const { container } = render(<MarkHarness />);
  markPhrase("beta");
  fireEvent.click(screen.getByRole("button", { name: "Underline" }));
  markPhrase("beta");
  expect(container.querySelector("[data-diagnostic-passage]")?.textContent).toBe(
    "Alpha beta preserves 2/11."
  );
  expect(container.querySelector("mark")?.className).toContain("decoration-2");
  fireEvent.click(screen.getByText("Notes and markings"));
  fireEvent.click(screen.getByRole("button", { name: "Underline: beta" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove" }));
  expect(container.querySelector("mark")?.className).not.toContain("decoration-2");
  expect(container.querySelector("mark")?.textContent).toBe("beta");
});
it("supports keyboard mark editing, saved notes, Escape draft cancellation and useful focus", () => {
  render(<MarkHarness />);
  markPhrase("beta");
  const mark = screen.getByRole("button", { name: "Edit highlight: beta" });
  fireEvent.keyDown(mark, { key: "Enter" });
  let note = screen.getByPlaceholderText("Write a note about this highlight…");
  fireEvent.change(note, { target: { value: "My note 2/11" } });
  fireEvent.keyDown(note, { key: "Enter" });
  expect(mark).toHaveFocus();
  fireEvent.keyDown(mark, { key: " " });
  note = screen.getByPlaceholderText("Write a note about this highlight…");
  expect(note).toHaveValue("My note 2/11");
  fireEvent.change(note, { target: { value: "Unsaved" } });
  fireEvent.keyDown(note, { key: "Escape" });
  fireEvent.keyDown(mark, { key: "Enter" });
  expect(screen.getByPlaceholderText("Write a note about this highlight…")).toHaveValue(
    "My note 2/11"
  );
});
it("does not advance an answered question when Enter activates a marking control", () => {
  const { result } = renderHook(() => useDiagnosticState({ questions, isSubscribed: true }));
  render(<button>Mark phrase</button>);
  act(() => result.current.handleSelect("A. First"));
  fireEvent.keyDown(screen.getByRole("button", { name: "Mark phrase" }), { key: "Enter" });
  expect(result.current.question.id).toBe("a");
  fireEvent.keyDown(document.body, { key: "Enter" });
  expect(result.current.question.id).toBe("b");
});
it("uses prompt labels, traps keyboard focus and restores the opener without numbered tiles", () => {
  function Navigation() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Browse</button>
        <QuestionNavigator
          open={open}
          questions={questions}
          currentIdx={0}
          answers={{}}
          bookmarkedIds={new Set()}
          hintedIds={new Set()}
          currentSection="rw"
          onClose={() => setOpen(false)}
          onJump={() => {}}
        />
      </>
    );
  }
  render(<Navigation />);
  screen.getByRole("button", { name: "Browse" }).focus();
  fireEvent.click(screen.getByRole("button", { name: "Browse" }));
  const close = screen.getByRole("button", { name: "Close navigator" });
  expect(close).toHaveFocus();
  expect(
    screen.getByRole("button", { name: "Current prompt: What does alpha mean?" })
  ).toHaveAccessibleDescription("Alpha beta preserves 2/11.");
  fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
  expect(
    screen.getByRole("button", { name: "Open prompt: Which statement follows?" })
  ).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: "Tab" });
  expect(close).toHaveFocus();
  fireEvent.keyDown(close, { key: "Escape" });
  expect(screen.getByRole("button", { name: "Browse" })).toHaveFocus();
});
it("renders the diagnostic passage before prompt and choices while retaining content ratios", () => {
  render(<DiagnosticClient questions={questions} isSubscribed />);
  const passage = screen.getByText("Alpha beta preserves 2/11.");
  const prompt = screen.getByText("What does alpha mean?");
  expect(passage.compareDocumentPosition(prompt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.queryByText(/Question 1/)).toBeNull();
});

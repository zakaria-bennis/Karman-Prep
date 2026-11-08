// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import { QuestionPreview } from "./QuestionPreview";

afterEach(cleanup);

const question = {
  id: "preview-contrast-fixture",
  question_text: "Select the second value.",
  answer_format: "multiple_choice",
  correct_answer: "B",
  answer_choices: ["First value", "Second value"].map((choice_text, index) => ({
    id: `choice-${index}`,
    letter: index === 0 ? "A" : "B",
    choice_text,
  })),
  explanation_text: "The second value is choice B.",
} as unknown as QuizQuestionWithChoices;

// The admin sits in the painted portal shell, whose colours follow the device. White text
// (--accent-ink) is only readable on the accent, which the shell darkens until white passes
// 4.5:1. Every other filled colour (--good, --late, --warn, --info) is light in dark mode,
// so it must carry ink text on a tint, never white.
const SAFE_PAIRS: Array<[RegExp, RegExp]> = [
  [/^bg-\[color:var\(--accent\)\]$/, /^text-\[color:var\(--accent-ink\)\]$/],
  [
    /^bg-\[color-mix\(in_srgb,var\(--(good|late|warn|info)\)_\d+%,transparent\)\]$/,
    /^text-\[color:var\(--ink\)\]$/,
  ],
];

function expectReadablePair(el: HTMLElement) {
  const classes = Array.from(el.classList);
  const bg = classes.find((c) => c.startsWith("bg-"));
  const text = classes.find((c) => c.startsWith("text-[color:"));
  expect(bg, "filled background").toBeDefined();
  expect(
    SAFE_PAIRS.some(([b, t]) => b.test(bg!) && t.test(text ?? "")),
    `${bg} with ${text}`
  ).toBe(true);
}

function expectReadableAction(button: HTMLElement) {
  expectReadablePair(button);
  expect(button).toHaveClass(
    "focus-visible:outline",
    "focus-visible:outline-2",
    "focus-visible:outline-offset-2"
  );
}

const expectReadableBadge = expectReadablePair;

describe("question preview action readability", () => {
  it("keeps submit and explanation actions readable in light and dark (portal colour pairs)", async () => {
    const user = userEvent.setup();
    render(<QuestionPreview q={question} />);
    const choice = screen.getByRole("button", { name: /A\s*First value/ });
    await user.click(choice);
    expectReadableBadge(within(choice).getByText("A"));
    const submit = screen.getByRole("button", { name: "Simulate submit" });
    expectReadableAction(submit);
    await user.click(submit);
    const explanations = await screen.findByRole("button", { name: "Show explanations" });
    expectReadableAction(explanations);
    expectReadableBadge(within(choice).getByText("A"));
    expect(screen.getByRole("heading", { name: question.question_text })).toBeVisible();
    await user.click(explanations);
    expect(await screen.findByText(question.explanation_text!)).toBeInTheDocument();
    expect(question.correct_answer).toBe("B");
  });
});

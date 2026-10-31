// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { SITE_THEMES, themeTokens } from "@/lib/themes/palettes";
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

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const linear = channels.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  );
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrast(first: string, second: string): number {
  const values = [luminance(first), luminance(second)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

function tokenForClass(element: HTMLElement, prefix: string, tokens: Record<string, string>) {
  const className = Array.from(element.classList).find(
    (name) => name.startsWith(prefix) && tokens[name.slice(prefix.length)]
  );
  if (!className) throw new Error(`No theme color found for ${prefix}`);
  return tokens[className.slice(prefix.length)];
}

function expectReadableAction(button: HTMLElement) {
  // Resolve the rendered utility tokens; this detects a regression to the
  // old low-contrast text color without relying on a hardcoded replacement.
  for (const theme of SITE_THEMES) {
    const tokens = themeTokens(theme);
    const foreground = tokenForClass(button, "text-", tokens);
    const background = tokenForClass(button, "bg-", tokens);
    const hoverBackground = tokenForClass(button, "hover:bg-", tokens);
    expect(contrast(foreground, background), `${theme.id}: normal label`).toBeGreaterThanOrEqual(
      4.5
    );
    expect(
      contrast(foreground, hoverBackground),
      `${theme.id}: hover label`
    ).toBeGreaterThanOrEqual(4.5);
    const outline = tokenForClass(button, "focus-visible:outline-", tokens);
    for (const adjacent of [tokens.night, tokens.surface, tokens["surface-raised"]]) {
      expect(contrast(outline, adjacent), `${theme.id}: focus outline`).toBeGreaterThanOrEqual(3);
    }
  }
  expect(button).toHaveClass(
    "focus-visible:outline",
    "focus-visible:outline-2",
    "focus-visible:outline-offset-2"
  );
}

function expectReadableBadge(badge: HTMLElement) {
  for (const theme of SITE_THEMES) {
    const tokens = themeTokens(theme);
    expect(
      contrast(tokenForClass(badge, "text-", tokens), tokenForClass(badge, "bg-", tokens)),
      `${theme.id}: selected or incorrect choice letter`
    ).toBeGreaterThanOrEqual(4.5);
  }
}

describe("question preview action readability", () => {
  it("keeps submit and explanation actions readable across all retained themes", async () => {
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

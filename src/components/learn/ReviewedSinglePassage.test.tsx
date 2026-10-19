// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import fixture from "@/lib/question-bank/reviewed-passage.fixture.json";
import { reviewedPassageForQuestion } from "@/lib/question-bank/reviewed-passage";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import ReviewedSinglePassage from "./ReviewedSinglePassage";

afterEach(cleanup);
describe("reviewed passage presentation", () => {
  it("separates introduction, indented excerpt, and smaller right-aligned copyright", () => {
    const display = reviewedPassageForQuestion(fixture as unknown as QuizQuestionWithChoices)!;
    const { container } = render(<ReviewedSinglePassage display={display} />);
    expect(container.querySelectorAll("[data-passage-part]")).toHaveLength(3);
    expect(container.querySelector("[data-passage-part=introduction] i")).toHaveTextContent(
      "The Street"
    );
    expect(container.querySelector("[data-passage-part=excerpt]")).toHaveClass("indent-4");
    expect(container.querySelector("[data-passage-part=copyright]")).toHaveClass(
      "text-right",
      "text-sm"
    );
    expect(container.textContent).not.toContain("Which choice");
  });
  it("does not infer semantic structure for an unreviewed flattened passage", () => {
    const { container } = render(<ReviewedSinglePassage passage={fixture.passage} />);
    expect(container.querySelector("[data-passage-part]")).toBeNull();
    expect(container.textContent).toBe(fixture.passage);
  });
});

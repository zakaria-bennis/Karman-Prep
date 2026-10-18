// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import QuizResults from "./QuizResults";

afterEach(cleanup);

describe("quiz result evidence language", () => {
  it.each([
    { correct: 2, total: 2, band: "mastered" as const, next: "Review your reasoning" },
    { correct: 1, total: 2, band: "developing" as const, next: "Review the questions" },
  ])("keeps $band language limited to the completed quiz", ({ correct, total, band, next }) => {
    render(
      <QuizResults
        score={(correct / total) * 100}
        correct={correct}
        total={total}
        band={band}
        records={[]}
        questions={[]}
        onGoToNext={null}
        onRetake={() => {}}
      />
    );

    expect(screen.getByText("This quiz only")).toBeTruthy();
    expect(screen.getByText(/Repeating the same questions does not show/)).toBeTruthy();
    expect(screen.getByText(new RegExp(next))).toBeTruthy();
    expect(screen.queryByText(/mastered this concept|lock this in for good/i)).toBeNull();
  });
});

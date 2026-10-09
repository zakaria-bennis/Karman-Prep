// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { scoreDiagnostic } from "@/lib/diagnostic-scoring";
import DiagnosticResults from "./DiagnosticResults";

afterEach(cleanup);
describe("diagnostic result claims", () => {
  it("shows measured performance without an official-score forecast or refund promise", () => {
    const scoring = scoreDiagnostic([
      { questionId: "one", domain: "algebra", difficulty: 1, correct: true },
      { questionId: "two", domain: "algebra", difficulty: 2, correct: false },
    ]);
    const { container } = render(
      <DiagnosticResults
        scoring={scoring}
        totalQuestions={2}
        answers={{ one: "A", two: "A" }}
        questions={[
          { id: "one", correct: "A" },
          { id: "two", correct: "B" },
        ]}
        isSubscribed
      />
    );
    expect(screen.getByText("1/2 correct · 50% accuracy")).toBeTruthy();
    expect(screen.getByText(/They do not predict an/)).toBeTruthy();
    expect(container.textContent).not.toMatch(/Predicted SAT|8 weeks|50.point|money.back|\b400\b/);
    expect(screen.getByRole("link", { name: /Open your SAT week/ })).toHaveAttribute(
      "href",
      "/dashboard/student"
    );
  });

  it("does not invent trial eligibility and handles an empty sample", () => {
    render(
      <DiagnosticResults
        scoring={scoreDiagnostic([])}
        totalQuestions={0}
        answers={{}}
        questions={[]}
        isSubscribed={false}
      />
    );
    expect(screen.getByText("0/0 correct · 0% accuracy")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Review your plan options/ })).toHaveAttribute(
      "href",
      "/billing"
    );
    expect(screen.queryByText(/Start.*trial/i)).toBeNull();
  });
});

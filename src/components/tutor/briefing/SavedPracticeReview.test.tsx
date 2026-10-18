// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SavedPracticeReview from "./SavedPracticeReview";
import { presentSavedSession } from "@/lib/educator-briefing/saved-practice";
import { saved, response } from "@/lib/educator-briefing/fixtures.test-helper";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("student-perspective historical review", () => {
  it("uses the actual question component with local unsaved selections and unchanged original answer", () => {
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    const review = presentSavedSession(saved(), [response()]);
    const before = JSON.stringify(review);
    const { unmount } = render(<SavedPracticeReview review={review} />);
    fireEvent.click(screen.getByRole("radio", { name: "Choice A" }));
    expect((screen.getByRole("radio", { name: "Choice A" }) as HTMLInputElement).checked).toBe(
      true
    );
    expect(screen.getByText("B")).toBeTruthy();
    expect(screen.getByText("Saved result: Missed")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /submit|start|finish/i })).toBeNull();
    expect(request).not.toHaveBeenCalled();
    expect(JSON.stringify(review)).toBe(before);
    unmount();
    render(<SavedPracticeReview review={review} />);
    expect((screen.getByRole("radio", { name: "Choice A" }) as HTMLInputElement).checked).toBe(
      false
    );
  });
  it("has a stable destination per question without answer keys or explanations", () => {
    const { container } = render(
      <SavedPracticeReview review={presentSavedSession(saved(), [response()])} />
    );
    expect(container.querySelector("#question-1")).toBeTruthy();
    expect(container.textContent).not.toMatch(/PRIVATE_/);
    expect(screen.getByText(/not graded or saved/)).toBeTruthy();
  });
});

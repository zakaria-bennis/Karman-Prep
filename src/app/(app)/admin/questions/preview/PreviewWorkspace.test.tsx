// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PreviewWorkspace } from "./PreviewWorkspace";

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true });
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);
describe("phone question workspace navigation", () => {
  it("labels the list disclosure and returns focus to the question after selection", async () => {
    const user = userEvent.setup();
    render(
      <PreviewWorkspace
        inspection={null}
        questions={(returnToQuestion) => (
          <button onClick={returnToQuestion}>Select question 2</button>
        )}
      >
        <p>Question content</p>
      </PreviewWorkspace>
    );
    const browse = screen.getByRole("button", { name: "Browse questions" });
    expect(browse).toHaveAttribute("aria-expanded", "false");
    await user.click(browse);
    expect(screen.getByRole("button", { name: "Hide question list" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    await user.click(screen.getByRole("button", { name: "Select question 2" }));
    expect(screen.getByRole("button", { name: "Browse questions" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    expect(document.activeElement).toBe(screen.getByRole("region", { name: "Question workspace" }));
  });

  it("provides a keyboard return path from inspection", async () => {
    const user = userEvent.setup();
    render(
      <PreviewWorkspace inspection={<p>Explanation</p>} questions={() => null}>
        <p>Question content</p>
      </PreviewWorkspace>
    );
    expect(document.activeElement).toBe(
      screen.getByRole("region", { name: "Question inspection" })
    );
    await user.click(screen.getByRole("button", { name: "Back to question" }));
    expect(document.activeElement).toBe(screen.getByRole("region", { name: "Question workspace" }));
  });
});

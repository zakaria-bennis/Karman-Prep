// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PreviewQuestionWithLineage } from "./types";

const actions = vi.hoisted(() => ({
  approve: vi.fn(),
  reject: vi.fn(),
  changes: vi.fn().mockResolvedValue([]),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/admin/actions", () => ({
  actionApproveQuestion: actions.approve,
  actionFlagQuestion: vi.fn(),
  actionSoftRejectQuestion: actions.reject,
  actionBulkApproveQuestions: vi.fn(),
  actionBulkSoftRejectQuestions: vi.fn(),
  actionGetChangedFieldsSet: actions.changes,
}));
vi.mock("@/app/admin/inspector-edit-actions", () => ({ actionUpdatePreviewQuestion: vi.fn() }));
vi.mock("./QuestionPreview", () => ({
  QuestionPreview: ({ q }: { q: PreviewQuestionWithLineage }) => <h1>{q.question_text}</h1>,
}));
import PreviewClient from "./PreviewClient";

beforeEach(() => {
  localStorage.clear();
  window.matchMedia = vi.fn().mockReturnValue({ matches: true });
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);
const rows = [1, 2, 3].map((number) => ({
  id: `q-${number}`,
  question_text: `Question fixture ${number}`,
  subject: "math",
  domain: "Algebra",
  import_status: number === 3 ? "needs_review" : "ok",
  answer_choices: [],
  sourceLineage: null,
})) as unknown as PreviewQuestionWithLineage[];

describe("full preview selected-question navigation", () => {
  it.each([true, false])(
    "takes a successful ID jump to the phone question with the list open=%s",
    async (listOpen) => {
      const user = userEvent.setup();
      render(<PreviewClient initial={rows} />);
      await screen.findByRole("heading", { name: "Question fixture 1" });
      if (listOpen) await user.click(screen.getByRole("button", { name: "Browse questions" }));
      const idInput = screen.getByLabelText("Jump to question ID");
      await user.type(idInput, "q-2{Enter}");
      expect(screen.getByRole("heading", { name: "Question fixture 2" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Browse questions" })).toHaveAttribute(
        "aria-expanded",
        "false"
      );
      const question = screen.getByRole("region", { name: "Question workspace" });
      expect(question).toHaveFocus();
      expect(question.scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "instant" });
      expect(screen.getByRole("status")).toHaveTextContent("Question opened. Filters cleared.");
      // Jumping to the same item must still return focus to its content.
      await user.click(idInput);
      await user.keyboard("{Enter}");
      expect(question).toHaveFocus();
      expect(question.scrollIntoView).toHaveBeenCalledTimes(2);
    }
  );

  it.each(["keyboard", "button"])(
    "keeps the list, selection, filters and input focus when an ID is not loaded via %s",
    async (method) => {
      const user = userEvent.setup();
      render(<PreviewClient initial={rows} />);
      await screen.findByRole("heading", { name: "Question fixture 1" });
      await user.selectOptions(screen.getByLabelText("Question status"), "needs_review");
      await user.click(screen.getByRole("button", { name: "Browse questions" }));
      const idInput = screen.getByLabelText("Jump to question ID");
      await user.type(idInput, "not-loaded");
      if (method === "keyboard") await user.keyboard("{Enter}");
      else await user.click(screen.getByRole("button", { name: "Jump" }));
      expect(screen.getByRole("heading", { name: "Question fixture 3" })).toBeTruthy();
      expect(screen.getByLabelText("Question status")).toHaveValue("needs_review");
      expect(screen.getByRole("button", { name: "Hide question list" })).toHaveAttribute(
        "aria-expanded",
        "true"
      );
      expect(idInput).toHaveFocus();
      expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
      expect(screen.getByRole("status")).toHaveTextContent("No question with that ID is loaded.");
    }
  );

  it("focuses the selected question without phone scrolling on desktop", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const user = userEvent.setup();
    render(<PreviewClient initial={rows} />);
    await screen.findByRole("heading", { name: "Question fixture 1" });
    await user.type(screen.getByLabelText("Jump to question ID"), "q-2{Enter}");
    expect(screen.getByRole("region", { name: "Question workspace" })).toHaveFocus();
    expect(screen.getByRole("heading", { name: "Question fixture 2" })).toBeTruthy();
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it("advances repeatedly with the keyboard and uses the current filtered selection", async () => {
    const user = userEvent.setup();
    render(<PreviewClient initial={rows} />);
    expect(await screen.findByRole("heading", { name: "Question fixture 1" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("heading", { name: "Question fixture 2" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("heading", { name: "Question fixture 3" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByRole("heading", { name: "Question fixture 2" })).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Question status"), "needs_review");
    expect(screen.getByRole("heading", { name: "Question fixture 3" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next question" })).toBeDisabled();
    await user.type(screen.getByLabelText("Jump to question ID"), "q-1");
    await user.click(screen.getByRole("button", { name: "Jump" }));
    expect(screen.getByRole("heading", { name: "Question fixture 1" })).toBeTruthy();
    expect(screen.getByLabelText("Question status")).toHaveValue("all");
    expect(actions.approve).not.toHaveBeenCalled();
    expect(actions.reject).not.toHaveBeenCalled();
  });
});

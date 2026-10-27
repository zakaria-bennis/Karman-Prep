import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  setSavedQuestion: vi.fn(),
  getSavedQuestion: vi.fn(),
  flagQuestion: vi.fn(),
}));
vi.mock("@/lib/auth/dev-auth", () => ({ safeAuth: async () => ({ userId: "user_student" }) }));
vi.mock("@/lib/supabase/queries/quiz/saved", () => ({
  setSavedQuestion: db.setSavedQuestion,
  getSavedQuestion: db.getSavedQuestion,
}));
vi.mock("@/lib/supabase/queries/quiz/flags", () => ({ flagQuestion: db.flagQuestion }));

import {
  actionFlagForTutor,
  actionReportProblem,
  actionToggleBookmark,
} from "./saved-question-actions";

const Q = "00000000-0000-4000-8000-000000000001";
beforeEach(() => vi.clearAllMocks());

describe("bookmarks", () => {
  it("rejects a question id that is not a uuid", async () => {
    await expect(actionToggleBookmark({ questionId: "nope" })).rejects.toThrow();
    expect(db.setSavedQuestion).not.toHaveBeenCalled();
  });
  it("toggling saves, toggling again unsaves", async () => {
    db.getSavedQuestion.mockResolvedValueOnce(null);
    expect(await actionToggleBookmark({ questionId: Q })).toEqual({ saved: true });
    expect(db.setSavedQuestion).toHaveBeenLastCalledWith("user_student", Q, "bookmark");
    db.getSavedQuestion.mockResolvedValueOnce("bookmark");
    expect(await actionToggleBookmark({ questionId: Q })).toEqual({ saved: false });
    expect(db.setSavedQuestion).toHaveBeenLastCalledWith("user_student", Q, null);
  });
  it("a tutor flag is never removed by the bookmark toggle", async () => {
    db.getSavedQuestion.mockResolvedValueOnce("tutor_flag");
    expect(await actionToggleBookmark({ questionId: Q })).toEqual({ saved: true });
    expect(db.setSavedQuestion).not.toHaveBeenCalled();
  });
});

describe("flag for my tutor", () => {
  it("writes the tutor flag and saves the question", async () => {
    await actionFlagForTutor({ questionId: Q, nodeId: "ma-03", note: "Stuck here" });
    expect(db.flagQuestion).toHaveBeenCalledWith({
      question_id: Q,
      student_id: "user_student",
      node_id: "ma-03",
      flag_note: "Stuck here",
    });
    expect(db.setSavedQuestion).toHaveBeenCalledWith("user_student", Q, "tutor_flag");
  });
  it("saves the question even when there is no skill to file the flag under", async () => {
    await actionFlagForTutor({ questionId: Q, nodeId: null, note: null });
    expect(db.flagQuestion).not.toHaveBeenCalled();
    expect(db.setSavedQuestion).toHaveBeenCalledWith("user_student", Q, "tutor_flag");
  });
});

describe("report a problem", () => {
  it("needs a note and does not save the question", async () => {
    await expect(
      actionReportProblem({ questionId: Q, nodeId: "ma-03", note: "" })
    ).rejects.toThrow();
    await actionReportProblem({ questionId: Q, nodeId: "ma-03", note: "Choice C is cut off" });
    expect(db.flagQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ flag_note: "Problem report: Choice C is cut off" })
    );
    expect(db.setSavedQuestion).not.toHaveBeenCalled();
  });
});

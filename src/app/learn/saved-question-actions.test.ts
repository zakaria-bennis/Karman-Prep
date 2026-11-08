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
  actionSetBookmark,
} from "./saved-question-actions";

const Q = "00000000-0000-4000-8000-000000000001";
beforeEach(() => vi.clearAllMocks());

describe("bookmarks", () => {
  it("rejects a question id that is not a uuid", async () => {
    await expect(actionSetBookmark({ questionId: "nope", on: true })).rejects.toThrow();
    expect(db.setSavedQuestion).not.toHaveBeenCalled();
  });
  it("saves what the student asked for, whatever the server had", async () => {
    db.getSavedQuestion.mockResolvedValue("bookmark");
    expect(await actionSetBookmark({ questionId: Q, on: true })).toEqual({ saved: "bookmark" });
    expect(db.setSavedQuestion).toHaveBeenLastCalledWith("user_student", Q, "bookmark");
    db.getSavedQuestion.mockResolvedValue(null);
    expect(await actionSetBookmark({ questionId: Q, on: false })).toEqual({ saved: null });
    expect(db.setSavedQuestion).toHaveBeenLastCalledWith("user_student", Q, null);
  });
  it("a tutor flag is never removed by the bookmark", async () => {
    db.getSavedQuestion.mockResolvedValue("tutor_flag");
    expect(await actionSetBookmark({ questionId: Q, on: false })).toEqual({ saved: "tutor_flag" });
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
  it("files the flag for the tutor even when there is no skill to file it under", async () => {
    await actionFlagForTutor({ questionId: Q, nodeId: null, note: "From the daily card" });
    expect(db.flagQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ node_id: "unassigned", flag_note: "From the daily card" })
    );
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
      expect.objectContaining({
        node_id: "problem-report",
        flag_note: "Problem report: Choice C is cut off",
      })
    );
    expect(db.setSavedQuestion).not.toHaveBeenCalled();
  });
});

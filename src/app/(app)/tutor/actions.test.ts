import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/auth/dev-auth", () => ({ safeAuth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/tutor-access", () => ({
  canTutorAccessStudent: vi.fn(),
  assertStudentFlag: vi.fn(),
}));
vi.mock("@/lib/supabase/queries/tutor", () => ({
  applyTutorNodeOverride: vi.fn(),
  assignCheckpointRetake: vi.fn(),
  overrideCheckpointCooldown: vi.fn(),
}));
vi.mock("@/lib/supabase/queries/quiz", () => ({
  resolveFlaggedQuestion: vi.fn(),
  updateQuestion: vi.fn(),
}));
import { safeAuth } from "@/lib/auth/dev-auth";
import { canTutorAccessStudent, assertStudentFlag } from "@/lib/auth/tutor-access";
import {
  applyTutorNodeOverride,
  assignCheckpointRetake,
  overrideCheckpointCooldown,
} from "@/lib/supabase/queries/tutor";
import { resolveFlaggedQuestion, updateQuestion } from "@/lib/supabase/queries/quiz";
import {
  actionApplyNodeOverride,
  actionAssignCheckpointRetake,
  actionOverrideCooldown,
  actionResolveFlag,
  actionEditFlaggedQuestion,
} from "./actions";

const id = "11111111-1111-4111-8111-111111111111";
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(safeAuth).mockResolvedValue({ userId: "real-tutor" });
  vi.mocked(canTutorAccessStudent).mockResolvedValue(true);
});
it("rejects unsigned callers before mutation", async () => {
  vi.mocked(safeAuth).mockResolvedValue({ userId: null });
  await expect(
    actionAssignCheckpointRetake({ student_id: "student", checkpoint_id: "math:1" })
  ).rejects.toThrow("Not authenticated");
  expect(assignCheckpointRetake).not.toHaveBeenCalled();
});
it("rejects unassigned targets on every mutation", async () => {
  vi.mocked(canTutorAccessStudent).mockResolvedValue(false);
  const calls = [
    () =>
      actionApplyNodeOverride({
        student_id: "other",
        node_id: "ma1",
        override_status: "unlocked",
        locked_pathway: false,
      }),
    () => actionAssignCheckpointRetake({ student_id: "other", checkpoint_id: "math:1" }),
    () => actionOverrideCooldown({ student_id: "other", checkpoint_id: "math:1" }),
    () => actionResolveFlag(id, "other"),
    () => actionEditFlaggedQuestion(id, { question_text: "Edited" }, "other"),
  ];
  for (const call of calls) await expect(call()).rejects.toThrow("Access to this student");
  for (const fn of [
    applyTutorNodeOverride,
    assignCheckpointRetake,
    overrideCheckpointCooldown,
    resolveFlaggedQuestion,
    updateQuestion,
  ])
    expect(fn).not.toHaveBeenCalled();
});
it("ignores a forged tutor ID and retains the authenticated actor", async () => {
  const input = {
    student_id: "assigned",
    node_id: "ma1",
    override_status: "unlocked" as const,
    locked_pathway: false,
    tutor_id: "forged",
  };
  await actionApplyNodeOverride(input);
  expect(canTutorAccessStudent).toHaveBeenCalledWith("real-tutor", "assigned");
  expect(applyTutorNodeOverride).toHaveBeenCalledWith({
    student_id: "assigned",
    node_id: "ma1",
    override_status: "unlocked",
    locked_pathway: false,
    tutor_id: "real-tutor",
  });
});
it("rejects a flag belonging to another student before resolving or editing", async () => {
  vi.mocked(assertStudentFlag).mockRejectedValue(new Error("Flag does not belong"));
  await expect(actionResolveFlag(id, "assigned")).rejects.toThrow("does not belong");
  await expect(
    actionEditFlaggedQuestion(id, { question_text: "Edited" }, "assigned")
  ).rejects.toThrow("does not belong");
  expect(resolveFlaggedQuestion).not.toHaveBeenCalled();
  expect(updateQuestion).not.toHaveBeenCalled();
});
it("allows a valid flagged-question edit and strips unapproved fields", async () => {
  await actionEditFlaggedQuestion(
    id,
    { question_text: "Edited", is_live: true } as Parameters<typeof actionEditFlaggedQuestion>[1],
    "assigned"
  );
  expect(assertStudentFlag).toHaveBeenCalledWith("assigned", { questionId: id });
  expect(updateQuestion).toHaveBeenCalledWith(id, { question_text: "Edited" });
});
it("rejects invalid inputs without making writes", async () => {
  await expect(
    actionOverrideCooldown({ student_id: "assigned", checkpoint_id: "anything" })
  ).rejects.toThrow();
  await expect(actionResolveFlag("invalid", "assigned")).rejects.toThrow();
  expect(overrideCheckpointCooldown).not.toHaveBeenCalled();
  expect(resolveFlaggedQuestion).not.toHaveBeenCalled();
});

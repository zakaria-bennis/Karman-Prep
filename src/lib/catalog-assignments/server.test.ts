import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./server-access", () => ({
  currentAssignmentActor: vi.fn(),
  assignmentRelationships: { tutorHasStudent: vi.fn() },
}));
vi.mock("./selection", () => ({
  catalogAssignmentSelection: { select: vi.fn(), questionId: vi.fn(), sameVersion: vi.fn() },
}));
vi.mock("./store", () => ({ catalogAssignmentStore: {} }));

import { currentAssignmentActor } from "./server-access";
import {
  assignmentSummary,
  catalogAssignmentService,
  loadActiveAssignment,
  loadActiveAssignmentBindings,
} from "./server";

const binding = {
  questionId: "11111111-1111-4111-8111-111111111111",
  stableQuestionId: "source-Q1",
  catalogSkillId: "ma-skill-linear-equations-in-one-variable",
  payloadSha256: "a".repeat(64),
};
const record = {
  id: "22222222-2222-4222-8222-222222222222",
  requestId: "33333333-3333-4333-8333-333333333333",
  requestFingerprint: "synthetic",
  educatorClerkId: "tutor-a",
  studentClerkId: "student-a",
  skillId: binding.catalogSkillId,
  questionIds: [binding.questionId],
  deliveries: [
    {
      snapshot: {
        binding,
        answer: { correctAnswer: "A" },
        student: { question_text: "Synthetic question" },
      },
      sourcePdf: "synthetic-exam.pdf",
      sourcePage: 1,
    },
  ],
  title: "Practice",
  dueAt: null,
  status: "active" as const,
  revision: 2,
};

beforeEach(() => vi.resetAllMocks());

describe("assignment server projections", () => {
  it("returns plan metadata without a key, explanation, or private snapshot", () => {
    const visible = assignmentSummary(record as never);
    expect(visible).toEqual({
      id: record.id,
      studentClerkId: "student-a",
      skillId: binding.catalogSkillId,
      title: "Practice",
      dueAt: null,
      status: "active",
      revision: 2,
      questionCount: 1,
    });
    expect(JSON.stringify(visible)).not.toMatch(/correctAnswer|answer|snapshot|sourcePdf/);
  });

  it("rechecks the signed-in student before returning ordered bindings to practice", async () => {
    vi.mocked(currentAssignmentActor).mockResolvedValue({
      clerkId: "student-b",
      role: "student",
    });
    const active = vi.spyOn(catalogAssignmentService, "activeForStudent");
    await expect(loadActiveAssignmentBindings(record.id, "student-a")).rejects.toThrow(
      "Student assignment access required"
    );
    expect(active).not.toHaveBeenCalled();

    vi.mocked(currentAssignmentActor).mockResolvedValue({
      clerkId: "student-a",
      role: "student",
    });
    active.mockResolvedValue(record as never);
    expect(await loadActiveAssignmentBindings(record.id, "student-a")).toEqual([binding]);
    expect(await loadActiveAssignment(record.id, "student-a")).toEqual({
      skillId: binding.catalogSkillId,
      items: [binding],
    });
    expect(active).toHaveBeenCalledWith({ clerkId: "student-a", role: "student" }, record.id);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { catalogQuestion, catalogSkillId } from "../../../tests/fixtures/approved-catalog";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), role: vi.fn(), access: vi.fn(), pool: vi.fn() }));
vi.mock("@/lib/auth/dev-auth", () => ({ safeAuth: mocks.auth }));
vi.mock("@/lib/supabase/queries/admin", () => ({ fetchUserRole: mocks.role }));
vi.mock("@/lib/auth/tutor-access", () => ({ canTutorAccessStudent: mocks.access }));
vi.mock("@/lib/supabase/queries/catalog-question-pool", () => ({
  fetchCatalogQuestionPool: mocks.pool,
}));
import { actionCatalogPracticePool, actionCatalogAssignmentPool } from "./catalog-actions";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ userId: "synthetic-student" });
  mocks.role.mockResolvedValue("student");
  mocks.access.mockResolvedValue(false);
  mocks.pool.mockResolvedValue([catalogQuestion()]);
});
describe("canonical practice and assignment pool boundaries", () => {
  it("exposes answer-free student question payloads and an honest empty pool", async () => {
    const questions = await actionCatalogPracticePool({ skillId: catalogSkillId });
    expect(questions[0].question_text).toBe("What is x if x + 2 = 5?");
    expect(questions[0]).not.toHaveProperty("correct_answer");
    expect(questions[0]).not.toHaveProperty("explanation_text");
    expect(questions[0]).not.toHaveProperty("reviewed_numeric_answers");
    expect(questions[0]).not.toHaveProperty("raw_model_response");
    mocks.pool.mockResolvedValue([]);
    expect(await actionCatalogPracticePool({ skillId: catalogSkillId })).toEqual([]);
  });
  it("denies parent/tutor/signed-out practice calls before reading questions", async () => {
    for (const role of ["parent", "tutor", null]) {
      mocks.role.mockResolvedValue(role);
      await expect(actionCatalogPracticePool({ skillId: catalogSkillId })).rejects.toThrow(
        /Student access/
      );
    }
    mocks.auth.mockResolvedValue({ userId: null });
    await expect(actionCatalogPracticePool({ skillId: catalogSkillId })).rejects.toThrow(
      /Student access/
    );
    expect(mocks.pool).not.toHaveBeenCalled();
  });
  it("requires current tutor relationship for assignment preview and cannot send or create work", async () => {
    const input = { studentId: "synthetic-linked-student", scope: { skillId: catalogSkillId } };
    await expect(actionCatalogAssignmentPool(input)).rejects.toThrow(/Assigned tutor access/);
    expect(mocks.pool).not.toHaveBeenCalled();
    mocks.auth.mockResolvedValue({ userId: "synthetic-tutor" });
    mocks.access.mockResolvedValue(true);
    const result = await actionCatalogAssignmentPool(input);
    expect(mocks.access).toHaveBeenLastCalledWith("synthetic-tutor", "synthetic-linked-student");
    expect(result[0]).not.toHaveProperty("correct_answer");
    mocks.access.mockResolvedValue(false);
    await expect(actionCatalogAssignmentPool(input)).rejects.toThrow(/Assigned tutor access/);
    expect(mocks.pool).toHaveBeenCalledTimes(1);
  });
});

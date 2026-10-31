import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  userId: "student-1" as string | null,
  role: "student" as string | null,
  owned: vi.fn(),
  assignment: vi.fn(),
  pool: vi.fn(),
}));
vi.mock("@/lib/auth/dev-auth", () => ({ safeAuth: async () => ({ userId: mocks.userId }) }));
vi.mock("@/lib/supabase/queries/admin", () => ({ fetchUserRole: async () => mocks.role }));
vi.mock("@/lib/supabase/queries/catalog-question-pool", () => ({
  fetchCatalogQuestionPool: mocks.pool,
}));
vi.mock("@/lib/catalog-assignments/server", () => ({
  loadActiveAssignment: mocks.assignment,
}));
vi.mock("@/lib/catalog-practice/supabase-store", () => ({
  loadCatalogQuestionEvidence: vi.fn(),
  supabaseCatalogSessionStore: { getOwned: mocks.owned },
}));
import { actionResumeCatalogPractice, actionStartCatalogPractice } from "./catalog-quiz-actions";

const sessionId = "00000000-0000-4000-8000-000000000003";
beforeEach(() => {
  mocks.userId = "student-1";
  mocks.role = "student";
  mocks.owned.mockReset().mockResolvedValue(null);
  mocks.assignment.mockReset();
  mocks.pool.mockReset();
});

describe("canonical practice action authorization", () => {
  it("rejects signed-out and wrong-role requests before touching sessions", async () => {
    mocks.userId = null;
    await expect(actionResumeCatalogPractice(sessionId)).rejects.toThrow("Student access required");
    mocks.userId = "tutor-1";
    mocks.role = "tutor";
    await expect(actionResumeCatalogPractice(sessionId)).rejects.toThrow("Student access required");
    expect(mocks.owned).not.toHaveBeenCalled();
  });
  it("uses the authenticated Clerk ID and rejects another student's session", async () => {
    await expect(actionResumeCatalogPractice(sessionId)).rejects.toThrow("unavailable");
    expect(mocks.owned).toHaveBeenCalledWith(sessionId, "student-1");
  });
  it("loads assigned bindings for the authenticated student before selecting a pool", async () => {
    mocks.assignment.mockResolvedValue({
      skillId: "ma-skill-linear-equations-in-one-variable",
      items: [],
    });
    mocks.pool.mockResolvedValue([]);
    await expect(
      actionStartCatalogPractice({
        skillId: "ma-skill-linear-equations-in-one-variable",
        assignmentId: sessionId,
      })
    ).rejects.toThrow("No distinct approved questions");
    expect(mocks.assignment).toHaveBeenCalledWith(sessionId, "student-1");
  });
});

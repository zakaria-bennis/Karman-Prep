import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/queries/admin", () => ({ fetchUserRole: vi.fn() }));
vi.mock("@/lib/supabase/queries/tutor", () => ({ fetchTutorScope: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createAdminClient: vi.fn() }));

import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { fetchTutorScope } from "@/lib/supabase/queries/tutor";
import { createAdminClient } from "@/lib/supabase/server";
import { assertStudentFlag, canTutorAccessStudent } from "./tutor-access";

beforeEach(() => vi.resetAllMocks());

describe("tutor student access", () => {
  it.each([null, "student", "parent"] as const)(
    "denies role %s before reading scope",
    async (role) => {
      vi.mocked(fetchUserRole).mockResolvedValue(role);
      expect(await canTutorAccessStudent("caller", "student")).toBe(false);
      expect(fetchTutorScope).not.toHaveBeenCalled();
    }
  );
  it("allows administrators without an assignment", async () => {
    vi.mocked(fetchUserRole).mockResolvedValue("admin");
    expect(await canTutorAccessStudent("admin", "student")).toBe(true);
    expect(fetchTutorScope).not.toHaveBeenCalled();
  });
  it("allows assigned students and denies unrelated students", async () => {
    vi.mocked(fetchUserRole).mockResolvedValue("tutor");
    vi.mocked(fetchTutorScope).mockResolvedValue({
      cohorts: [],
      tutorUserId: "tutor-id",
      studentClerkIds: ["assigned"],
    });
    expect(await canTutorAccessStudent("tutor", "assigned")).toBe(true);
    expect(await canTutorAccessStudent("tutor", "unrelated")).toBe(false);
  });
  it("does not allow access on a scope-query error", async () => {
    vi.mocked(fetchUserRole).mockResolvedValue("tutor");
    vi.mocked(fetchTutorScope).mockRejectedValue(new Error("unavailable"));
    await expect(canTutorAccessStudent("tutor", "student")).rejects.toThrow("unavailable");
  });
});

describe("student flag ownership", () => {
  function fixture(result: { data: { id: string } | null; error: Error | null }) {
    const query = { select: vi.fn(), eq: vi.fn(), limit: vi.fn(), maybeSingle: vi.fn() };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue(result);
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue(query),
    } as unknown as ReturnType<typeof createAdminClient>);
    return query;
  }
  it("requires the flag ID and student ID to match", async () => {
    const q = fixture({ data: { id: "flag" }, error: null });
    await assertStudentFlag("assigned", { flagId: "flag" });
    expect(q.eq).toHaveBeenCalledWith("student_id", "assigned");
    expect(q.eq).toHaveBeenCalledWith("id", "flag");
  });
  it("requires a matching question flag for the submitted student", async () => {
    const q = fixture({ data: null, error: null });
    await expect(assertStudentFlag("assigned", { questionId: "other-question" })).rejects.toThrow(
      "does not belong"
    );
    expect(q.eq).toHaveBeenCalledWith("student_id", "assigned");
    expect(q.eq).toHaveBeenCalledWith("question_id", "other-question");
  });
  it("fails closed on database errors", async () => {
    fixture({ data: null, error: new Error("unavailable") });
    await expect(assertStudentFlag("assigned", { flagId: "flag" })).rejects.toThrow("unavailable");
  });
});

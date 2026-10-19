import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/catalog-assignments/server-access", () => ({
  currentAssignmentActor: vi.fn(),
  assignmentRelationships: { tutorHasStudent: vi.fn() },
}));
vi.mock("@/lib/supabase/queries/admin", () => ({ resolveEffectiveClerkId: vi.fn() }));
import {
  currentAssignmentActor,
  assignmentRelationships,
} from "@/lib/catalog-assignments/server-access";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { requireBriefingEducator } from "./access";
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(currentAssignmentActor).mockResolvedValue({ clerkId: "tutor-a", role: "tutor" });
  vi.mocked(resolveEffectiveClerkId).mockResolvedValue({
    clerkId: "tutor-a",
    realClerkId: "tutor-a",
    isImpersonating: false,
  });
});
describe("educator briefing access", () => {
  it.each(["student", "parent", null] as const)(
    "denies %s without student lookup",
    async (role) => {
      vi.mocked(currentAssignmentActor).mockResolvedValue({ clerkId: "caller", role });
      await expect(requireBriefingEducator("student-a")).rejects.toThrow("Educator access");
      expect(assignmentRelationships.tutorHasStudent).not.toHaveBeenCalled();
    }
  );
  it("denies a revoked tutor relationship", async () => {
    vi.mocked(assignmentRelationships.tutorHasStudent).mockResolvedValue(false);
    await expect(requireBriefingEducator("student-a")).rejects.toThrow(
      "Student briefing unavailable"
    );
    expect(assignmentRelationships.tutorHasStudent).toHaveBeenCalledWith("tutor-a", "student-a");
  });
  it("allows a current relationship", async () => {
    vi.mocked(assignmentRelationships.tutorHasStudent).mockResolvedValue(true);
    expect(await requireBriefingEducator("student-a")).toMatchObject({ clerkId: "tutor-a" });
  });
  it("does not substitute an impersonated student or tutor", async () => {
    vi.mocked(resolveEffectiveClerkId).mockResolvedValue({
      clerkId: "other-persona",
      realClerkId: "tutor-a",
      isImpersonating: true,
    });
    await expect(requireBriefingEducator("student-a")).rejects.toThrow("Leave account preview");
    expect(assignmentRelationships.tutorHasStudent).not.toHaveBeenCalled();
  });
  it("keeps the existing real admin read permission", async () => {
    vi.mocked(currentAssignmentActor).mockResolvedValue({ clerkId: "admin-a", role: "admin" });
    vi.mocked(resolveEffectiveClerkId).mockResolvedValue({
      clerkId: "admin-a",
      realClerkId: "admin-a",
      isImpersonating: false,
    });
    expect(await requireBriefingEducator("student-a")).toMatchObject({ role: "admin" });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/dev-auth", () => ({ safeAuth: vi.fn() }));
vi.mock("@/lib/auth/tutor-access", () => ({ canTutorAccessStudent: vi.fn() }));
vi.mock("@/lib/supabase/queries/admin", () => ({ fetchUserRole: vi.fn() }));

import { safeAuth } from "@/lib/auth/dev-auth";
import { canTutorAccessStudent } from "@/lib/auth/tutor-access";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { assignmentRelationships, currentAssignmentActor } from "./server-access";

beforeEach(() => vi.resetAllMocks());

describe("assignment server identity", () => {
  it("rejects an unsigned caller before querying a role", async () => {
    vi.mocked(safeAuth).mockResolvedValue({ userId: null });
    await expect(currentAssignmentActor()).rejects.toThrow("Not authenticated");
    expect(fetchUserRole).not.toHaveBeenCalled();
  });

  it("derives role from the authenticated identity and checks current tutor scope", async () => {
    vi.mocked(safeAuth).mockResolvedValue({ userId: "tutor-a" });
    vi.mocked(fetchUserRole).mockResolvedValue("tutor");
    vi.mocked(canTutorAccessStudent).mockResolvedValue(false);
    expect(await currentAssignmentActor()).toEqual({ clerkId: "tutor-a", role: "tutor" });
    expect(await assignmentRelationships.tutorHasStudent("tutor-a", "student-a")).toBe(false);
    expect(canTutorAccessStudent).toHaveBeenCalledWith("tutor-a", "student-a");
  });
});

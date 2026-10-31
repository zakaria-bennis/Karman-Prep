// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ auth: vi.fn(), effective: vi.fn(), user: vi.fn() }));
vi.mock("@/lib/auth/dev-auth", () => ({ safeAuth: mock.auth }));
vi.mock("@/lib/supabase/queries/admin", () => ({ resolveEffectiveClerkId: mock.effective }));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mock.user }) }) }),
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
import StudentDashboardLayout from "./layout";
beforeEach(() => {
  mock.auth.mockResolvedValue({ userId: "synthetic" });
  mock.effective.mockResolvedValue({ clerkId: "synthetic", isImpersonating: false });
  mock.user.mockResolvedValue({ data: { role: "student", onboarding_completed_at: "2026-10-06" } });
});
describe("student portal boundary", () => {
  it.each([
    ["parent", "/dashboard/parent"],
    ["tutor", "/tutor"],
  ])("returns %s to its portal before onboarding", async (role, path) => {
    mock.user.mockResolvedValue({ data: { role, onboarding_completed_at: null } });
    await expect(StudentDashboardLayout({ children: "student" })).rejects.toThrow(
      `redirect:${path}`
    );
  });
  it("requires sign-in", async () => {
    mock.auth.mockResolvedValue({ userId: null });
    await expect(StudentDashboardLayout({ children: "student" })).rejects.toThrow(
      "redirect:/auth/sign-in"
    );
  });
  it("keeps student onboarding and admin read previews", async () => {
    mock.user.mockResolvedValue({ data: { role: "student", onboarding_completed_at: null } });
    await expect(StudentDashboardLayout({ children: "student" })).rejects.toThrow(
      "redirect:/onboarding/questionnaire"
    );
    mock.effective.mockResolvedValue({ clerkId: "synthetic", isImpersonating: true });
    await expect(StudentDashboardLayout({ children: "student" })).resolves.toMatchObject({
      props: { children: "student" },
    });
  });
});

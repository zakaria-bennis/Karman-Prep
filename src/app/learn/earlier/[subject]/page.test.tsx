// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  auth: vi.fn(),
  effective: vi.fn(),
  role: vi.fn(),
  read: vi.fn(),
  init: vi.fn(),
  owner: vi.fn(),
}));
vi.mock("@/lib/auth/dev-auth", () => ({ safeAuth: mock.auth }));
vi.mock("@/lib/supabase/queries/admin", () => ({
  resolveEffectiveClerkId: mock.effective,
  fetchUserRole: mock.role,
}));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: (_: string, owner: string) => {
          mock.owner(owner);
          return { in: mock.read };
        },
      }),
    }),
  }),
}));
vi.mock("@/app/learn/actions", () => ({ initUserProgress: mock.init }));
vi.mock("@/components/learn/ConstellationMap", () => ({ default: () => null }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
  notFound: () => {
    throw new Error("not-found");
  },
}));
import EarlierPracticePage from "./page";
const input = { params: Promise.resolve({ subject: "math" }) };
beforeEach(() => {
  vi.clearAllMocks();
  mock.auth.mockResolvedValue({ userId: "real-owner" });
  mock.effective.mockResolvedValue({ clerkId: "real-owner", isImpersonating: false });
  mock.role.mockResolvedValue("student");
  mock.read.mockResolvedValue({
    data: [
      { node_id: "rw-00", status: "available" },
      { node_id: "ma-00", status: "available" },
    ],
    error: null,
  });
  mock.init.mockResolvedValue(undefined);
});
describe("earlier practice route", () => {
  it.each([
    ["parent", "/dashboard/parent"],
    ["tutor", "/tutor"],
  ])("returns %s to its own portal without writing progress", async (role, path) => {
    mock.role.mockResolvedValue(role);
    await expect(EarlierPracticePage(input)).rejects.toThrow(`redirect:${path}`);
    expect(mock.read).not.toHaveBeenCalled();
    expect(mock.init).not.toHaveBeenCalled();
  });
  it("refetches after initializing a missing subject and scopes reads to the owner", async () => {
    mock.read.mockResolvedValueOnce({
      data: [{ node_id: "rw-00", status: "mastered" }],
      error: null,
    });
    await EarlierPracticePage(input);
    expect(mock.init).toHaveBeenCalledExactlyOnceWith("math");
    expect(mock.read).toHaveBeenCalledTimes(2);
    expect(mock.owner.mock.calls).toEqual([["real-owner"], ["real-owner"]]);
  });
  it("keeps admin impersonation read-only", async () => {
    mock.effective.mockResolvedValue({ clerkId: "preview-student", isImpersonating: true });
    mock.read.mockResolvedValue({ data: [], error: null });
    await EarlierPracticePage(input);
    expect(mock.owner).toHaveBeenCalledWith("preview-student");
    expect(mock.init).not.toHaveBeenCalled();
  });
  it("does not initialize progress after a database read error", async () => {
    mock.read.mockResolvedValue({ data: null, error: new Error("Local fixture DB unavailable") });
    await expect(EarlierPracticePage(input)).rejects.toThrow("DB unavailable");
    expect(mock.init).not.toHaveBeenCalled();
  });
});

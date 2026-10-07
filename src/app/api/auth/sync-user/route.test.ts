import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ lookup: vi.fn(), upsert: vi.fn(), userId: "synthetic" }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: m.userId }),
  currentUser: async () => ({ emailAddresses: [{ emailAddress: "fixture@example.invalid" }] }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: m.lookup }) }),
      upsert: m.upsert,
    }),
  }),
}));
import { POST } from "./route";
const request = (role?: string) =>
  new Request("https://example.invalid/api/auth/sync-user", {
    method: "POST",
    body: JSON.stringify(role ? { role } : {}),
  });
beforeEach(() => {
  vi.clearAllMocks();
  m.userId = "synthetic";
  m.lookup.mockResolvedValue({ data: null, error: null });
  m.upsert.mockResolvedValue({ error: null });
  vi.stubGlobal("fetch", () => {
    throw new Error("Network disabled in regression test");
  });
});
it.each([null, { role: "student" }])(
  "rejects unapproved tutor selection with profile %j",
  async (profile) => {
    m.lookup.mockResolvedValue({ data: profile, error: null });
    expect((await POST(request("tutor") as never)).status).toBe(403);
    expect(m.upsert).not.toHaveBeenCalled();
  }
);
it("creates only a student and atomically ignores existing Clerk identities", async () => {
  expect((await POST(request() as never)).status).toBe(200);
  expect(m.upsert).toHaveBeenCalledWith(expect.objectContaining({ role: "student" }), {
    onConflict: "clerk_id",
    ignoreDuplicates: true,
  });
});
it.each(["tutor", "admin", "parent"])(
  "preserves approved existing %s during ordinary sync",
  async (role) => {
    m.lookup.mockResolvedValue({ data: { role, signup_ip: "fixture" }, error: null });
    expect((await POST(request(role === "tutor" ? "tutor" : undefined) as never)).status).toBe(200);
    expect(m.upsert.mock.calls[0][1]).toEqual({ onConflict: "clerk_id", ignoreDuplicates: true });
  }
);
it("fails closed on role lookup failure", async () => {
  m.lookup.mockResolvedValue({ error: new Error("Synthetic lookup failure") });
  expect((await POST(request() as never)).status).toBe(500);
  expect(m.upsert).not.toHaveBeenCalled();
});
it("rejects admin self-selection", async () => {
  expect((await POST(request("admin") as never)).status).toBe(400);
  expect(m.upsert).not.toHaveBeenCalled();
});

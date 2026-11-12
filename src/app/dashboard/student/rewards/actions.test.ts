import { beforeEach, describe, expect, it, vi } from "vitest";

const open = vi.fn();
const who = { userId: "student_1", effective: "student_1", preview: false, role: "student" };

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/dev-auth", () => ({ safeAuth: async () => ({ userId: who.userId }) }));
vi.mock("@/lib/supabase/queries/admin", () => ({
  resolveEffectiveClerkId: async () => ({ clerkId: who.effective, isImpersonating: who.preview }),
  fetchUserRole: async () => who.role,
}));
vi.mock("@/lib/rewards/server", () => {
  class NotEnoughTokens extends Error {}
  return {
    NotEnoughTokens,
    openRewardBox: (...a: unknown[]) => open(...a),
    loadRewardState: vi.fn(),
    markCompanionsSeen: vi.fn(),
    setRewardWear: vi.fn(),
  };
});

const tap = "6f1b8f0e-3a52-4d8e-9a4f-0d1c2b3a4e5f";

describe("actionOpenBox", () => {
  beforeEach(() => {
    open.mockReset();
    Object.assign(who, { effective: "student_1", preview: false, role: "student" });
  });

  it("opens the signed-in student's own box for one tap", async () => {
    const { actionOpenBox } = await import("./actions");
    open.mockResolvedValue({
      prize: { kind: "accessory", id: "bow" },
      balance: 10,
      repeated: false,
    });
    const r = await actionOpenBox({ requestId: tap });
    expect(r.ok).toBe(true);
    expect(open).toHaveBeenCalledWith("student_1", tap);
  });

  it("refuses a request that is not one tap's id", async () => {
    const { actionOpenBox } = await import("./actions");
    const r = await actionOpenBox({ requestId: "again" });
    expect(r.ok).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });

  it("lets an admin previewing a student look but never spend", async () => {
    const { actionOpenBox } = await import("./actions");
    Object.assign(who, { preview: true });
    const r = await actionOpenBox({ requestId: tap });
    expect(r).toMatchObject({ ok: false });
    expect(open).not.toHaveBeenCalled();
  });

  it("says plainly when there are not enough tokens", async () => {
    const { actionOpenBox } = await import("./actions");
    const { NotEnoughTokens } = await import("@/lib/rewards/server");
    open.mockRejectedValue(new NotEnoughTokens());
    const r = await actionOpenBox({ requestId: tap });
    expect(r).toEqual({
      ok: false,
      error: "Not enough tokens for a box yet. Answer a few more questions.",
    });
  });
});

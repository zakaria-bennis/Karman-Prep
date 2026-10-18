import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), role: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/supabase/queries/admin", () => ({ requireRole: mocks.role }));
import { POST as initUpload } from "@/app/api/admin/pdf-pipeline/init-upload/route";
import { POST as dispatch } from "@/app/api/admin/pdf-pipeline/dispatch/route";

beforeEach(() => {
  vi.resetAllMocks();
});
describe.each([
  ["upload", initUpload],
  ["dispatch", dispatch],
] as const)("retired %s", (_name, post) => {
  it("retains unsigned and non-admin permission boundaries", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    expect((await post()).status).toBe(401);
    expect(mocks.role).not.toHaveBeenCalled();
    mocks.auth.mockResolvedValue({ userId: "student" });
    mocks.role.mockResolvedValue(false);
    expect((await post()).status).toBe(403);
    expect(mocks.role).toHaveBeenCalledWith("student", ["admin"]);
  });
  it("gives admins a retirement response without dispatching or writing", async () => {
    mocks.auth.mockResolvedValue({ userId: "admin" });
    mocks.role.mockResolvedValue(true);
    const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("External call"));
    try {
      const response = await post();
      expect(response.status).toBe(410);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toMatchObject({ error: expect.stringContaining("retired") });
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  role: vi.fn(),
  update: vi.fn(),
  client: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth, clerkClient: mocks.client }));
vi.mock("@/lib/supabase/queries/admin", () => ({ fetchUserRole: mocks.role }));
import { saveThemePreference } from "./actions";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ userId: "owner" });
  mocks.role.mockResolvedValue("student");
  mocks.client.mockResolvedValue({ users: { updateUserMetadata: mocks.update } });
});
describe("own-account appearance writes", () => {
  it.each(["student", "parent", "tutor"])(
    "merges one cosmetic ID for the signed-in %s",
    async (role) => {
      mocks.role.mockResolvedValue(role);
      await saveThemePreference("sage");
      expect(mocks.update).toHaveBeenCalledWith("owner", {
        unsafeMetadata: { karmanTheme: "sage" },
      });
    }
  );
  it("rejects unsigned requests before looking up roles or creating a client", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    await expect(saveThemePreference("sage")).rejects.toThrow("Unauthorized");
    expect(mocks.role).not.toHaveBeenCalled();
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it.each(["admin", null])(
    "does not treat impersonation or a %s role as a student's account",
    async (role) => {
      mocks.role.mockResolvedValue(role);
      await expect(saveThemePreference("sage")).rejects.toThrow("Forbidden");
      expect(mocks.update).not.toHaveBeenCalled();
    }
  );
  it.each(["unknown", "dark", "background:red", { id: "sage", userId: "other" }])(
    "rejects non-allowlisted payloads",
    async (input) => {
      await expect(saveThemePreference(input as string)).rejects.toThrow();
      expect(mocks.auth).not.toHaveBeenCalled();
      expect(mocks.update).not.toHaveBeenCalled();
    }
  );
});

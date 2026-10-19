import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppRole } from "@/lib/supabase/queries/admin";

const mocks = vi.hoisted(() => ({
  safeAuth: vi.fn(),
  fetchUserRole: vi.fn(),
  resolveEffectiveRole: vi.fn(),
  cf: vi.fn(),
}));
vi.mock("@/lib/auth/dev-auth", () => ({ safeAuth: mocks.safeAuth }));
vi.mock("@/lib/supabase/queries/admin", () => ({
  fetchUserRole: mocks.fetchUserRole,
  resolveEffectiveRole: mocks.resolveEffectiveRole,
}));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: mocks.cf }));

import {
  defaultVersionDeps,
  readCalculatorRollout,
  resolveCalculatorVersion,
  resolveCalculatorVersionWith,
  type CalculatorRollout,
  type VersionDeps,
} from "./calculator-version";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

function deps(rollout: CalculatorRollout, over: Partial<VersionDeps> = {}) {
  return {
    rollout: () => rollout,
    userId: vi.fn(async (): Promise<string | null> => "user_1"),
    role: vi.fn(async (): Promise<AppRole | null> => "admin"),
    ...over,
  };
}

describe("calculator version resolver", () => {
  it("AR-6 readCalculatorRollout accepts off, admins and everyone and maps anything else to off", () => {
    expect(
      ["off", "admins", "everyone", " admins\n", undefined, "", "Admins", "on"].map(
        readCalculatorRollout
      )
    ).toEqual(["off", "admins", "everyone", "admins", "off", "off", "off", "off"]);
  });

  it("AR-6 off gives v1 and everyone gives v2 without a user or role query", async () => {
    const off = deps("off");
    const everyone = deps("everyone");
    await expect(resolveCalculatorVersionWith(off)).resolves.toBe("v1");
    await expect(resolveCalculatorVersionWith(everyone)).resolves.toBe("v2");
    for (const d of [off, everyone]) {
      expect(d.userId).not.toHaveBeenCalled();
      expect(d.role).not.toHaveBeenCalled();
    }
  });

  it("AR-6 admins gives v2 only when the signed-in user's role is admin", async () => {
    const admin = deps("admins");
    await expect(resolveCalculatorVersionWith(admin)).resolves.toBe("v2");
    expect(admin.role).toHaveBeenCalledWith("user_1");
    for (const role of ["student", "tutor", "parent", null] as const) {
      const d = deps("admins", { role: vi.fn(async () => role) });
      await expect(resolveCalculatorVersionWith(d)).resolves.toBe("v1");
    }
    const signedOut = deps("admins", { userId: vi.fn(async () => null) });
    await expect(resolveCalculatorVersionWith(signedOut)).resolves.toBe("v1");
    expect(signedOut.role).not.toHaveBeenCalled();
  });

  it("AR-6 a failing role lookup resolves v1", async () => {
    const overs: Partial<VersionDeps>[] = [
      {
        role: vi.fn(async () => {
          throw new Error("role query failed");
        }),
      },
      {
        role: vi.fn(() => {
          throw new Error("role query threw");
        }),
      },
      {
        userId: vi.fn(async () => {
          throw new Error("auth failed");
        }),
      },
      {
        rollout: () => {
          throw new Error("binding unavailable");
        },
      },
    ];
    for (const over of overs)
      await expect(resolveCalculatorVersionWith(deps("admins", over))).resolves.toBe("v1");
  });

  it("AR-6 the admin check uses the user's own role while impersonating", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CALCULATOR_V2_ROLLOUT", "admins");
    mocks.safeAuth.mockResolvedValue({ userId: "user_admin" });
    mocks.fetchUserRole.mockResolvedValue("admin");
    mocks.resolveEffectiveRole.mockResolvedValue("student");
    await expect(resolveCalculatorVersion()).resolves.toBe("v2");
    expect(mocks.fetchUserRole).toHaveBeenCalledWith("user_admin");
    expect(mocks.resolveEffectiveRole).not.toHaveBeenCalled();
  });

  it("AR-6 the rollout is read on every call, from the shell outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CALCULATOR_V2_ROLLOUT", "everyone");
    expect(defaultVersionDeps.rollout()).toBe("everyone");
    vi.stubEnv("CALCULATOR_V2_ROLLOUT", "off");
    expect(defaultVersionDeps.rollout()).toBe("off");
    expect(mocks.cf).not.toHaveBeenCalled();
  });

  it("AR-6, OI-30 production reads only the Worker binding, so a baked .env value never applies", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CALCULATOR_V2_ROLLOUT", "everyone");
    mocks.cf.mockReturnValue({ env: {} });
    expect(defaultVersionDeps.rollout()).toBe("off");
    mocks.cf.mockReturnValue({ env: { CALCULATOR_V2_ROLLOUT: "admins" } });
    expect(defaultVersionDeps.rollout()).toBe("admins");
    mocks.cf.mockImplementation(() => {
      throw new Error("no Cloudflare context");
    });
    await expect(resolveCalculatorVersion()).resolves.toBe("v1");
  });
});

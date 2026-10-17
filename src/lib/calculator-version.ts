// Server-side resolver for the calculatorV2 rollout flag (AR-6, OI-30).
//
// CALCULATOR_V2_ROLLOUT is a runtime Worker secret, never a NEXT_PUBLIC_
// build input. In production it is read only from the Worker binding, so a
// value OpenNext baked in from a .env* file can never switch students to v2;
// outside production it comes from the shell (or a Playwright webServer.env).
//
// This module is eager and server-only in practice, but it carries neither
// "use client" nor a `server-only` import: the AR-2 scan loads it under
// Vitest's node environment. Client code imports it for types only (AR-7).

import { cache } from "react";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { safeAuth } from "@/lib/auth/dev-auth";
import { fetchUserRole, type AppRole } from "@/lib/supabase/queries/admin";

export type CalculatorVersion = "v1" | "v2";
export type CalculatorRollout = "off" | "admins" | "everyone";

const ROLLOUTS: readonly CalculatorRollout[] = ["off", "admins", "everyone"];

/** Trimmed `off`, `admins` or `everyone`; anything else (including unset) is `off`. */
export function readCalculatorRollout(value: string | undefined): CalculatorRollout {
  const trimmed = value?.trim();
  return ROLLOUTS.find((rollout) => rollout === trimmed) ?? "off";
}

export interface VersionDeps {
  rollout(): CalculatorRollout;
  userId(): Promise<string | null>;
  role(clerkId: string): Promise<AppRole | null>;
}

export const defaultVersionDeps: VersionDeps = {
  rollout() {
    if (process.env.NODE_ENV === "production")
      return readCalculatorRollout(
        (getCloudflareContext().env as { CALCULATOR_V2_ROLLOUT?: string }).CALCULATOR_V2_ROLLOUT
      );
    return readCalculatorRollout(process.env.CALCULATOR_V2_ROLLOUT);
  },
  async userId() {
    return (await safeAuth()).userId;
  },
  // The user's own role, never the impersonated one: an admin previewing a
  // student keeps the calculator the admins stage gives them (AR-6).
  role: fetchUserRole,
};

/** Never rejects: any throw or rejection from a dep gives "v1". The user and
 *  role are looked up only in the `admins` stage. */
export async function resolveCalculatorVersionWith(deps: VersionDeps): Promise<CalculatorVersion> {
  try {
    const rollout = deps.rollout();
    if (rollout === "everyone") return "v2";
    if (rollout !== "admins") return "v1";
    const userId = await deps.userId();
    if (!userId) return "v1";
    return (await deps.role(userId)) === "admin" ? "v2" : "v1";
  } catch {
    return "v1";
  }
}

/** One resolution per request (React `cache`). */
export const resolveCalculatorVersion: () => Promise<CalculatorVersion> = cache(() =>
  resolveCalculatorVersionWith(defaultVersionDeps)
);

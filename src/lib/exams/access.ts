/*
 * Server only. What a student may do with the full-length exams right now: the plan limit (Free: one
 * exam), how many are used, and whether the test switch is on for a caller allowed to use it (an admin,
 * or development).
 */
import { cookies } from "next/headers";
import { adminOrNull } from "@/lib/auth/admin-guard";
import { getPlan, getUsage, PLAN_ENTITLEMENTS } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/server";
import type { Access } from "./service";
import { sittingsOf } from "./store";

export const TEST_COOKIE = "kp-exam-test";

/** May this caller use the test switch? An admin (real role), or anyone in development. */
export async function mayTest(): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return true;
  return (await adminOrNull()) !== null;
}

export async function userIdOf(clerkId: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

/** The plan limit on full-length exams (Free: one), the test switch, and what is used. */
export async function examAccess(clerkId: string): Promise<Access> {
  const plan = await getPlan(clerkId).catch(() => ({ entitlements: PLAN_ENTITLEMENTS.free }));
  const limit = plan.entitlements.fullLengthTestLimit;
  let used = 0;
  if (limit !== null) {
    const [usage, sittings] = await Promise.all([getUsage(clerkId), sittingsOf(clerkId)]);
    used = usage.fullLengthTestsCompleted + sittings.length;
  }
  const switchOn = (await cookies()).get(TEST_COOKIE)?.value === "1";
  return { testSwitch: switchOn && (await mayTest()), limit, used };
}

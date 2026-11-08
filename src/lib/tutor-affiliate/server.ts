// Server wiring for the tutor affiliate plan: the real stores and
// the signed-in identity. Server actions use the real Clerk id
// (never an admin's impersonation target) for every write.

import "server-only";
import { safeAuth } from "@/lib/auth/dev-auth";
import { supabaseAffiliateStore } from "./store";
import { supabaseHomeworkStore } from "./homework-store";
import { planBilling, planGrants } from "./plan-bridge";
import type { HomeworkDeps } from "./homework";

export const affiliateDeps: HomeworkDeps = {
  store: supabaseAffiliateStore,
  billing: planBilling,
  grants: planGrants,
  homework: supabaseHomeworkStore,
};

export async function requireClerkId(): Promise<string> {
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Please sign in again.");
  return userId;
}

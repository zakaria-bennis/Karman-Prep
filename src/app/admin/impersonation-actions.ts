"use server";

// ============================================================
// Server Actions — admin "View as" impersonation.
//
// Two flavors:
//   1. actionSetImpersonation(role)      — generic "view as
//      tutor / student / parent" with a synthetic identity. The
//      admin sees the default dashboard shell with no real data.
//   2. actionImpersonateUser(targetId)   — granular "impersonate
//      THIS user" (audit issue #17). The admin sees the target's
//      real dashboard with their real data, so they can reproduce
//      a bug report without temporarily editing the user's row.
//
// Both set httpOnly cookies that `resolveEffectiveRole` /
// `resolveEffectiveClerkId` read. Only the REAL admin role can
// call these.
//
// Impersonation is intentionally READ-ONLY: server actions
// (mutations) keep using the real `auth().userId`, so any click
// the admin makes while impersonated writes to the admin's own
// row, never to the target's. The cookie only affects what the
// admin SEES.
// ============================================================

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  fetchUserRole,
  IMPERSONATE_COOKIE,
  IMPERSONATE_USER_COOKIE,
  type AppRole,
} from "@/lib/supabase/queries/admin";
import { impersonateUserInputSchema, setImpersonationInputSchema } from "./schemas";

async function guardRealAdmin() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  const real = await fetchUserRole(userId);
  if (real !== "admin") throw new Error("Admin role required");
}

type ImpersonateRole = Exclude<AppRole, "admin">;

function landingFor(role: ImpersonateRole): string {
  if (role === "tutor") return "/tutor";
  if (role === "parent") return "/dashboard/parent";
  return "/dashboard/student";
}

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 2, // 2 hours — long enough to debug, short enough that you can't forget it
};

export async function actionSetImpersonation(role: ImpersonateRole) {
  setImpersonationInputSchema.parse({ role });
  await guardRealAdmin();
  const store = await cookies();
  store.set(IMPERSONATE_COOKIE, role, COOKIE_OPTS);
  // Clear any granular impersonation so the two modes don't stack.
  store.delete(IMPERSONATE_USER_COOKIE);
  redirect(landingFor(role));
}

/** Granular impersonation — admin sees the target user's actual
 *  dashboard with their real data. Sets BOTH the role cookie
 *  (so layouts that gate on role still work) and the user-id
 *  cookie (so reads return the target's rows). */
export async function actionImpersonateUser(userId: string) {
  impersonateUserInputSchema.parse({ userId });
  await guardRealAdmin();

  const supabase = createAdminClient();
  const { data: target } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();
  if (!target) throw new Error("Target user not found");
  if (target.role === "admin") throw new Error("Cannot impersonate another admin");

  const role = target.role as ImpersonateRole;
  const store = await cookies();
  store.set(IMPERSONATE_COOKIE, role, COOKIE_OPTS);
  store.set(IMPERSONATE_USER_COOKIE, target.id as string, COOKIE_OPTS);
  redirect(landingFor(role));
}

export async function actionClearImpersonation() {
  await guardRealAdmin();
  const store = await cookies();
  store.delete(IMPERSONATE_COOKIE);
  store.delete(IMPERSONATE_USER_COOKIE);
  redirect("/admin/users");
}

"use server";

// ============================================================
// Server Actions — admin "View as" impersonation.
// Sets / clears the strata_impersonate_role cookie that
// `resolveEffectiveRole` reads.
// Only the REAL admin role can call these.
// ============================================================

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { fetchUserRole, IMPERSONATE_COOKIE, type AppRole } from "@/lib/supabase/queries/admin";

async function guardRealAdmin() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  const real = await fetchUserRole(userId);
  if (real !== "admin") throw new Error("Admin role required");
}

type ImpersonateRole = Exclude<AppRole, "admin">;

function landingFor(role: ImpersonateRole): string {
  if (role === "tutor")   return "/tutor";
  if (role === "parent")  return "/dashboard/parent";
  return "/dashboard/student";
}

export async function actionSetImpersonation(role: ImpersonateRole) {
  await guardRealAdmin();
  const store = await cookies();
  store.set(IMPERSONATE_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 2, // 2 hours — long enough to debug, short enough that you can't forget it
  });
  redirect(landingFor(role));
}

export async function actionClearImpersonation() {
  await guardRealAdmin();
  const store = await cookies();
  store.delete(IMPERSONATE_COOKIE);
  redirect("/admin/users");
}

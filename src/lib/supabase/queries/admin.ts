// ============================================================
// Supabase queries — Admin role checks + impersonation
//
// `fetchUserRole`       — raw role from the DB
// `resolveEffectiveRole` — role the app should treat the
//   caller as. Same as fetchUserRole, except an admin may
//   set an impersonation cookie to preview the UI as a
//   different role. Non-admins can never impersonate.
// ============================================================

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";

export type AppRole = "student" | "tutor" | "admin" | "parent";

/** Cookie name used by the admin "View as" tool. */
export const IMPERSONATE_COOKIE = "strata_impersonate_role";

export async function fetchUserRole(clerkId: string): Promise<AppRole | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  return (data?.role as AppRole | null) ?? null;
}

/**
 * Resolve the role the caller should be treated as for rendering.
 *
 * - Reads the real role from users.role.
 * - If the real role is 'admin' AND there's a valid impersonation
 *   cookie set, returns the impersonated role instead.
 * - Anyone else gets their real role verbatim.
 *
 * Use this in layouts to gate access. Use fetchUserRole only
 * when you need the *actual* DB role (e.g. inside the admin
 * console itself when you want to check "am I really admin?").
 */
export async function resolveEffectiveRole(clerkId: string): Promise<AppRole | null> {
  const real = await fetchUserRole(clerkId);
  if (real !== "admin") return real;

  const cookieStore = await cookies();
  const override = cookieStore.get(IMPERSONATE_COOKIE)?.value as AppRole | undefined;
  if (override && ["student", "tutor", "parent"].includes(override)) {
    return override;
  }
  return real;
}

export async function requireRole(clerkId: string, allowed: AppRole[]): Promise<boolean> {
  const role = await resolveEffectiveRole(clerkId);
  return role !== null && allowed.includes(role);
}

// ============================================================
// Supabase queries — Admin role checks + impersonation
//
// `fetchUserRole`             — raw role from the DB.
// `resolveEffectiveRole`      — role the app should treat the
//   caller as. Same as fetchUserRole, except an admin may set an
//   impersonation cookie to preview the UI as a different role.
//   Non-admins can never impersonate.
// `resolveEffectiveClerkId`   — clerk id the app should treat the
//   caller as for READ purposes when the admin is impersonating a
//   specific user (audit issue #17). Returns the real clerk id
//   for everyone else.
//
// IMPORTANT: only page-level READS should call
// `resolveEffectiveClerkId`. Server actions (mutations) keep
// using the real `auth().userId` so we don't accidentally write
// to the impersonated user's data. Impersonation is a debugging
// lens — it lets the admin reproduce a student's bug report
// without temporarily editing their data.
// ============================================================

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";

export type AppRole = "student" | "tutor" | "admin" | "parent";

/** Cookie name used by the admin "View as <role>" tool. */
export const IMPERSONATE_COOKIE = "strata_impersonate_role";

/** Cookie name used by the admin "Impersonate this user" tool —
 *  stores the target users.id (UUID), not their clerk_id. */
export const IMPERSONATE_USER_COOKIE = "strata_impersonate_user_id";

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

export interface EffectiveUser {
  /** Clerk id the page should use for `clerk_id = ?` filters and
   *  any `user_id = ?` joins that store the clerk id directly. */
  clerkId: string;
  /** True when the caller is a real admin impersonating someone
   *  else. Pages can use this to surface a banner or change the
   *  copy ("you're viewing Jane's progress"). */
  isImpersonating: boolean;
  /** The real admin's clerk id (only set when isImpersonating).
   *  Useful for audit logging. */
  realClerkId: string | null;
}

/**
 * Resolve the clerk id the caller should be treated as for READ
 * purposes. When a real admin sets the impersonate-user cookie,
 * this returns the target user's clerk id so the page renders
 * their dashboard with their real data (audit issue #17).
 *
 * Falls back to the real clerk id in every other case:
 *   - non-admin caller
 *   - admin with no impersonation cookie
 *   - cookie points to a non-existent user
 *   - cookie points to an admin (cannot impersonate other admins)
 *
 * Mutations (server actions) MUST NOT call this — they should
 * use the real `auth().userId` so writes go to the admin's row
 * and not the impersonated student's.
 */
/**
 * Pure decision function for resolveEffectiveClerkId. Extracted from
 * the I/O wrapper so the branching logic can be unit-tested without
 * mocking next/headers + Supabase. The wrapper below feeds in
 * realRole + targetUserId + target row from the actual DB/cookie.
 *
 * Returns the EffectiveUser the page should treat the caller as.
 */
export function chooseEffectiveClerkId(input: {
  realClerkId: string;
  realRole: AppRole | null;
  targetUserId: string | undefined;
  target: { clerk_id: string; role: string } | null;
}): EffectiveUser {
  const noImpersonation: EffectiveUser = {
    clerkId: input.realClerkId,
    isImpersonating: false,
    realClerkId: null,
  };

  // Only real admins can impersonate.
  if (input.realRole !== "admin") return noImpersonation;
  // No cookie set → real admin viewing their own surfaces.
  if (!input.targetUserId) return noImpersonation;
  // Cookie points to a non-existent user OR to another admin
  // (admins can't impersonate admins — would expose another admin's
  // mailbox / dashboard surfaces).
  if (!input.target || input.target.role === "admin") return noImpersonation;

  return {
    clerkId: input.target.clerk_id,
    isImpersonating: true,
    realClerkId: input.realClerkId,
  };
}

export async function resolveEffectiveClerkId(realClerkId: string): Promise<EffectiveUser> {
  const realRole = await fetchUserRole(realClerkId);
  // Fast-path: non-admin callers can't impersonate, skip cookie + DB hop.
  if (realRole !== "admin") {
    return chooseEffectiveClerkId({
      realClerkId,
      realRole,
      targetUserId: undefined,
      target: null,
    });
  }

  const cookieStore = await cookies();
  const targetUserId = cookieStore.get(IMPERSONATE_USER_COOKIE)?.value;
  if (!targetUserId) {
    return chooseEffectiveClerkId({ realClerkId, realRole, targetUserId: undefined, target: null });
  }

  const supabase = createAdminClient();
  const { data: target } = await supabase
    .from("users")
    .select("clerk_id, role")
    .eq("id", targetUserId)
    .maybeSingle();

  return chooseEffectiveClerkId({
    realClerkId,
    realRole,
    targetUserId,
    target: target as { clerk_id: string; role: string } | null,
  });
}

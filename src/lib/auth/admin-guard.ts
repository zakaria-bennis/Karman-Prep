// ============================================================
// Server-side admin check for admin actions and routes.
//
// Uses the REAL role from the database (users.role), not the
// "view as" impersonation lens, so an admin previewing another
// role can still act, and nobody else ever can. Every admin
// server action and admin route handler calls this first.
// ============================================================

import { safeAuth } from "@/lib/auth/dev-auth";
import { createAdminClient } from "@/lib/supabase/server";

export class AdminRequiredError extends Error {
  constructor(message = "Admin role required") {
    super(message);
    this.name = "AdminRequiredError";
  }
}

export interface AdminUser {
  clerkId: string;
  /** users.id (UUID) — what audit columns store. */
  userId: string;
}

export async function requireAdmin(): Promise<AdminUser> {
  const { userId: clerkId } = await safeAuth();
  if (!clerkId) throw new AdminRequiredError("Not signed in");
  const { data } = await createAdminClient()
    .from("users")
    .select("id, role")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!data || data.role !== "admin") throw new AdminRequiredError();
  return { clerkId, userId: data.id };
}

/** For route handlers: null instead of throwing. */
export async function adminOrNull(): Promise<AdminUser | null> {
  try {
    return await requireAdmin();
  } catch {
    return null;
  }
}

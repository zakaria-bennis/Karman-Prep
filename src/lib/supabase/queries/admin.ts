// ============================================================
// Supabase queries — Admin role checks
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";

export type AppRole = "student" | "tutor" | "admin" | "parent";

export async function fetchUserRole(clerkId: string): Promise<AppRole | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  return (data?.role as AppRole | null) ?? null;
}

export async function requireRole(
  clerkId: string,
  allowed: AppRole[]
): Promise<boolean> {
  const role = await fetchUserRole(clerkId);
  return role !== null && allowed.includes(role);
}

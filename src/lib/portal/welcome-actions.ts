"use server";

/*
 * The portal's welcome is seen once per account (student_settings.welcomed_at), not once per
 * browser. Acts only on the signed-in student's own row; an admin previewing a student changes
 * nothing.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";

export async function actionWelcomed(): Promise<{ ok: boolean }> {
  const { userId } = await safeAuth();
  if (!userId) return { ok: false };
  const { clerkId, isImpersonating } = await resolveEffectiveClerkId(userId);
  if (isImpersonating) return { ok: false };
  const db = createAdminClient() as unknown as SupabaseClient;
  const { data: user } = await db
    .from("users")
    .select("id, role")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  const row = user as { id: string; role: string | null } | null;
  if (!row || row.role !== "student") return { ok: false };
  const now = new Date().toISOString();
  const { error } = await db
    .from("student_settings")
    .upsert({ user_id: row.id, welcomed_at: now, updated_at: now }, { onConflict: "user_id" });
  if (error) {
    console.error("[welcome] could not be kept:", error.message);
    return { ok: false };
  }
  return { ok: true };
}

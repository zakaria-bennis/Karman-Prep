// "Go to your portal": one address that sends a signed-in visitor to the portal for their kind of
// account (student, parent, tutor, school), and anyone else to sign in and then back here.
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { safeAuth } from "@/lib/auth/dev-auth";
import { portalFor } from "@/lib/auth/portal-home";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url), 307);
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) return to("/auth/sign-in?redirect_url=/portal");
  const { clerkId } = await resolveEffectiveClerkId(realUserId);
  const db = createAdminClient() as unknown as SupabaseClient;
  const { data: user } = await db
    .from("users")
    .select("id, role")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  let schoolMember = false;
  if (user?.id) {
    const { count } = await db
      .from("school_members")
      .select("school_id", { count: "exact", head: true })
      .eq("user_id", user.id);
    schoolMember = (count ?? 0) > 0;
  }
  return to(portalFor({ role: user?.role ?? null, schoolMember }));
}

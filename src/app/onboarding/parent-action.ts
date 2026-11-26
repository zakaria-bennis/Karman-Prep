"use server";
/*
 * "I'm a parent" at sign-up (founder, 2026-11-08: parents get their own account type). The
 * account becomes a parent account at once, and the questions go on, asked about their student
 * (founder, 2026-11-25). The parent links to their child afterward, from the parent portal.
 */
import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { becomeParent } from "@/lib/parent/account";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";

export async function startParentAccountAction(): Promise<{ error: string } | { ok: true }> {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in?redirect_url=/onboarding");
  const { clerkId } = await resolveEffectiveClerkId(realUserId);
  const result = await becomeParent(clerkId);
  if (!result.ok) {
    return {
      error:
        "This account is already set up as a student or tutor. Sign up with another email for the parent account.",
    };
  }
  return { ok: true };
}

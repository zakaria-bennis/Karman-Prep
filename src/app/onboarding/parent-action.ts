"use server";
/*
 * "I'm a parent" at sign-up (founder, 2026-11-08: parents get their own account type). The
 * account becomes a parent account and opens the parent portal, where the parent links to
 * their child with the code or link from the child's "Invite a parent" page.
 */
import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { becomeParent } from "@/lib/parent/account";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";

export async function startParentAccountAction(): Promise<{ error: string } | void> {
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
  redirect("/dashboard/parent");
}

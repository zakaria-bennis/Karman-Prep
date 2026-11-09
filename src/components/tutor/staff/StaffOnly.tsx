/*
 * Guard for staff-only tutor routes. Affiliate tutors (the $199 plan) share /tutor with staff,
 * but only /tutor, their student pages and /tutor/billing are theirs. Anything else they type
 * sends them back to /tutor instead of drawing empty staff pages.
 */
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId, resolveEffectiveRole } from "@/lib/supabase/queries/admin";

export default async function StaffOnly({ children }: { children: ReactNode }) {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId } = await resolveEffectiveClerkId(realUserId);
  if ((await resolveEffectiveRole(clerkId)) === "affiliate_tutor") redirect("/tutor");
  return <>{children}</>;
}

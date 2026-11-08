"use server";
/* The parent accepts a student's invite and is linked. */
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeAuth } from "@/lib/auth/dev-auth";
import { acceptInvite, INVITE_TOKEN_PATTERN } from "@/lib/parent/invites";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";

const tokenSchema = z.string().regex(INVITE_TOKEN_PATTERN);

export async function acceptParentInviteAction(formData: FormData) {
  const parsed = tokenSchema.safeParse(formData.get("token"));
  if (!parsed.success) redirect("/dashboard/parent");
  const token = parsed.data;
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect(`/auth/sign-in?redirect_url=/join/parent/${token}`);
  const { clerkId } = await resolveEffectiveClerkId(realUserId);
  const { data: me } = await createAdminClient()
    .from("users")
    .select("id, role, onboarding_completed_at")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!me) redirect(`/join/parent/${token}?error=account`);
  const result = await acceptInvite(token, {
    userId: me.id as string,
    role: me.role as string,
    onboarded: Boolean(me.onboarding_completed_at),
  });
  if (!result.ok) redirect(`/join/parent/${token}?error=${result.reason}`);
  redirect(`/dashboard/parent/${result.studentId}`);
}

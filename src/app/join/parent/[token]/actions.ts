"use server";
/* The parent accepts a student's invite link and is linked. A new account becomes a parent. */
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeAuth } from "@/lib/auth/dev-auth";
import { becomeParent } from "@/lib/parent/account";
import { acceptInvite, INVITE_TOKEN_PATTERN } from "@/lib/parent/invites";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";

const tokenSchema = z.string().regex(INVITE_TOKEN_PATTERN);

export async function acceptParentInviteAction(formData: FormData) {
  const parsed = tokenSchema.safeParse(formData.get("token"));
  if (!parsed.success) redirect("/dashboard/parent");
  const token = parsed.data;
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect(`/auth/sign-in?redirect_url=/join/parent/${token}`);
  const { clerkId } = await resolveEffectiveClerkId(realUserId);
  const parent = await becomeParent(clerkId);
  if (!parent.ok) redirect(`/join/parent/${token}?error=role`);
  const result = await acceptInvite({ token }, parent.userId);
  if (!result.ok) redirect(`/join/parent/${token}?error=${result.reason}`);
  redirect(`/dashboard/parent/${result.studentId}`);
}

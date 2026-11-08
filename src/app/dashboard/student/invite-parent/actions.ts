"use server";
/* The student makes (or remakes) the link that invites a parent. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { createInvite } from "@/lib/parent/invites";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";

export async function createParentInviteAction() {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId } = await resolveEffectiveClerkId(realUserId);
  const { data: user } = await createAdminClient()
    .from("users")
    .select("id, role")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!user || user.role !== "student") redirect("/dashboard/student");
  await createInvite(user.id as string);
  revalidatePath("/dashboard/student/invite-parent");
  redirect("/dashboard/student/invite-parent?made=1");
}

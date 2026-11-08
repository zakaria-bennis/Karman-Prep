/* Server only. The signed-in student for a quiz-flow page, or a redirect to sign in. */
import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { dailyTenDays } from "@/lib/assembler/run-store";
import { dayKeyIn, DEFAULT_TIME_ZONE, streakDays } from "@/lib/daily-ten/day";
import type { ShellUser } from "./types";

export async function loadFlowUser(
  returnTo: string
): Promise<{ clerkId: string; user: ShellUser }> {
  const { userId } = await safeAuth();
  if (!userId) redirect(`/auth/sign-in?redirect_url=${encodeURIComponent(returnTo)}`);
  const { data: user } = await createAdminClient()
    .from("users")
    .select("first_name, email")
    .eq("clerk_id", userId)
    .maybeSingle();
  let streak = 0;
  try {
    streak = streakDays(await dailyTenDays(userId), dayKeyIn(new Date(), DEFAULT_TIME_ZONE));
  } catch {
    streak = 0;
  }
  return {
    clerkId: userId,
    user: {
      name: (user as { first_name?: string | null } | null)?.first_name ?? null,
      email: (user as { email?: string | null } | null)?.email ?? null,
      streak,
    },
  };
}

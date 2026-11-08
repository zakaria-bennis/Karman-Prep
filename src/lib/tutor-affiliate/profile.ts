import "server-only";
import { supabaseAffiliateStore } from "./store";

/** First name and email for the portal shell's greeting and account menu. */
export async function fetchUserNameAndEmail(
  clerkId: string
): Promise<{ firstName: string | null; email: string | null }> {
  const user = await supabaseAffiliateStore.userByClerkId(clerkId);
  return { firstName: user?.firstName ?? null, email: user?.email ?? null };
}

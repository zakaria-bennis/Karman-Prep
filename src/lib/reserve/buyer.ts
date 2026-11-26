// Who is reserving a seat: the signed-in account, with what it already knows, so the form asks for
// nothing twice (founder, 2026-11-25). Server only.
import { currentUser } from "@clerk/nextjs/server";
import { safeAuth } from "@/lib/auth/dev-auth";
import { ensureUserRow } from "@/lib/auth/ensure-user";
import { untypedAdmin } from "@/lib/school/db";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import type { Buyer } from "./service";

export interface BuyerProfile extends Buyer {
  /** A parent account reserves as the parent; a student account that has been used reserves as the
   *  student; a brand-new account is asked. */
  who: "parent" | "student" | null;
  firstName: string;
  fullName: string;
  /** The SAT the account already said it is taking, YYYY-MM-DD. */
  satDate: string;
  goal: string;
}

/** The signed-in account's id and email, or null when nobody is signed in. */
export async function reserveBuyer(): Promise<Buyer | null> {
  const me = await reserveProfile();
  return me ? { clerkId: me.clerkId, email: me.email } : null;
}

export async function reserveProfile(): Promise<BuyerProfile | null> {
  const { userId } = await safeAuth();
  if (!userId) return null;
  const { clerkId } = await resolveEffectiveClerkId(userId);
  await ensureUserRow(clerkId);
  const { data } = await untypedAdmin()
    .from("users")
    .select(
      "email, role, first_name, last_name, sat_test_date, goal_sat_score, onboarding_completed_at"
    )
    .eq("clerk_id", clerkId)
    .maybeSingle();
  let email = (data?.email as string | undefined) ?? "";
  let first = (data?.first_name as string | undefined) ?? "";
  let last = (data?.last_name as string | undefined) ?? "";
  if (!email || !first) {
    try {
      const clerk = await currentUser();
      if (clerk?.id === clerkId) {
        email ||= clerk.emailAddresses[0]?.emailAddress ?? "";
        first ||= clerk.firstName ?? "";
        last ||= clerk.lastName ?? "";
      }
    } catch {
      // the local stand-in account has no Clerk session: the record is all there is
    }
  }
  if (!email) return null;
  const role = data?.role as string | undefined;
  return {
    clerkId,
    email,
    who:
      role === "parent"
        ? "parent"
        : role === "student" && data?.onboarding_completed_at
          ? "student"
          : null,
    firstName: first,
    fullName: [first, last].filter(Boolean).join(" "),
    satDate: (data?.sat_test_date as string | null) ?? "",
    goal: data?.goal_sat_score ? String(data.goal_sat_score) : "",
  };
}

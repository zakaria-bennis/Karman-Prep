// A new account's record in the `users` table, made the first time the account arrives somewhere that
// needs it (founder, 2026-11-13: a free account goes straight from sign-up to the student portal, so the
// record can no longer wait for the intake to create it). Never overwrites: an existing record, and its
// role, are left exactly as they are. Server only.
import { currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/server";

/** The `users.id` for this Clerk account, creating a student record if there is none. Null if it could
 *  not be read or made (no Clerk session in this request, or the database refused). */
export async function ensureUserRow(clerkId: string): Promise<string | null> {
  const db = createAdminClient();
  const find = async () =>
    (await db.from("users").select("id").eq("clerk_id", clerkId).maybeSingle()).data?.id ?? null;
  const existing = await find();
  if (existing) return existing;
  let clerk: Awaited<ReturnType<typeof currentUser>> = null;
  try {
    clerk = await currentUser();
  } catch {
    return null; // the dev sign-in bypass has no Clerk session
  }
  if (!clerk || clerk.id !== clerkId) return null;
  const { error } = await db.from("users").upsert(
    {
      clerk_id: clerkId,
      email: clerk.emailAddresses[0]?.emailAddress || "",
      role: "student",
      first_name: clerk.firstName || null,
      last_name: clerk.lastName || null,
      avatar_url: clerk.imageUrl || null,
    },
    { onConflict: "clerk_id", ignoreDuplicates: true }
  );
  if (error) {
    console.error("[ensure-user] could not create the record", error);
    return null;
  }
  return find();
}

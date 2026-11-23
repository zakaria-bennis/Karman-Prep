/*
 * The tutor's student pages (/tutor/[studentId] and below) are keyed by the student's Clerk id, as
 * the roster links them. A link that carries the student's database id instead (the parent portal
 * and the admin pages use it) is sent on to the same page by Clerk id, but only for a viewer who may
 * see that student: anyone else gets "not found", so a database id never reveals an account. Server
 * only.
 */
import "server-only";
import { notFound, redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { canTutorAccessStudent } from "@/lib/auth/tutor-access";
import { fetchUserRole, resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Sends a database-id link on to the Clerk-id page (`rest` is the path after the id). */
export async function byClerkId(raw: string, rest = ""): Promise<void> {
  if (!UUID.test(raw)) return;
  const { data } = await createAdminClient()
    .from("users")
    .select("clerk_id")
    .eq("id", raw)
    .eq("role", "student")
    .maybeSingle();
  const clerkId = (data as { clerk_id: string | null } | null)?.clerk_id;
  if (!clerkId) notFound();
  const { userId: real } = await safeAuth();
  if (!real) notFound();
  const { clerkId: viewer } = await resolveEffectiveClerkId(real);
  // an affiliate tutor's page checks its own students
  const allowed =
    (await fetchUserRole(viewer)) === "affiliate_tutor" ||
    (await canTutorAccessStudent(viewer, clerkId));
  if (!allowed) notFound();
  redirect(`/tutor/${encodeURIComponent(clerkId)}${rest}`);
}

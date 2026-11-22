/*
 * Who a Settings action acts for. A change is made only on the signed-in student's own account
 * (`ownStudent`), and an admin previewing a student can look but not change anything; a read may
 * follow the admin's preview (`viewedStudent`), so the admin sees what the student sees.
 * Server only. The action files ("use server") export only actions, so the shared parts live here.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";

export type Failure = { ok: false; error: string };

export const PREVIEW = "You're previewing this student, so changes are off.";

export interface Student {
  /** users.id */
  id: string;
  clerkId: string;
  role: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

/** The service-role client, untyped: student_settings and the school tables are newer than the
 *  generated types. */
export const portalDb = () => createAdminClient() as unknown as SupabaseClient;

async function find(clerkId: string): Promise<Student | null> {
  const { data } = await portalDb()
    .from("users")
    .select("id, clerk_id, role, first_name, last_name, email")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  const row = data as {
    id: string;
    clerk_id: string;
    role: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  if (!row) return null;
  return {
    id: row.id,
    clerkId: row.clerk_id,
    role: row.role,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
  };
}

/** The signed-in student, to change their own account. */
export async function ownStudent(): Promise<{ ok: true; student: Student } | Failure> {
  const { userId } = await safeAuth();
  if (!userId) return { ok: false, error: "Sign in again to make changes." };
  const { clerkId, isImpersonating } = await resolveEffectiveClerkId(userId);
  if (isImpersonating) return { ok: false, error: PREVIEW };
  const student = await find(clerkId);
  if (!student) return { ok: false, error: "We couldn't find your account. Sign in again." };
  if (student.role !== "student")
    return { ok: false, error: "Only a student account can change this." };
  return { ok: true, student };
}

/** The student whose portal is open, to read: the signed-in student, or the one an admin previews. */
export async function viewedStudent(): Promise<{ ok: true; student: Student } | Failure> {
  const { userId } = await safeAuth();
  if (!userId) return { ok: false, error: "Sign in again to see this." };
  const { clerkId } = await resolveEffectiveClerkId(userId);
  const student = await find(clerkId);
  if (!student) return { ok: false, error: "We couldn't find your account. Sign in again." };
  return { ok: true, student };
}

/** The account's saved choices, with `patch` laid over them. Keys the portal does not know are kept,
 *  and so is the welcome time (written elsewhere): only `prefs` and `updated_at` are touched. */
export async function mergePrefs(
  userId: string,
  patch: Record<string, unknown>
): Promise<{ ok: true } | Failure> {
  const db = portalDb();
  const { data, error: readError } = await db
    .from("student_settings")
    .select("prefs")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) {
    console.error("[settings] prefs read failed:", readError.message);
    return { ok: false, error: "That didn't save. Try again in a moment." };
  }
  const was = (data as { prefs?: unknown } | null)?.prefs;
  const kept = typeof was === "object" && was !== null && !Array.isArray(was) ? was : {};
  const { error } = await db
    .from("student_settings")
    .upsert(
      { user_id: userId, prefs: { ...kept, ...patch }, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) {
    console.error("[settings] prefs save failed:", error.message);
    return { ok: false, error: "That didn't save. Try again in a moment." };
  }
  return { ok: true };
}

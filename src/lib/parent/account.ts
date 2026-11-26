import "server-only";
/*
 * Parents have their own account type (founder, 2026-11-08). Someone who says "I'm a parent"
 * at sign-up, or accepts a student's invite with a brand-new account, becomes a parent
 * account and lands in the parent portal. Only a new account changes: a student who has set
 * up their account, holds a paid plan or has started any practice, a tutor or an admin is never
 * turned into a parent.
 */
import { currentUser } from "@clerk/nextjs/server";
import { getPlan } from "@/lib/plans";
import { untypedAdmin, type UntypedAdmin } from "@/lib/school/db";

export type BecomeParentResult = { ok: true; userId: string } | { ok: false; reason: "role" };

async function clerkProfile() {
  try {
    const u = await currentUser();
    if (!u) return null;
    return {
      email: u.emailAddresses[0]?.emailAddress ?? "",
      firstName: u.firstName || null,
      lastName: u.lastName || null,
      avatarUrl: u.imageUrl || null,
    };
  } catch {
    // Development sign-in bypass has no Clerk session; the users row already exists there.
    return null;
  }
}

/** Where a student's practice starts: skill practice, the earlier node quizzes and every quiz run. */
const PRACTICE_TABLES = ["catalog_practice_sessions", "quiz_attempts", "quiz_runs"] as const;

/**
 * A student account someone is using: it holds a plan above Free, or has started any practice.
 * Free students never finish onboarding, so `onboarding_completed_at` alone cannot tell.
 */
export async function studentInUse(
  clerkId: string,
  supabase: UntypedAdmin = untypedAdmin(),
  readPlan: (clerkId: string) => Promise<{ planId: string }> = getPlan
): Promise<boolean> {
  if ((await readPlan(clerkId)).planId !== "free") return true;
  const started = await Promise.all(
    PRACTICE_TABLES.map(async (table) => {
      const { data, error } = await supabase
        .from(table)
        .select("id")
        .eq("student_id", clerkId)
        .limit(1);
      if (error) throw error;
      return !!data?.length;
    })
  );
  return started.some(Boolean);
}

export async function becomeParent(clerkId: string): Promise<BecomeParentResult> {
  const supabase = untypedAdmin();
  const now = new Date().toISOString();
  const { data: me, error } = await supabase
    .from("users")
    .select("id, role, onboarding_completed_at")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (error) throw error;
  if (!me) {
    const profile = await clerkProfile();
    if (!profile?.email) return { ok: false, reason: "role" };
    const { data: created, error: insertError } = await supabase
      .from("users")
      .insert({
        clerk_id: clerkId,
        email: profile.email,
        role: "parent",
        first_name: profile.firstName,
        last_name: profile.lastName,
        avatar_url: profile.avatarUrl,
        onboarding_completed_at: now,
      })
      .select("id")
      .single();
    if (insertError) throw insertError;
    return { ok: true, userId: created.id };
  }
  const fresh =
    me.role === "student" &&
    !me.onboarding_completed_at &&
    !(await studentInUse(clerkId, supabase));
  if (me.role !== "parent" && !fresh) return { ok: false, reason: "role" };
  if (fresh || !me.onboarding_completed_at) {
    const { error: updateError } = await supabase
      .from("users")
      .update({ role: "parent", onboarding_completed_at: me.onboarding_completed_at ?? now })
      .eq("id", me.id);
    if (updateError) throw updateError;
  }
  return { ok: true, userId: me.id };
}

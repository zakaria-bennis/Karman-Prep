"use server";
/*
 * The sign-up questions' answers, kept on the account (founder, 2026-11-25: nothing is asked twice).
 * Saved when a signed-in student reaches their plan, so the portal's welcome, the cohort form and any
 * other device already know the SAT date and the goal. A parent's answers are about a student who has
 * no account yet, so they stay in the browser (lib/onboarding/known.ts) until that student has one.
 */
import { z } from "zod";
import { safeAuth } from "@/lib/auth/dev-auth";
import { ensureUserRow } from "@/lib/auth/ensure-user";
import { untypedAdmin } from "@/lib/school/db";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";

const answers = z.object({
  /** YYYY-MM-DD, or "" when they are not sure yet. */
  satDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  /** "1400", or "" when none was given. */
  goal: z.union([z.literal(""), z.string().regex(/^\d{3,4}$/)]),
});

export async function saveAnswersAction(input: unknown): Promise<{ ok: boolean }> {
  const parsed = answers.safeParse(input);
  const { userId } = await safeAuth();
  if (!parsed.success || !userId) return { ok: false };
  const { clerkId, isImpersonating } = await resolveEffectiveClerkId(userId);
  if (isImpersonating) return { ok: true };
  await ensureUserRow(clerkId);
  const db = untypedAdmin();
  const { data: me } = await db
    .from("users")
    .select("role, sat_test_date")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (me?.role !== "student") return { ok: true };
  const today = new Date().toISOString().slice(0, 10);
  const goal = Number(parsed.data.goal);
  const patch = {
    // an SAT date the student already set in the portal is theirs to change there, not here
    ...(parsed.data.satDate >= today && !me.sat_test_date
      ? { sat_test_date: parsed.data.satDate, test_type: "sat" }
      : {}),
    ...(goal >= 400 && goal <= 1600 && goal % 10 === 0 ? { goal_sat_score: goal } : {}),
  };
  if (!Object.keys(patch).length) return { ok: true };
  const { error } = await db.from("users").update(patch).eq("clerk_id", clerkId);
  if (error) console.error("[onboarding] could not keep the answers", error);
  return { ok: !error };
}

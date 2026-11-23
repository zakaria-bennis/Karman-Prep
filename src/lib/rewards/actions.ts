"use server";

/*
 * The old rewards' actions, still read by the Daily 10's end on /learn/daily-ten: the student's
 * rewards, and marking a new companion's moment as shown. Boxes are opened only in the portal's
 * Rewards now (src/lib/portal/reward-actions.ts, one ledger for every coin). Each acts only
 * on the signed-in student's own rows. An admin previewing a student can look, never spend.
 */
import { z } from "zod";
import { safeAuth } from "@/lib/auth/dev-auth";
import { fetchUserRole, resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { ANIMAL_IDS } from "@/lib/rewards/catalog";
import type { RewardState } from "@/lib/rewards/economy";
import { loadRewardState, markCompanionsSeen } from "@/lib/rewards/server";

export type RewardResult<T> = { ok: true; value: T } | { ok: false; error: string };

async function who(): Promise<{ clerkId: string; preview: boolean } | null> {
  const { userId } = await safeAuth();
  if (!userId) return null;
  const { clerkId, isImpersonating } = await resolveEffectiveClerkId(userId);
  const role = await fetchUserRole(clerkId);
  if (role !== "student" && !(role === "admin" && !isImpersonating)) return null;
  return { clerkId, preview: isImpersonating };
}

const SIGN_IN = "Sign in with a student account to see your rewards.";

/** The student's rewards, saving any companion they have just earned. */
export async function actionRewardState(): Promise<RewardResult<RewardState>> {
  const me = await who();
  if (!me) return { ok: false, error: SIGN_IN };
  try {
    return { ok: true, value: await loadRewardState(me.clerkId, { write: !me.preview }) };
  } catch (error) {
    console.error("[rewards] state", error instanceof Error ? error.message : error);
    return { ok: false, error: "Your rewards could not be loaded just now." };
  }
}

const seenSchema = z.object({ animals: z.array(z.enum(ANIMAL_IDS)).max(ANIMAL_IDS.length) });

/** Marks new companions' moments as shown, so each plays once. */
export async function actionCompanionsSeen(input: {
  animals: string[];
}): Promise<RewardResult<null>> {
  const parsed = seenSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Not saved." };
  const me = await who();
  if (!me || me.preview) return { ok: true, value: null };
  await markCompanionsSeen(me.clerkId, parsed.data.animals).catch(() => undefined);
  return { ok: true, value: null };
}

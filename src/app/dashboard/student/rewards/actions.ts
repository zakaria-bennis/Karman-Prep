"use server";

/*
 * The Rewards actions: read the student's rewards, open a mystery box with tokens, choose which
 * companion shows and what it wears, and mark a new companion's moment as shown. Each acts only
 * on the signed-in student's own rows. An admin previewing a student can look, never spend.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { safeAuth } from "@/lib/auth/dev-auth";
import { fetchUserRole, resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { ACCESSORY_IDS, ANIMAL_IDS } from "@/lib/rewards/catalog";
import type { RewardState } from "@/lib/rewards/economy";
import {
  NotEnoughTokens,
  loadRewardState,
  markCompanionsSeen,
  openRewardBox,
  setRewardWear,
  type OpenedPrize,
} from "@/lib/rewards/server";

export type RewardResult<T> = { ok: true; value: T } | { ok: false; error: string };

const PREVIEW = "You're previewing this student, so rewards can't be opened or changed.";
const REWARDS_PATH = "/dashboard/student/rewards";

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

const openSchema = z.object({ requestId: z.string().uuid() });

/** Opens one mystery box. `requestId` is made once per tap, so a retried tap opens nothing new. */
export async function actionOpenBox(input: {
  requestId: string;
}): Promise<RewardResult<OpenedPrize>> {
  const parsed = openSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That box could not be opened." };
  const me = await who();
  if (!me) return { ok: false, error: SIGN_IN };
  if (me.preview) return { ok: false, error: PREVIEW };
  try {
    const value = await openRewardBox(me.clerkId, parsed.data.requestId);
    revalidatePath(REWARDS_PATH);
    return { ok: true, value };
  } catch (error) {
    if (error instanceof NotEnoughTokens)
      return { ok: false, error: "Not enough tokens for a box yet. Answer a few more questions." };
    console.error("[rewards] open", error instanceof Error ? error.message : error);
    return { ok: false, error: "The box stayed shut. Your tokens are safe. Try again." };
  }
}

const wearSchema = z.object({
  animal: z.enum(ANIMAL_IDS),
  accessory: z.enum(ACCESSORY_IDS).nullable(),
});

/** Chooses the companion that shows and the accessory it wears (both must be the student's). */
export async function actionWear(input: {
  animal: string;
  accessory: string | null;
}): Promise<RewardResult<null>> {
  const parsed = wearSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That choice isn't available." };
  const me = await who();
  if (!me) return { ok: false, error: SIGN_IN };
  if (me.preview) return { ok: false, error: PREVIEW };
  try {
    await setRewardWear(me.clerkId, parsed.data.animal, parsed.data.accessory);
    revalidatePath(REWARDS_PATH);
    return { ok: true, value: null };
  } catch {
    return { ok: false, error: "That choice isn't yours yet." };
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

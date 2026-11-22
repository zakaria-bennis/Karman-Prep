// Streak savers, used by hand (rules: ../saver.ts). Server only. The morning after a missed day a
// student holding one is asked whether to spend it; spending saves yesterday
// (student_streak_saves) and takes one pass (portal_use_pass), so both streaks the student sees
// (the challenge's and the Daily 10's) and the coin multiplier keep going.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { dailyTenDays } from "@/lib/assembler/run-store";
import { utcDayKey } from "@/lib/daily-challenge/selection";
import { dayToSave } from "../saver";
import { challengeDays, savedDays } from "./coins";

export const STREAK_SAVER = "Streak saver";
const db = () => createAdminClient() as unknown as SupabaseClient;

export type SaverOffer = { day: string; held: number };

async function held(clerkId: string): Promise<number> {
  const { data, error } = await db()
    .from("portal_rewards")
    .select("passes")
    .eq("student_id", clerkId)
    .maybeSingle();
  if (error) return 0;
  const passes = (data as { passes?: Record<string, unknown> } | null)?.passes ?? {};
  return Math.max(0, Number(passes[STREAK_SAVER] ?? 0) || 0);
}

/** Yesterday, when a streak broke there and the student holds a saver; else null. */
export async function saverOffer(clerkId: string, now = new Date()): Promise<SaverOffer | null> {
  const count = await held(clerkId);
  if (count < 1) return null;
  const today = utcDayKey(now);
  const [challenge, daily, saved] = await Promise.all([
    challengeDays(clerkId),
    dailyTenDays(clerkId).catch(() => [] as string[]),
    savedDays(clerkId),
  ]);
  const day =
    dayToSave([...challenge.map((d) => d.day), ...saved], today) ??
    (daily.length ? dayToSave([...daily, ...saved], today) : null);
  return day ? { day, held: count } : null;
}

/** Spends one saver on yesterday. The day is saved first and given back if no pass is left. */
export async function spendStreakSaver(clerkId: string): Promise<{ day: string }> {
  const offer = await saverOffer(clerkId);
  if (!offer) throw new Error("There is no missed day to save.");
  const { error } = await db()
    .from("student_streak_saves")
    .upsert({ student_id: clerkId, day: offer.day }, { ignoreDuplicates: true });
  if (error) throw new Error("Your streak saver was not used. Try again.");
  const { data: used, error: passError } = await db().rpc("portal_use_pass", {
    p_student: clerkId,
    p_pass: STREAK_SAVER,
  });
  if (passError || used !== true) {
    await db()
      .from("student_streak_saves")
      .delete()
      .eq("student_id", clerkId)
      .eq("day", offer.day)
      .then(
        () => undefined,
        () => undefined
      );
    throw new Error("You have no streak savers left.");
  }
  return { day: offer.day };
}

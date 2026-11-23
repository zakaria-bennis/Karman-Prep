/*
 * Server only. Banking the coins an activity earned (student_coin_awards, migration 20261122040000),
 * the balance a student holds, and the challenge multiplier from their challenge answers. Coins are a
 * reward, not a record: nothing here ever throws into a quiz.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { utcDayKey } from "@/lib/daily-challenge/selection";
import { earnedOf, loadAwards, loadOldBoxes, loadRewardRow } from "@/lib/portal/rewards";
import type { CoinActivity, Earned } from "@/lib/coins/earn";
import { challengeDaysOf, multiplierOn, type ChallengeDay } from "@/lib/coins/multiplier";

const db = () => createAdminClient() as unknown as SupabaseClient;

/** Banks an activity's coins once (the key is unique). True when they were banked now. */
export async function bankCoins(
  clerkId: string,
  key: string,
  source: CoinActivity,
  earned: Earned
): Promise<boolean> {
  if (earned.total <= 0) return false;
  try {
    const { data, error } = await db()
      .from("student_coin_awards")
      .upsert(
        {
          award_key: key,
          student_id: clerkId,
          coins: Math.min(100000, Math.round(earned.total)),
          source,
          detail: { lines: earned.lines, multiplier: earned.multiplier },
        },
        { onConflict: "award_key", ignoreDuplicates: true }
      )
      .select("award_key");
    if (error) throw error;
    return !!data?.length;
  } catch (error) {
    console.error("[play] coins not banked", error instanceof Error ? error.message : error);
    return false;
  }
}

/** The coins a student holds now: everything earned less what was spent. */
export async function coinBalance(clerkId: string): Promise<number> {
  try {
    const client = db();
    const [awards, row, boxes] = await Promise.all([
      loadAwards(client, clerkId),
      loadRewardRow(client, clerkId),
      loadOldBoxes(client, clerkId),
    ]);
    return Math.max(0, earnedOf(awards, Date.now()) - boxes - row.spent);
  } catch {
    return 0;
  }
}

/** Every day the student answered a challenge question, with each answer right or wrong. */
export async function challengeDays(clerkId: string): Promise<ChallengeDay[]> {
  const { data, error } = await db()
    .from("daily_challenge_answers")
    .select("day, is_correct")
    .eq("student_id", clerkId)
    .order("day", { ascending: true })
    .limit(5000)
    .then(
      (r) => r,
      () => ({ data: null, error: true })
    );
  if (error || !data) return [];
  return challengeDaysOf(data as { day: string; is_correct: boolean }[]);
}

/** Days kept with a Streak saver (student_streak_saves, migration 20261122040200). A table not
 *  there yet reads as none. */
export async function savedDays(clerkId: string): Promise<string[]> {
  const { data, error } = await db()
    .from("student_streak_saves")
    .select("day")
    .eq("student_id", clerkId)
    .limit(1000)
    .then(
      (r) => r,
      () => ({ data: null, error: true })
    );
  if (error || !data) return [];
  return (data as { day: string }[]).map((r) => r.day);
}

/** The challenge multiplier now (x1 to x3). */
export async function currentMultiplier(clerkId: string, now = new Date()): Promise<number> {
  const [days, saved] = await Promise.all([challengeDays(clerkId), savedDays(clerkId)]);
  return multiplierOn(days, utcDayKey(now), saved);
}

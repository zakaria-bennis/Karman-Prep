/*
 * Server only. The student's rewards on real data: tokens from student_point_awards, the boxes
 * they opened (retired 2026-11-22: boxes open only in the portal's Rewards now), the companions they
 * earned and what their companion wears. Tables: supabase/migrations/20261112231500_rewards.sql.
 * Rules: ./economy.ts.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { dailyTenDays } from "@/lib/assembler/run-store";
import { STARTER, isAccessory, isAnimal } from "./catalog";
import type { AnimalId } from "./catalog";
import {
  balanceOf,
  earnedCompanions,
  type OpenedBox,
  type RewardFacts,
  type RewardState,
} from "./economy";

const db = () => createAdminClient() as unknown as SupabaseClient;

type BoxRow = { cost: number; bonus: number; prize_kind: string; prize_id: string };
type CompanionRow = { animal: string; seen_at: string | null };
type WearRow = { animal: string; accessory: string | null };

/** The milestones behind the companions, read from the student's real records. */
export async function loadRewardFacts(clerkId: string): Promise<RewardFacts> {
  const d = db();
  const [days, tests, trials, levels] = await Promise.all([
    dailyTenDays(clerkId).catch(() => [] as string[]),
    d
      .from("quiz_runs")
      .select("id", { count: "exact", head: true })
      .eq("student_id", clerkId)
      .eq("kind", "full-test")
      .not("completed_at", "is", null),
    d
      .from("time_trial_runs")
      .select("id", { count: "exact", head: true })
      .eq("student_id", clerkId)
      .eq("beat", true),
    d.from("student_skill_levels").select("level, answered").eq("student_id", clerkId).limit(500),
  ]);
  const rows = ((levels.data ?? []) as { level: number; answered: number }[]) ?? [];
  return {
    dailyTenDays: days,
    fullTests: tests.count ?? 0,
    trialBeaten: (trials.count ?? 0) > 0,
    answered: rows.reduce((n, r) => n + (r.answered ?? 0), 0),
    conquered: rows.filter((r) => r.level >= 4).length,
  };
}

/** Saves every companion the facts earn that is not saved yet. Returns the ones added now. */
export async function syncCompanions(clerkId: string): Promise<AnimalId[]> {
  const earned = earnedCompanions(await loadRewardFacts(clerkId));
  const { data } = await db()
    .from("student_companions")
    .upsert(
      earned.map((animal) => ({
        student_id: clerkId,
        animal,
        // Everyone starts with the fox: it needs no moment of its own.
        seen_at: animal === STARTER ? new Date().toISOString() : null,
      })),
      { onConflict: "student_id,animal", ignoreDuplicates: true }
    )
    .select("animal");
  return ((data ?? []) as { animal: string }[]).map((r) => r.animal).filter(isAnimal);
}

/**
 * Everything the Rewards page and the Daily 10 ending draw. With `write` (the student's own
 * session) newly earned companions are saved first; a preview (an admin viewing as the student)
 * shows them without saving anything.
 */
export async function loadRewardState(
  clerkId: string,
  { write }: { write: boolean }
): Promise<RewardState> {
  const d = db();
  let previewEarned: AnimalId[] = [];
  if (write) await syncCompanions(clerkId);
  else previewEarned = earnedCompanions(await loadRewardFacts(clerkId));

  const [totals, boxes, companions, wear] = await Promise.all([
    d.from("student_point_totals").select("total").eq("student_id", clerkId).maybeSingle(),
    d
      .from("student_reward_boxes")
      .select("cost, bonus, prize_kind, prize_id")
      .eq("student_id", clerkId)
      .limit(5000),
    d.from("student_companions").select("animal, seen_at").eq("student_id", clerkId),
    d
      .from("student_reward_wear")
      .select("animal, accessory")
      .eq("student_id", clerkId)
      .maybeSingle(),
  ]);
  const earned = Number((totals.data as { total: number } | null)?.total ?? 0);
  const boxRows = (boxes.data ?? []) as BoxRow[];
  const stored = ((companions.data ?? []) as CompanionRow[]).filter((r) => isAnimal(r.animal));
  const seen = new Map<AnimalId, boolean>(
    stored.map((r) => [r.animal as AnimalId, r.seen_at !== null])
  );
  seen.set(STARTER, true);
  for (const a of previewEarned) if (!seen.has(a)) seen.set(a, true);
  const accessories = [
    ...new Set(boxRows.filter((b) => b.prize_kind === "accessory").map((b) => b.prize_id)),
  ].filter(isAccessory);
  const w = wear.data as WearRow | null;
  const animal = w && isAnimal(w.animal) && seen.has(w.animal) ? w.animal : STARTER;
  const accessory =
    w && isAccessory(w.accessory) && accessories.includes(w.accessory) ? w.accessory : null;

  return {
    earned,
    balance: balanceOf(earned, boxRows),
    boxesOpened: boxRows.length,
    companions: [...seen].map(([a, s]) => ({ animal: a, seen: s })),
    accessories,
    wear: { animal, accessory },
  };
}

/** Every box the student opened (cost and bonus), for a balance outside the Rewards page. */
export async function loadOpenedBoxes(clerkId: string): Promise<OpenedBox[]> {
  const { data } = await db()
    .from("student_reward_boxes")
    .select("cost, bonus")
    .eq("student_id", clerkId)
    .limit(5000);
  return ((data ?? []) as OpenedBox[]).map((b) => ({
    cost: Number(b.cost),
    bonus: Number(b.bonus),
  }));
}

/** Marks companions' "joins you" moments as shown. */
export async function markCompanionsSeen(clerkId: string, animals: AnimalId[]): Promise<void> {
  if (!animals.length) return;
  await db()
    .from("student_companions")
    .update({ seen_at: new Date().toISOString() })
    .eq("student_id", clerkId)
    .in("animal", animals)
    .is("seen_at", null);
}

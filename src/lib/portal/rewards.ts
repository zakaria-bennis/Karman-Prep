/*
 * Rewards for a real student (src/app/dev/shell/Rewards.tsx): coins earned by practice (the point
 * awards the quiz flows already save), less what was spent on boxes and passes; the things to wear
 * won; the passes held; and what the character has on. Spending is saved by reward-actions.ts in
 * `portal_rewards` (migration 20261121200000).
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { summarisePoints, type PointAward } from "@/lib/student/skill-points";
import { dayKey } from "@/lib/student/streak";

export interface RealRewards {
  coins: number;
  /** Every coin earned, today's, and the most earned in one day (Central time). */
  lifetime: number;
  today: number;
  bestDay: number;
  /** Coins earned in the last seven days, by where they came from. */
  week: { name: string; coins: number }[];
  owned: string[];
  passes: Record<string, number>;
  face: string;
  outfit: Record<string, string>;
}

export type RewardRow = {
  spent: number;
  owned: string[];
  passes: Record<string, number>;
  face: string;
  outfit: Record<string, string>;
};

/** Where an award came from, by the start of its key ("daily-ten:...", "time-trial:..."). */
const SOURCE: [prefix: string, name: string][] = [
  ["daily-ten", "Daily 10"],
  ["full-test", "Exams"],
  ["diagnostic", "Exams"],
  ["time-trial", "Time trials"],
  ["endless", "Endless mode"],
];
export const sourceOf = (key: string) =>
  SOURCE.find(([p]) => key.startsWith(`${p}:`))?.[1] ?? "Skill levels";

type AwardRow = { award_key: string; skill_id: string | null; points: number; created_at: string };

/** Every coin the student has earned, a page at a time. */
export async function loadAwards(db: SupabaseClient, clerkId: string): Promise<PointAward[]> {
  const out: PointAward[] = [];
  for (let page = 0; page < 20; page++) {
    const { data, error } = await db
      .from("student_point_awards")
      .select("award_key, skill_id, points, created_at")
      .eq("student_id", clerkId)
      .order("award_key", { ascending: true })
      .range(page * 1000, page * 1000 + 999);
    if (error || !data) break;
    for (const r of data as AwardRow[])
      out.push({
        awardKey: r.award_key,
        skillId: r.skill_id,
        points: r.points,
        createdAt: r.created_at,
      });
    if (data.length < 1000) break;
  }
  return out;
}

export async function loadRewardRow(db: SupabaseClient, clerkId: string): Promise<RewardRow> {
  const { data } = await db
    .from("portal_rewards")
    .select("spent, owned, passes, face, outfit")
    .eq("student_id", clerkId)
    .maybeSingle()
    .then(
      (r) => r,
      () => ({ data: null })
    );
  const row = (data ?? null) as Partial<RewardRow> | null;
  return {
    spent: row?.spent ?? 0,
    owned: row?.owned ?? [],
    passes: row?.passes ?? {},
    face: row?.face ?? "fox",
    outfit: row?.outfit ?? {},
  };
}

export const earnedOf = (awards: readonly PointAward[], nowMs: number) =>
  summarisePoints(awards, nowMs).total;

export async function loadRewards(
  db: SupabaseClient,
  clerkId: string,
  nowMs: number
): Promise<RealRewards> {
  const [awards, row] = await Promise.all([loadAwards(db, clerkId), loadRewardRow(db, clerkId)]);
  const weekAgo = nowMs - 7 * 86_400_000;
  const week = new Map<string, number>();
  const byDay = new Map<string, number>();
  const seen = new Set<string>();
  for (const a of awards) {
    if (seen.has(a.awardKey)) continue;
    seen.add(a.awardKey);
    const day = dayKey(a.createdAt);
    byDay.set(day, (byDay.get(day) ?? 0) + a.points);
    if (Date.parse(a.createdAt) < weekAgo) continue;
    const name = sourceOf(a.awardKey);
    week.set(name, (week.get(name) ?? 0) + a.points);
  }
  const lifetime = earnedOf(awards, nowMs);
  return {
    coins: Math.max(0, lifetime - row.spent),
    lifetime,
    today: byDay.get(dayKey(nowMs)) ?? 0,
    bestDay: Math.max(0, ...byDay.values()),
    week: [...week].map(([name, coins]) => ({ name, coins })).sort((a, b) => b.coins - a.coins),
    owned: row.owned,
    passes: row.passes,
    face: row.face,
    outfit: row.outfit,
  };
}

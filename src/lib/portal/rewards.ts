/*
 * Rewards for a real student (src/app/dashboard/student/_portal/Rewards.tsx): coins earned by practice (the point
 * awards the quiz flows already save), less what was spent on boxes and passes; the things to wear
 * won; the passes held; and what the character has on. Spending is saved by reward-actions.ts in
 * `portal_rewards` (migration 20261121200000).
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { summarisePoints, type PointAward } from "@/lib/student/skill-points";
import { dayKey } from "@/lib/student/streak";
import { challengeDaysOf, multiplierPath } from "@/lib/coins/multiplier";
import { utcDayKey } from "@/lib/daily-challenge/selection";
import { runOf, sourceOf } from "./coin-sources";

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
  /** The challenge multiplier coins are paid with now, and its highest (src/lib/coins). */
  multiplier: { now: number; top: number };
}

export type RewardRow = {
  spent: number;
  owned: string[];
  passes: Record<string, number>;
  face: string;
  outfit: Record<string, string>;
};

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
  out.push(...(await loadPlayAwards(db, clerkId)), ...(await loadExamAwards(db, clerkId)));
  return out;
}

/** The coins each finished activity banked (student_coin_awards, migration 20261122040000), keyed
 *  by where they came from ("play:<source>:<run>"). A table not there yet reads as none. */
async function loadPlayAwards(db: SupabaseClient, clerkId: string): Promise<PointAward[]> {
  const out: PointAward[] = [];
  for (let page = 0; page < 20; page++) {
    const { data, error } = await db
      .from("student_coin_awards")
      .select("award_key, source, coins, created_at")
      .eq("student_id", clerkId)
      .order("award_key", { ascending: true })
      .range(page * 1000, page * 1000 + 999)
      .then(
        (r) => r,
        () => ({ data: null, error: true })
      );
    if (error || !data) break;
    const rows = data as { award_key: string; source: string; coins: number; created_at: string }[];
    for (const r of rows)
      out.push({
        awardKey: `play:${r.source}:${r.award_key}`,
        skillId: null,
        points: r.coins,
        createdAt: r.created_at,
      });
    if (rows.length < 1000) break;
  }
  return out;
}

/** The exams' coins, paid by improvement over the last exam (Exams stream, exam_sittings.coins). */
async function loadExamAwards(db: SupabaseClient, clerkId: string): Promise<PointAward[]> {
  const { data, error } = await db
    .from("exam_sittings")
    .select("id, coins, started_at, completed_at")
    .eq("student_id", clerkId)
    .gt("coins", 0)
    .limit(1000)
    .then(
      (r) => r,
      () => ({ data: null, error: true })
    );
  if (error || !data) return [];
  return (
    data as { id: string; coins: number; started_at: string; completed_at: string | null }[]
  ).map((r) => ({
    awardKey: `exam:${r.id}`,
    skillId: null,
    points: r.coins,
    createdAt: r.completed_at ?? r.started_at,
  }));
}

/** The student's row. Throws when it cannot be read: only no row, with no error, is a new student.
 *  (Reading a failure as "nothing yet" once let the next write erase everything they had.) */
export async function loadRewardRow(db: SupabaseClient, clerkId: string): Promise<RewardRow> {
  const { data, error } = await db
    .from("portal_rewards")
    .select("spent, owned, passes, face, outfit")
    .eq("student_id", clerkId)
    .maybeSingle();
  if (error) throw error;
  const row = (data ?? null) as Partial<RewardRow> | null;
  return {
    spent: row?.spent ?? 0,
    owned: row?.owned ?? [],
    passes: row?.passes ?? {},
    face: row?.face ?? "fox",
    outfit: row?.outfit ?? {},
  };
}

/** What the old Daily 10 boxes cost (cost less bonus), retired 2026-11-22: boxes opened before the
 *  swap stay paid for. */
export async function loadOldBoxes(db: SupabaseClient, clerkId: string): Promise<number> {
  const { data, error } = await db
    .from("student_reward_boxes")
    .select("cost, bonus")
    .eq("student_id", clerkId)
    .limit(5000);
  if (error) throw error;
  return ((data ?? []) as { cost: number; bonus: number }[]).reduce(
    (n, b) => n + Number(b.cost) - Number(b.bonus),
    0
  );
}

export const earnedOf = (awards: readonly PointAward[], nowMs: number) =>
  summarisePoints(awards, nowMs).total;

/** The kinds of the runs this week's coins came from, a batch at a time. */
async function runKinds(db: SupabaseClient, ids: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id && /^[0-9a-f-]{36}$/.test(id)))];
  const out = new Map<string, string>();
  for (let i = 0; i < unique.length; i += 200) {
    const { data } = await db
      .from("quiz_runs")
      .select("id, kind")
      .in("id", unique.slice(i, i + 200))
      .then(
        (r) => r,
        () => ({ data: null })
      );
    for (const r of (data ?? []) as { id: string; kind: string }[]) out.set(r.id, r.kind);
  }
  return out;
}

export async function loadRewards(
  db: SupabaseClient,
  clerkId: string,
  nowMs: number
): Promise<RealRewards> {
  // the page still draws when the student's things cannot be read, with no coins to spend (and
  // nothing is written from it)
  const [awards, read, boxes, answers] = await Promise.all([
    loadAwards(db, clerkId),
    loadRewardRow(db, clerkId).catch(() => null),
    loadOldBoxes(db, clerkId).catch(() => null),
    db
      .from("daily_challenge_answers")
      .select("day, is_correct")
      .eq("student_id", clerkId)
      .limit(5000)
      .then(
        (r) => (r.data ?? []) as { day: string; is_correct: boolean }[],
        () => []
      ),
  ]);
  const row = read ?? { spent: 0, owned: [], passes: {}, face: "fox", outfit: {} };
  const weekAgo = nowMs - 7 * 86_400_000;
  const week = new Map<string, number>();
  const byDay = new Map<string, number>();
  const seen = new Set<string>();
  const kinds = await runKinds(
    db,
    awards.filter((a) => Date.parse(a.createdAt) >= weekAgo).map((a) => runOf(a.awardKey))
  );
  for (const a of awards) {
    if (seen.has(a.awardKey)) continue;
    seen.add(a.awardKey);
    const day = dayKey(a.createdAt);
    byDay.set(day, (byDay.get(day) ?? 0) + a.points);
    if (Date.parse(a.createdAt) < weekAgo) continue;
    const name = sourceOf(a.awardKey, (id) => kinds.get(id));
    week.set(name, (week.get(name) ?? 0) + a.points);
  }
  const lifetime = earnedOf(awards, nowMs);
  return {
    coins: read && boxes !== null ? Math.max(0, lifetime - boxes - row.spent) : 0,
    lifetime,
    today: byDay.get(dayKey(nowMs)) ?? 0,
    bestDay: Math.max(0, ...byDay.values()),
    week: [...week].map(([name, coins]) => ({ name, coins })).sort((a, b) => b.coins - a.coins),
    owned: row.owned,
    passes: row.passes,
    face: row.face,
    outfit: row.outfit,
    multiplier: multiplierPath(challengeDaysOf(answers), utcDayKey(new Date(nowMs))),
  };
}

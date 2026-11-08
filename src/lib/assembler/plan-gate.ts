/*
 * Server only. What a student's plan opens in the quiz flows: the question pool (core 1 to 5,
 * mastery 1 to 7), the Free plan's 100 questions and one full-length test.
 *
 * This mirrors the pricing session's `src/lib/plans` contract (`getPlan`, `getUsage`,
 * `canAccess(plan, "pool:mastery" | "question:new" | "full-length-test:new", usage)`), which is
 * not merged on this branch yet. When it merges, replace `loadQuizAccess`'s body with:
 *
 *   const plan = await getPlan(clerkId);
 *   const usage = await getUsage(clerkId);
 *   return {
 *     maxDifficulty: difficultyRangeFor(plan).maximumDifficulty,
 *     questionsLeft: questionsLeft(plan, usage),
 *     fullTestsLeft: canAccess(plan, "full-length-test:new", usage) ? null : 0, ...
 *   };
 *
 * and count `quiz_run_responses` / completed `full-test` runs in pricing's usage source.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";

export const CORE_MAX_DIFFICULTY = 5;
export const MASTERY_MAX_DIFFICULTY = 7;
export const FREE_QUESTION_LIMIT = 100;
export const FREE_FULL_TESTS = 1;

export type QuizAccess = {
  plan: "free" | "core" | "mastery";
  maxDifficulty: number;
  /** Questions left on the Free plan; null when there is no limit. */
  questionsLeft: number | null;
  /** Full-length tests left to start; null when there is no limit. */
  fullTestsLeft: number | null;
};

const MASTERY_PLANS = new Set(["pro", "cohort", "private-10", "private-20", "tutor-affiliate"]);
const CORE_PLANS = new Set(["practice", "school"]);
/** Older tiers in `subscriptions.tier` before pricing's plan ids land. */
const MASTERY_TIERS = new Set(["private", "group", "elite", "pro"]);
const CORE_TIERS = new Set(["practice", "platform", "plus", "self_paced", "school"]);
const ACTIVE = new Set(["active", "trialing", "past_due"]);

function db(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

async function planFor(clerkId: string): Promise<QuizAccess["plan"]> {
  const { data, error } = await db()
    .from("subscriptions")
    .select("plan_id, tier, status")
    .eq("user_id", clerkId);
  if (error) {
    console.error("[quiz access] subscriptions could not be read", error.message);
    return "free";
  }
  let best: QuizAccess["plan"] = "free";
  for (const row of (data ?? []) as {
    plan_id?: string | null;
    tier?: string | null;
    status?: string | null;
  }[]) {
    if (!ACTIVE.has(row.status ?? "")) continue;
    const id = row.plan_id ?? "";
    const tier = row.tier ?? "";
    if (MASTERY_PLANS.has(id) || MASTERY_TIERS.has(tier)) return "mastery";
    if (CORE_PLANS.has(id) || CORE_TIERS.has(tier)) best = "core";
  }
  return best;
}

/** Distinct questions answered across quiz runs and skill practice. */
async function answeredCount(clerkId: string): Promise<number> {
  const ids = new Set<string>();
  const client = db();
  const { data: runs } = await client.from("quiz_runs").select("id").eq("student_id", clerkId);
  const runIds = (runs ?? []).map((r: { id: string }) => r.id);
  for (let i = 0; i < runIds.length; i += 100) {
    const { data } = await client
      .from("quiz_run_responses")
      .select("question_id")
      .in("run_id", runIds.slice(i, i + 100));
    for (const row of data ?? []) ids.add((row as { question_id: string }).question_id);
  }
  const { data: sessions } = await client
    .from("catalog_practice_sessions")
    .select("id")
    .eq("student_id", clerkId);
  const sessionIds = (sessions ?? []).map((r: { id: string }) => r.id);
  for (let i = 0; i < sessionIds.length; i += 100) {
    const { data } = await client
      .from("catalog_practice_responses")
      .select("question_id")
      .in("session_id", sessionIds.slice(i, i + 100));
    for (const row of data ?? []) ids.add((row as { question_id: string }).question_id);
  }
  return ids.size;
}

async function fullTestsStarted(clerkId: string): Promise<number> {
  const { count } = await db()
    .from("quiz_runs")
    .select("id", { count: "exact", head: true })
    .eq("student_id", clerkId)
    .eq("kind", "full-test");
  return count ?? 0;
}

export async function loadQuizAccess(clerkId: string): Promise<QuizAccess> {
  const plan = await planFor(clerkId);
  if (plan !== "free") {
    return {
      plan,
      maxDifficulty: plan === "mastery" ? MASTERY_MAX_DIFFICULTY : CORE_MAX_DIFFICULTY,
      questionsLeft: null,
      fullTestsLeft: null,
    };
  }
  const [answered, tests] = await Promise.all([answeredCount(clerkId), fullTestsStarted(clerkId)]);
  return {
    plan,
    maxDifficulty: CORE_MAX_DIFFICULTY,
    questionsLeft: Math.max(0, FREE_QUESTION_LIMIT - answered),
    fullTestsLeft: Math.max(0, FREE_FULL_TESTS - tests),
  };
}

export class PlanLimitError extends Error {}

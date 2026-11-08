/*
 * Server only. What a student's plan opens in the quiz flows, from the pricing rules in
 * `src/lib/plans` (`getPlan`, `getUsage`): the question pool (core 1 to 5, mastery 1 to 7), the
 * Free plan's 100 questions and its one full-length test.
 *
 * `getUsage` counts skill practice and the older node quizzes. The quiz runs (Daily 10, practice
 * sets, Domain quizzes) are counted here on top, and full-length tests by the runs started, until
 * pricing's usage source reads `quiz_runs` itself. The free full-length test and the diagnostic do
 * not count toward the 100 questions.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { CORE_MAX_DIFFICULTY, PLAN_ENTITLEMENTS, getPlan, getUsage } from "@/lib/plans";

export const MASTERY_MAX_DIFFICULTY = 7;

export type QuizAccess = {
  plan: "free" | "core" | "mastery";
  maxDifficulty: number;
  /** Questions left on the Free plan; null when there is no limit. */
  questionsLeft: number | null;
  /** Full-length tests left to start; null when there is no limit. */
  fullTestsLeft: number | null;
};

function db(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

/** Distinct questions answered in Daily 10s, practice sets and Domain quizzes. */
async function runAnswerCount(clerkId: string): Promise<number> {
  const ids = new Set<string>();
  const client = db();
  const { data: runs } = await client
    .from("quiz_runs")
    .select("id")
    .eq("student_id", clerkId)
    .in("kind", ["daily-ten", "practice-set", "domain-quiz"]);
  const runIds = (runs ?? []).map((r: { id: string }) => r.id);
  for (let i = 0; i < runIds.length; i += 100) {
    const { data } = await client
      .from("quiz_run_responses")
      .select("question_id")
      .in("run_id", runIds.slice(i, i + 100));
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
  // A plan that cannot be read counts as Free (as the student portal does): limits still apply.
  const entitlements = await getPlan(clerkId)
    .then((plan) => plan.entitlements)
    .catch((error: unknown) => {
      console.error("[quiz access] plan could not be read", error);
      return PLAN_ENTITLEMENTS.free;
    });
  const mastery = entitlements.pool === "mastery";
  const access: QuizAccess = {
    plan: mastery ? "mastery" : entitlements.questionLimit === null ? "core" : "free",
    maxDifficulty: mastery ? MASTERY_MAX_DIFFICULTY : CORE_MAX_DIFFICULTY,
    questionsLeft: null,
    fullTestsLeft: null,
  };
  if (entitlements.questionLimit !== null) {
    const [usage, inRuns] = await Promise.all([
      getUsage(clerkId).catch(() => ({ questionsAnswered: 0, fullLengthTestsCompleted: 0 })),
      runAnswerCount(clerkId),
    ]);
    access.questionsLeft = Math.max(
      0,
      entitlements.questionLimit - usage.questionsAnswered - inRuns
    );
  }
  if (entitlements.fullLengthTestLimit !== null) {
    access.fullTestsLeft = Math.max(
      0,
      entitlements.fullLengthTestLimit - (await fullTestsStarted(clerkId))
    );
  }
  return access;
}

export class PlanLimitError extends Error {}

/*
 * Pure, safe anywhere (client too). How an answer-saving action says "the Free plan's limit is
 * reached": server actions return this value instead of throwing, because Next hides thrown
 * messages in production. The client shows the upgrade prompt (`FreeLimitPrompt`) when it sees it.
 */

export const FREE_QUESTIONS_MESSAGE = "You have used the Free plan's 100 questions.";

export class PlanLimitError extends Error {}

export type PlanLimitResult = { planLimit: true; message: string };

export function isPlanLimit(value: unknown): value is PlanLimitResult {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { planLimit?: unknown }).planLimit === true
  );
}

/** Runs an answer-saving step; a PlanLimitError becomes a PlanLimitResult, anything else throws. */
export async function withPlanLimit<T>(work: () => Promise<T>): Promise<T | PlanLimitResult> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof PlanLimitError) return { planLimit: true, message: error.message };
    throw error;
  }
}

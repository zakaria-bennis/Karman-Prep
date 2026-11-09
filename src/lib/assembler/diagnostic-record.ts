/*
 * Server only. The bank-fed diagnostic (`/learn/diagnostic`) and the rest of the product.
 *
 * - Its predicted score is saved to `diagnostic_results`, the table the Progress page, Today, and
 *   the parent and tutor portals read. One number, so the stored low and high are the same.
 * - Retakes: one diagnostic each, plus one more for every retake an admin grants
 *   (`users.diagnostic_retakes_remaining`, Admin > Users > Allow retake).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import type { RunRecord, RunResult } from "./run-types";

function db(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

/** The row a finished diagnostic writes: one predicted total, each section's number. */
export function diagnosticResultRow(
  userId: string,
  predicted: NonNullable<RunResult["predicted"]>,
  takenAt: string
) {
  return {
    user_id: userId,
    taken_at: takenAt,
    score_range_low: predicted.total,
    score_range_high: predicted.total,
    domain_scores: { reading: predicted.reading, math: predicted.math },
    weak_concepts: [] as string[],
  };
}

/** The run key for the next diagnostic after `latestKey` ("diagnostic:1", "diagnostic:2", ...). */
export function nextDiagnosticKey(latestKey: string | null): string {
  const n = latestKey ? Number(latestKey.replace("diagnostic:", "")) : 0;
  return `diagnostic:${Number.isInteger(n) && n > 0 ? n + 1 : 1}`;
}

async function userRow(clerkId: string) {
  const { data, error } = await db()
    .from("users")
    .select("id, diagnostic_retakes_remaining")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (error) throw new Error("Student could not be loaded");
  return data as { id: string; diagnostic_retakes_remaining: number | null } | null;
}

/** Saves a finished diagnostic's predicted score where Progress reads it. Logs, never throws. */
export async function recordDiagnosticResult(
  clerkId: string,
  predicted: NonNullable<RunResult["predicted"]>,
  takenAt: string
): Promise<void> {
  try {
    const user = await userRow(clerkId);
    if (!user) return;
    const { error } = await db()
      .from("diagnostic_results")
      .insert(diagnosticResultRow(user.id, predicted, takenAt));
    if (error) console.error("[diagnostic] result could not be saved", error.message);
  } catch (error) {
    console.error("[diagnostic] result could not be saved", error);
  }
}

/**
 * The run key for a new diagnostic, or null to show the latest one again: an unfinished one
 * resumes, and a finished one stays (its report) unless an admin granted a retake, which this uses.
 */
export async function nextDiagnosticRun(
  clerkId: string,
  latest: RunRecord | null
): Promise<string | null> {
  if (!latest) return nextDiagnosticKey(null);
  if (!latest.completedAt || !(await consumeDiagnosticRetake(clerkId))) return null;
  return nextDiagnosticKey(latest.runKey);
}

/** Uses one admin-granted retake. False when none is left. */
async function consumeDiagnosticRetake(clerkId: string): Promise<boolean> {
  const user = await userRow(clerkId);
  const left = user?.diagnostic_retakes_remaining ?? 0;
  if (!user || left <= 0) return false;
  const { data, error } = await db()
    .from("users")
    .update({ diagnostic_retakes_remaining: left - 1 })
    .eq("id", user.id)
    .eq("diagnostic_retakes_remaining", left)
    .select("id");
  if (error) throw new Error("Retake could not be used");
  return (data ?? []).length === 1;
}

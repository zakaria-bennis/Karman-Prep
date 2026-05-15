// ============================================================
// learn_node_status reads + post-quiz mutation.
// Carved out of the old quiz.ts catch-all (audit M1).
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";
import type { ConfidenceBand, QuizAttempt } from "@/types/quiz";
import { fetchAttemptsForNode } from "./attempts";

export async function updateNodeAfterQuiz(
  studentId: string,
  nodeId: string,
  score: number,
  band: ConfidenceBand
): Promise<{ newStatus: "in_progress" | "partially_complete" | "mastered" }> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("learn_node_status")
    .select("status, best_quiz_score, consecutive_passes")
    .eq("user_id", studentId)
    .eq("node_id", nodeId)
    .single();

  const bestBefore: number = existing?.best_quiz_score ?? 0;
  const consecutiveBefore: number = existing?.consecutive_passes ?? 0;
  const passed = score >= 80;

  let newStatus: "in_progress" | "partially_complete" | "mastered";
  let consecutive = consecutiveBefore;

  if (passed) {
    consecutive = consecutiveBefore + 1;
    if (consecutive >= 2) newStatus = "mastered";
    else newStatus = "partially_complete";
  } else {
    consecutive = 0;
    newStatus = "in_progress";
  }

  await supabase.from("learn_node_status").upsert({
    user_id: studentId,
    node_id: nodeId,
    status: newStatus,
    last_quiz_score: score,
    best_quiz_score: Math.max(bestBefore, score),
    consecutive_passes: consecutive,
    confidence_band: band,
    attempts: ((existing as { attempts?: number } | null)?.attempts ?? 0) + 1,
    updated_at: new Date().toISOString(),
    completed_at: newStatus === "mastered" ? new Date().toISOString() : null,
  });

  // Placeholder hook for Prompt 3 (spaced repetition decay reset)
  await maybeResetNodeDecay(studentId, nodeId, newStatus);

  return { newStatus };
}

/**
 * Spaced-repetition decay reset — placeholder for Prompt 3.
 * Will schedule the next review interval once spaced-rep logic lands.
 */
export async function maybeResetNodeDecay(
  _studentId: string,
  _nodeId: string,
  _status: string
): Promise<void> {
  // Intentionally empty. Prompt 3 will implement the SR algorithm.
}

export async function updateWatchPercentage(
  studentId: string,
  nodeId: string,
  percentage: number
): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("learn_node_status").upsert({
    user_id: studentId,
    node_id: nodeId,
    watch_percentage: Math.max(0, Math.min(100, Math.round(percentage))),
    updated_at: new Date().toISOString(),
  });
}

export async function fetchNodeStatusBundle(
  studentId: string,
  nodeId: string
): Promise<{
  status: string | null;
  best_quiz_score: number | null;
  watch_percentage: number | null;
  confidence_band: ConfidenceBand | null;
  attempts: QuizAttempt[];
}> {
  const supabase = createAdminClient();

  const [statusRes, attempts] = await Promise.all([
    supabase
      .from("learn_node_status")
      .select("status, best_quiz_score, watch_percentage, confidence_band")
      .eq("user_id", studentId)
      .eq("node_id", nodeId)
      .maybeSingle(),
    fetchAttemptsForNode(studentId, nodeId),
  ]);

  return {
    status: statusRes.data?.status ?? null,
    best_quiz_score: statusRes.data?.best_quiz_score ?? null,
    watch_percentage: statusRes.data?.watch_percentage ?? null,
    confidence_band: (statusRes.data?.confidence_band as ConfidenceBand | null) ?? null,
    attempts,
  };
}

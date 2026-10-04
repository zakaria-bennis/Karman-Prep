// ============================================================
// learn_node_status reads + post-quiz mutation.
// Carved out of the old quiz.ts catch-all (audit M1).
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";
import type { ConfidenceBand, QuizAttempt } from "@/types/quiz";
import { fetchAttemptsForNode } from "./attempts";

export async function updateWatchPercentage(
  studentId: string,
  nodeId: string,
  percentage: number
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("learn_node_status").upsert(
    {
      user_id: studentId,
      node_id: nodeId,
      watch_percentage: Math.max(0, Math.min(100, Math.round(percentage))),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,node_id" }
  );
  if (error) throw error;
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

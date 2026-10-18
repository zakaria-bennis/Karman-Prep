import { createAdminClient } from "@/lib/supabase/server";

export interface LegacyLearningRecord {
  node_id: string;
  status: string;
  score: number | null;
  attempts: number | null;
  watch_percentage: number | null;
}

/** Read-only compatibility view. Never seed, rename or merge legacy progress. */
export async function fetchLegacyLearningHistory(userId: string): Promise<LegacyLearningRecord[]> {
  const { data, error } = await createAdminClient()
    .from("learn_node_status")
    .select("node_id, status, score, attempts, watch_percentage")
    .eq("user_id", userId);
  if (error) throw new Error("Your learning history could not be loaded. Please try again.");
  return data ?? [];
}

"use server";

// ============================================================
// Learn portal — Server Actions
// markNodeComplete: mark a node mastered + unlock dependents
// initUserProgress: seed the first unlock for a new student
// ============================================================

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getNodes, getUnlockedBy, type Subject } from "@/data/curriculum";

/** Seed initial progress for a student who has never opened this subject */
export async function initUserProgress(subject: Subject) {
  const { userId } = await auth();
  if (!userId) return;

  const supabase = createAdminClient();
  const nodes = getNodes(subject);
  const prefix = subject === "reading" ? "rw" : "ma";
  const firstId = `${prefix}-00`;

  // Upsert all nodes as locked, except the first which is "available"
  const records = nodes.map((n) => ({
    user_id: userId,
    node_id: n.id,
    status: n.id === firstId ? "available" : "locked",
    updated_at: new Date().toISOString(),
  }));

  await supabase
    .from("learn_node_status")
    .upsert(records, { onConflict: "user_id,node_id", ignoreDuplicates: true });

  revalidatePath(`/learn/${subject}`);
}

/**
 * Mark a node as mastered, then automatically unlock any nodes
 * whose prerequisites are now all mastered.
 */
export async function markNodeComplete(nodeId: string, subject: Subject) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const supabase = createAdminClient();

  // 1. Mark the node mastered
  await supabase.from("learn_node_status").upsert({
    user_id:      userId,
    node_id:      nodeId,
    status:       "mastered",
    score:        100,
    completed_at: new Date().toISOString(),
    updated_at:   new Date().toISOString(),
  });

  // 2. Load current status map for this user + subject
  const nodes = getNodes(subject);
  const { data: statusRows } = await supabase
    .from("learn_node_status")
    .select("node_id, status")
    .eq("user_id", userId)
    .in("node_id", nodes.map((n) => n.id));

  const statusMap = new Map(statusRows?.map((r) => [r.node_id, r.status]) ?? []);
  statusMap.set(nodeId, "mastered"); // reflect the update we just made

  // 3. Find nodes that are now fully unlocked
  const dependents = getUnlockedBy(subject, nodeId);
  const nowAvailable = dependents.filter((n) => {
    const cur = statusMap.get(n.id);
    if (cur && cur !== "locked") return false; // already unlocked
    return n.prereqIds.every((pid) => statusMap.get(pid) === "mastered");
  });

  if (nowAvailable.length > 0) {
    await supabase.from("learn_node_status").upsert(
      nowAvailable.map((n) => ({
        user_id:    userId,
        node_id:    n.id,
        status:     "available",
        updated_at: new Date().toISOString(),
      }))
    );
  }

  revalidatePath(`/learn/${subject}`);
  revalidatePath(`/learn/${subject}/${nodeId}`);

  return { unlockedCount: nowAvailable.length, newNodes: nowAvailable.map((n) => n.topic) };
}

/** Mark a node as in-progress (called when a student opens a node lesson) */
export async function markNodeInProgress(nodeId: string, subject: Subject) {
  const { userId } = await auth();
  if (!userId) return;

  const supabase = createAdminClient();

  await supabase.from("learn_node_status").upsert({
    user_id:    userId,
    node_id:    nodeId,
    status:     "in_progress",
    updated_at: new Date().toISOString(),
  });

  revalidatePath(`/learn/${subject}/${nodeId}`);
}

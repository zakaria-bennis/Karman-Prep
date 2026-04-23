// ============================================================
// /learn/reading — Reading & Writing constellation map
// ============================================================

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { RW_NODES } from "@/data/curriculum";
import type { NodeStatus } from "@/data/curriculum";
import ConstellationMap, { type MappedNode } from "@/components/learn/ConstellationMap";
import { initUserProgress } from "@/app/learn/actions";

export const metadata: Metadata = {
  title: "Reading & Writing — Learn | Strata",
};

export default async function ReadingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const supabase = createAdminClient();

  // Fetch this user's node statuses
  const { data: statusRows } = await supabase
    .from("learn_node_status")
    .select("node_id, status")
    .eq("user_id", userId)
    .in("node_id", RW_NODES.map((n) => n.id));

  // First visit — seed initial progress
  if (!statusRows || statusRows.length === 0) {
    await initUserProgress("reading");
    // Refetch after seeding
    const { data: seeded } = await supabase
      .from("learn_node_status")
      .select("node_id, status")
      .eq("user_id", userId)
      .in("node_id", RW_NODES.map((n) => n.id));
    statusRows?.push(...(seeded ?? []));
  }

  const statusMap = new Map(statusRows?.map((r) => [r.node_id, r.status as NodeStatus]) ?? []);

  const mappedNodes: MappedNode[] = RW_NODES.map((n) => ({
    ...n,
    status: statusMap.get(n.id) ?? (n.id === "rw-00" ? "available" : "locked"),
  }));

  return <ConstellationMap subject="reading" nodes={mappedNodes} />;
}

// ============================================================
// /learn/math — Full brain constellation focused on Math.
// Both lobes are rendered; Math (right) is active.
// ============================================================

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { RW_NODES, MATH_NODES } from "@/data/curriculum";
import type { NodeStatus } from "@/data/curriculum";
import ConstellationMap, { type MappedNode } from "@/components/learn/ConstellationMap";
import { initUserProgress } from "@/app/learn/actions";

export const metadata: Metadata = {
  title: "Math — Learn | Karman",
};

export default async function MathPage() {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const supabase = createAdminClient();
  const allIds = [...RW_NODES, ...MATH_NODES].map((n) => n.id);

  const { data: statusRows } = await supabase
    .from("learn_node_status")
    .select("node_id, status")
    .eq("user_id", userId)
    .in("node_id", allIds);

  const statusMap = new Map(statusRows?.map((r) => [r.node_id, r.status as NodeStatus]) ?? []);
  if (!RW_NODES.some((n) => statusMap.has(n.id)))   await initUserProgress("reading");
  if (!MATH_NODES.some((n) => statusMap.has(n.id))) await initUserProgress("math");

  const finalRows = statusRows ?? [];
  if (finalRows.length === 0) {
    const { data: seeded } = await supabase
      .from("learn_node_status")
      .select("node_id, status")
      .eq("user_id", userId)
      .in("node_id", allIds);
    finalRows.push(...(seeded ?? []));
  }
  const finalMap = new Map(finalRows.map((r) => [r.node_id, r.status as NodeStatus]));

  const readingNodes: MappedNode[] = RW_NODES.map((n) => ({
    ...n,
    status: finalMap.get(n.id) ?? (n.id === "rw-00" ? "available" : "locked"),
  }));
  const mathNodes: MappedNode[] = MATH_NODES.map((n) => ({
    ...n,
    status: finalMap.get(n.id) ?? (n.id === "ma-00" ? "available" : "locked"),
  }));

  return (
    <ConstellationMap
      activeSubject="math"
      readingNodes={readingNodes}
      mathNodes={mathNodes}
    />
  );
}

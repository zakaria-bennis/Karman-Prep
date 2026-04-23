// ============================================================
// /learn/math — Math constellation map
// ============================================================

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { MATH_NODES } from "@/data/curriculum";
import type { NodeStatus } from "@/data/curriculum";
import ConstellationMap, { type MappedNode } from "@/components/learn/ConstellationMap";
import { initUserProgress } from "@/app/learn/actions";

export const metadata: Metadata = {
  title: "Math — Learn | Strata",
};

export default async function MathPage() {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const supabase = createAdminClient();

  const { data: statusRows } = await supabase
    .from("learn_node_status")
    .select("node_id, status")
    .eq("user_id", userId)
    .in("node_id", MATH_NODES.map((n) => n.id));

  if (!statusRows || statusRows.length === 0) {
    await initUserProgress("math");
    const { data: seeded } = await supabase
      .from("learn_node_status")
      .select("node_id, status")
      .eq("user_id", userId)
      .in("node_id", MATH_NODES.map((n) => n.id));
    statusRows?.push(...(seeded ?? []));
  }

  const statusMap = new Map(statusRows?.map((r) => [r.node_id, r.status as NodeStatus]) ?? []);

  const mappedNodes: MappedNode[] = MATH_NODES.map((n) => ({
    ...n,
    status: statusMap.get(n.id) ?? (n.id === "ma-00" ? "available" : "locked"),
  }));

  return <ConstellationMap subject="math" nodes={mappedNodes} />;
}

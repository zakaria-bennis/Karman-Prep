// ============================================================
// /learn — Mode selection screen
// Two Framer-Motion portal cards (Reading & Writing / Math)
// ============================================================

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { RW_NODES, MATH_NODES } from "@/data/curriculum";
import PortalCards from "@/components/learn/PortalCards";

export const metadata: Metadata = {
  title: "Learn — Karman",
  description: "Choose your constellation and start mastering the SAT.",
};

async function getCompletionStats(userId: string) {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("learn_node_status")
    .select("node_id, status")
    .eq("user_id", userId);

  const statuses = new Map(data?.map((r) => [r.node_id, r.status]) ?? []);

  const count = (nodes: typeof RW_NODES) => ({
    total: nodes.length,
    mastered: nodes.filter((n) => statuses.get(n.id) === "mastered").length,
    available: nodes.filter(
      (n) => statuses.get(n.id) === "available" || statuses.get(n.id) === "in_progress"
    ).length,
  });

  return {
    reading: count(RW_NODES),
    math: count(MATH_NODES),
  };
}

export default async function LearnPage() {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const stats = await getCompletionStats(userId);

  // Full-screen hero — the PortalCards component is now itself a fixed two-pane hero.
  return <PortalCards readingStats={stats.reading} mathStats={stats.math} />;
}

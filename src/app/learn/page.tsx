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
  title: "Learn — Strata",
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
    total:    nodes.length,
    mastered: nodes.filter((n) => statuses.get(n.id) === "mastered").length,
    available: nodes.filter(
      (n) => statuses.get(n.id) === "available" || statuses.get(n.id) === "in_progress"
    ).length,
  });

  return {
    reading: count(RW_NODES),
    math:    count(MATH_NODES),
  };
}

export default async function LearnPage() {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const stats = await getCompletionStats(userId);

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-4 py-12">
      {/* Heading */}
      <div className="text-center mb-12">
        <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-3">
          Constellation Map
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
          Choose your path
        </h1>
        <p className="text-slate-400 text-sm max-w-sm mx-auto">
          Master every node in your constellation to unlock the next tier.
          Each star is a concept. Each line is a connection.
        </p>
      </div>

      {/* Portal cards */}
      <PortalCards readingStats={stats.reading} mathStats={stats.math} />
    </div>
  );
}

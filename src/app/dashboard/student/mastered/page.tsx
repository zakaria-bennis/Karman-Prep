// ============================================================
// /dashboard/student/mastered — list of mastered nodes with filter + sort
// ============================================================

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { RW_NODES, MATH_NODES, type CurriculumNode } from "@/data/curriculum";
import MasteredNodesList from "@/components/dashboard/MasteredNodesList";

export const metadata: Metadata = { title: "Mastered Nodes — Karman" };

export interface MasteredNodeRow extends CurriculumNode {
  mastered_at: string;
  best_quiz_score: number | null;
  attempts: number;
}

export default async function MasteredPage() {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const supabase = createAdminClient();

  const { data: rows } = await supabase
    .from("learn_node_status")
    .select("node_id, completed_at, best_quiz_score, attempts, updated_at")
    .eq("user_id", userId)
    .eq("status", "mastered");

  const nodeMap = new Map<string, CurriculumNode>();
  [...RW_NODES, ...MATH_NODES].forEach((n) => nodeMap.set(n.id, n));

  const mastered: MasteredNodeRow[] = (rows ?? [])
    .map((r) => {
      const row = r as { node_id: string; completed_at: string | null; best_quiz_score: number | null; attempts: number | null; updated_at: string };
      const node = nodeMap.get(row.node_id);
      if (!node) return null;
      return {
        ...node,
        mastered_at: row.completed_at ?? row.updated_at,
        best_quiz_score: row.best_quiz_score,
        attempts: row.attempts ?? 0,
      };
    })
    .filter((x): x is MasteredNodeRow => x !== null);

  return <MasteredNodesList mastered={mastered} />;
}

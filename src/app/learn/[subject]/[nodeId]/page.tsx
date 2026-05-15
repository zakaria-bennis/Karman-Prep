// ============================================================
// /learn/[subject]/[nodeId] — Individual node lesson page
// ============================================================

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { getNode, getNodes, type Subject, type NodeStatus } from "@/data/curriculum";
import NodeDetail from "@/components/learn/NodeDetail";

interface Params {
  params: Promise<{ subject: string; nodeId: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { subject, nodeId } = await params;
  const node = getNode(subject as Subject, nodeId);
  return { title: node ? `${node.topic} — Learn | Karman` : "Lesson | Karman" };
}

export default async function NodePage({ params }: Params) {
  const { subject, nodeId } = await params;

  // Validate subject param
  if (subject !== "reading" && subject !== "math") notFound();
  const sub = subject as Subject;

  // Validate node ID
  const node = getNode(sub, nodeId);
  if (!node) notFound();

  const { userId: realUserId } = await auth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId: userId } = await resolveEffectiveClerkId(realUserId);

  const supabase = createAdminClient();

  // Load statuses for all nodes in this subject (needed to show prereq states)
  const nodes = getNodes(sub);
  const { data: statusRows } = await supabase
    .from("learn_node_status")
    .select("node_id, status, score, attempts")
    .eq("user_id", userId)
    .in(
      "node_id",
      nodes.map((n) => n.id)
    );

  const statusMap = new Map(
    statusRows?.map((r) => [
      r.node_id,
      { status: r.status as NodeStatus, score: r.score, attempts: r.attempts },
    ]) ?? []
  );

  const currentStatus = statusMap.get(nodeId)?.status ?? "locked";
  const currentScore = statusMap.get(nodeId)?.score ?? null;

  // Prereq node details with their status
  const prereqs = node.prereqIds.map((pid) => {
    const pn = getNode(sub, pid)!;
    return { ...pn, status: statusMap.get(pid)?.status ?? ("locked" as NodeStatus) };
  });

  // Nodes this lesson unlocks (dependents)
  const unlocks = nodes
    .filter((n) => n.prereqIds.includes(nodeId))
    .map((n) => ({ ...n, status: statusMap.get(n.id)?.status ?? ("locked" as NodeStatus) }));

  return (
    <NodeDetail
      node={node}
      subject={sub}
      currentStatus={currentStatus}
      currentScore={currentScore}
      prereqs={prereqs}
      unlocks={unlocks}
    />
  );
}

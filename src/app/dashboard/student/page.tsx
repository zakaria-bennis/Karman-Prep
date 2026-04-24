// ============================================================
// Student Dashboard Home
// Shows streak, progress ring, domain bars, and next lesson.
// ============================================================

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import StudentDashboardClient from "@/components/dashboard/StudentDashboardClient";

export const metadata: Metadata = { title: "Dashboard" };

export default async function StudentDashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const supabase = createAdminClient();

  // Check subscription status — redirect to billing if not subscribed
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  const isActive = sub?.status === "active" || sub?.status === "trialing";
  if (!isActive) redirect("/billing?required=1");

  // Fetch user info
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_id", userId)
    .single();

  // Fetch progress across all concepts
  const { data: progress } = await supabase
    .from("progress")
    .select("*, concepts(*)")
    .eq("user_id", user?.id || "")
    .order("last_visited", { ascending: false });

  // Fetch latest diagnostic result
  const { data: diagnostic } = await supabase
    .from("diagnostic_results")
    .select("*")
    .eq("user_id", user?.id || "")
    .order("taken_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch learn_node_status — keyed by Clerk userId (the string) directly
  const { data: nodeStatusRows } = await supabase
    .from("learn_node_status")
    .select("node_id, status")
    .eq("user_id", userId);

  const nodeStatuses = new Map(
    (nodeStatusRows ?? []).map((r) => {
      const row = r as { node_id: string; status: string };
      return [row.node_id, row.status] as const;
    })
  );

  return (
    <StudentDashboardClient
      user={user}
      progress={progress || []}
      nodeStatuses={nodeStatuses as Map<string, import("@/data/curriculum").NodeStatus>}
      diagnostic={diagnostic}
      subscription={sub}
    />
  );
}

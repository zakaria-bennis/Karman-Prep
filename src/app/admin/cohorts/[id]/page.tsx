// ============================================================
// /admin/cohorts/[id]: one cohort. Tabs: Members, Notes, Homework.
// ============================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchCohortDetail, fetchEligibleStudentsForCohort } from "@/lib/supabase/queries/cohorts";
import { findChannelsByCohort } from "@/lib/supabase/queries/chat";
import CohortDetailClient from "./CohortDetailClient";

export const metadata: Metadata = { title: "Cohort" };
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function AdminCohortDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { tab } = await searchParams;

  const [detail, eligibleStudents, chatChannels] = await Promise.all([
    fetchCohortDetail(id),
    fetchEligibleStudentsForCohort(id),
    findChannelsByCohort(id),
  ]);
  if (!detail) notFound();
  // Channels are provisioned when both the cohort_chat and qa rows exist.
  const chatProvisioned =
    chatChannels.some((c) => c.channel_type === "cohort_chat") &&
    chatChannels.some((c) => c.channel_type === "qa");

  const activeTab = tab === "notes" ? "notes" : tab === "homework" ? "homework" : "members";

  return (
    <CohortDetailClient
      detail={detail}
      activeTab={activeTab}
      eligibleStudents={eligibleStudents}
      chatProvisioned={chatProvisioned}
    />
  );
}

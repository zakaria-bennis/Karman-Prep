// ============================================================
// /admin/cohorts/[id] — Cohort detail page
// Tabs: Members | Notes | Homework
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { fetchCohortDetail, fetchEligibleStudentsForCohort } from "@/lib/supabase/queries/cohorts";
import { findChannelsByCohort } from "@/lib/supabase/queries/chat";
import CohortDetailClient from "./CohortDetailClient";

export const metadata: Metadata = { title: "Admin — Cohort | Strata" };
export const dynamic = "force-dynamic";

interface PageProps {
  params:       Promise<{ id: string }>;
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

  const activeTab =
    tab === "notes"    ? "notes"    :
    tab === "homework" ? "homework" :
                         "members";

  return (
    <div className="max-w-6xl mx-auto px-5 py-8">
      <Link
        href="/admin/cohorts"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        All cohorts
      </Link>
      <CohortDetailClient
        detail={detail}
        activeTab={activeTab}
        eligibleStudents={eligibleStudents}
        chatProvisioned={chatProvisioned}
      />
    </div>
  );
}

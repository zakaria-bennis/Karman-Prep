// ============================================================
// /admin/cohorts/[id] — Cohort detail page
// Tabs: Members | Notes | Homework
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { fetchCohortDetail } from "@/lib/supabase/queries/cohorts";
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

  const detail = await fetchCohortDetail(id);
  if (!detail) notFound();

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
      <CohortDetailClient detail={detail} activeTab={activeTab} />
    </div>
  );
}

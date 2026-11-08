// ============================================================
// /admin/cohorts: the cohort list and the "Create cohort" dialog.
// Server component: loads cohorts, SAT dates and tutors and hands
// them to the client component.
// ============================================================

import type { Metadata } from "next";
import { fetchCohorts, fetchUpcomingSatDates, fetchTutors } from "@/lib/supabase/queries/cohorts";
import CohortsClient from "./CohortsClient";

export const metadata: Metadata = { title: "Cohorts" };

// Don't cache: admins create cohorts and expect to see them on return.
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ show?: string }>;
}

export default async function AdminCohortsPage({ searchParams }: PageProps) {
  // `?show=archived` also lists auto-archived cohorts so admins can
  // review and un-archive them (audit #13).
  const { show } = await searchParams;
  const showArchived = show === "archived";

  const [cohorts, satDates, tutors] = await Promise.all([
    fetchCohorts({ includeArchived: showArchived }),
    fetchUpcomingSatDates(),
    fetchTutors(),
  ]);

  return (
    <CohortsClient
      cohorts={cohorts}
      satDates={satDates}
      tutors={tutors}
      showArchived={showArchived}
    />
  );
}

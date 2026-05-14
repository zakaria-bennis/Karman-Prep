// ============================================================
// /admin/cohorts — Cohort roster + "Create cohort" dialog.
// Server component: fetches cohorts / SAT dates / tutors,
// hands them to the client component for interaction.
// ============================================================

import type { Metadata } from "next";
import { fetchCohorts, fetchUpcomingSatDates, fetchTutors } from "@/lib/supabase/queries/cohorts";
import CohortsClient from "./CohortsClient";

export const metadata: Metadata = { title: "Admin — Cohorts | Karman" };

// Don't cache — admins will be creating cohorts and expect to see them
// immediately on return to the list.
export const dynamic = "force-dynamic";

export default async function AdminCohortsPage() {
  const [cohorts, satDates, tutors] = await Promise.all([
    fetchCohorts(),
    fetchUpcomingSatDates(),
    fetchTutors(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <CohortsClient cohorts={cohorts} satDates={satDates} tutors={tutors} />
    </div>
  );
}

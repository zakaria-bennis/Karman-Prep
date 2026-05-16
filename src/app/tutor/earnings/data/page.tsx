// ============================================================
// /tutor/earnings/data — detailed earning data view.
//
// Time-range dropdown + sessions table + analytics chart +
// payout history. Lives on its own URL so the main /tutor/earnings
// stays slim.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import {
  fetchTutorEarningsSummary,
  fetchTutorRecentSessions,
  fetchTutorPayoutRequests,
  fetchTutorWeeklyEarnings,
  fetchTutorStudentSessionCounts,
  type TimeRange,
} from "@/lib/supabase/queries/earnings";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import EarningsDataClient from "./EarningsDataClient";

export const metadata: Metadata = { title: "Earning Data — Karman" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ range?: string }>;
}

const VALID_RANGES: TimeRange[] = ["today", "7d", "14d", "30d", "3mo", "6mo", "1y", "all"];

export default async function TutorEarningsDataPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const range: TimeRange = (VALID_RANGES as string[]).includes(sp.range ?? "")
    ? (sp.range as TimeRange)
    : "30d";

  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId } = await resolveEffectiveClerkId(realUserId);

  const role = await fetchUserRole(clerkId);
  if (role !== "tutor" && role !== "admin") redirect("/dashboard/student");

  const supabase = createAdminClient();
  const { data: caller } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!caller) redirect("/auth/sign-in");

  const tutorUserId = caller.id as string;

  const [summary, sessions, payouts, weekly, studentCounts] = await Promise.all([
    fetchTutorEarningsSummary(tutorUserId),
    fetchTutorRecentSessions(tutorUserId, range, 200),
    fetchTutorPayoutRequests(tutorUserId, 10),
    fetchTutorWeeklyEarnings(tutorUserId, 12),
    fetchTutorStudentSessionCounts(tutorUserId),
  ]);

  // Map → object so it's serializable across the server-client boundary.
  const studentCountsObj: Record<string, number> = {};
  for (const [k, v] of studentCounts) studentCountsObj[k] = v;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <Link
          href="/tutor/earnings"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" /> My earnings
        </Link>

        <header>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-blue-500">
            Tutor Portal
          </p>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Earning data</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Filter sessions by time range. Bottom chart shows trends across the last 12 weeks.
          </p>
        </header>

        <EarningsDataClient
          summary={summary}
          sessions={sessions}
          payouts={payouts}
          weekly={weekly}
          range={range}
          studentSessionCounts={studentCountsObj}
        />
      </div>
    </DashboardLayout>
  );
}

// ============================================================
// /tutor — Tutor's home.
// Shows the cohorts this tutor leads up top, then the full
// student roster scoped to just the tutor's students (cohort
// members + 1:1 assignments). Admins see the same scoped view
// for whichever user they're impersonating; when an admin
// views as themselves (their own user), they'll naturally
// see any cohorts/assignments tied to their user row — which
// for most admins is none.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Users as UsersIcon,
  UserSquare,
  Wallet,
  CalendarClock,
  Settings,
} from "lucide-react";
import { fetchTutorScope, fetchStudentDashboardRows } from "@/lib/supabase/queries/tutor";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";
import { getCalConnectionStatus } from "@/lib/supabase/queries/cal-oauth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StudentTable from "@/components/tutor/StudentTable";
import { CalendarPlus, AlertCircle } from "lucide-react";

export const metadata: Metadata = { title: "Tutor Portal — Karman" };
export const dynamic = "force-dynamic";

export default async function TutorPage() {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const scope = await fetchTutorScope(userId);
  const rows = await fetchStudentDashboardRows(scope.studentClerkIds);

  // Cal connection status drives the "Connect Cal" banner. We only show it
  // for tutors that actually have students — a brand-new tutor with no
  // assigned students doesn't need to act yet.
  const tutorUuid = await getUserUuidByClerkId(userId);
  const calStatus = tutorUuid ? await getCalConnectionStatus(tutorUuid) : null;
  const hasStudents = rows.length > 0;
  const needsCalSetup =
    hasStudents && calStatus !== null && (!calStatus.connected || !calStatus.eventTypeId);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6">
        {needsCalSetup ? (
          <CalSetupBanner
            connected={calStatus.connected}
            needsEventTypePick={calStatus.needsEventTypePick}
          />
        ) : null}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-blue-500">
              Tutor Portal
            </p>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">My students</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {scope.cohorts.length} cohort{scope.cohorts.length !== 1 ? "s" : ""}
              {" · "}
              {rows.length} student{rows.length !== 1 ? "s" : ""} across cohorts + 1:1
            </p>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/tutor/schedule"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-blue-400 dark:border-slate-700 dark:text-slate-200"
            >
              <CalendarClock className="h-4 w-4 text-slate-400" /> Schedule
            </Link>
            <Link
              href="/tutor/earnings"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-blue-400 dark:border-slate-700 dark:text-slate-200"
            >
              <Wallet className="h-4 w-4 text-slate-400" /> Earnings
            </Link>
            <Link
              href="/tutor/settings/booking"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-blue-400 dark:border-slate-700 dark:text-slate-200"
            >
              <Settings className="h-4 w-4 text-slate-400" /> Booking
            </Link>
          </nav>
        </header>

        {/* ── My Cohorts ───────────────────────────────────── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <UsersIcon className="h-5 w-5 text-slate-400" />
              My cohorts
            </h2>
          </div>

          {scope.cohorts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center dark:border-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No cohorts yet. An admin assigns cohorts to tutors from{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Admin → Cohorts
                </span>
                .
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {scope.cohorts.map((c) => {
                const satDate = formatDate(c.sat_date);
                return (
                  <li key={c.id}>
                    <Link
                      href={`/tutor/cohort/${c.id}`}
                      className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-400 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/40"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                        <TierPill tier={c.tier} />
                        <StatusPill status={c.status} />
                        <span className="text-slate-400">{satDate} SAT</span>
                      </div>
                      <div className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                        {c.name}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {c.current_topic ?? "No current topic set"}
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span>
                          <span className="font-mono text-slate-700 dark:text-slate-200">
                            {c.member_count}
                          </span>
                          <span className="opacity-60">/{c.max_size}</span>
                          {" members"}
                          {" · "}
                          <span className="font-mono text-slate-700 dark:text-slate-200">
                            {c.homework_count}
                          </span>
                          {" homework"}
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-500">
                          Open <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── Student roster (scoped) ─────────────────────── */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <UserSquare className="h-5 w-5 text-slate-400" />
            Students ({rows.length})
          </h2>
          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center dark:border-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No students assigned yet. You&apos;ll see them here once admin places students in
                one of your cohorts or assigns a 1:1.
              </p>
            </div>
          ) : (
            <StudentTable
              rows={rows}
              cohorts={scope.cohorts.map((c) => ({ id: c.id, name: c.name, tier: c.tier }))}
            />
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

// ─── helpers ────────────────────────────────────────────────

function CalSetupBanner({
  connected,
  needsEventTypePick,
}: {
  connected: boolean;
  needsEventTypePick: boolean;
}) {
  const title = !connected
    ? "Connect Cal.com to start accepting bookings"
    : needsEventTypePick
      ? "Almost done — pick which event-type is the Karman session"
      : "Finish setting up your booking link";
  const body = !connected
    ? "Your students need a way to book sessions with you. Connect your Cal.com account once and we'll point them at the right event-type."
    : "We connected your Cal account but couldn't auto-pick which of your event-types is for Karman. Pick it once and you're done.";
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-400/30 dark:bg-amber-400/10">
      <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="min-w-[15rem] flex-1">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">{title}</p>
        <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">{body}</p>
      </div>
      <Link
        href="/tutor/settings/booking"
        className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
      >
        <CalendarPlus className="h-3.5 w-3.5" />
        {!connected ? "Connect Cal" : "Pick event-type"}
      </Link>
    </div>
  );
}

function TierPill({ tier }: { tier: "group" | "small_group" }) {
  const label = tier === "small_group" ? "Small Group" : "Seminar";
  const cls =
    tier === "small_group"
      ? "bg-teal-50 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300 border border-teal-200 dark:border-teal-400/20"
      : "bg-indigo-50 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-400/20";
  return <span className={`rounded-md px-2 py-0.5 ${cls}`}>{label}</span>;
}

function StatusPill({ status }: { status: "forming" | "active" | "completed" }) {
  const cls =
    status === "active"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-400/20"
      : status === "completed"
        ? "bg-slate-100 text-slate-500 dark:bg-slate-600/20 dark:text-slate-400 border border-slate-300 dark:border-slate-600/30"
        : "bg-slate-50 text-slate-500 dark:bg-slate-400/10 dark:text-slate-300 border border-slate-200 dark:border-slate-400/20";
  return <span className={`rounded-md px-2 py-0.5 ${cls}`}>{status}</span>;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

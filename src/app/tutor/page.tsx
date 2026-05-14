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
import { ArrowRight, Users as UsersIcon, UserSquare, Wallet, CalendarClock } from "lucide-react";
import { fetchTutorScope, fetchStudentDashboardRows } from "@/lib/supabase/queries/tutor";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StudentTable from "@/components/tutor/StudentTable";

export const metadata: Metadata = { title: "Tutor Portal — Karman" };
export const dynamic = "force-dynamic";

export default async function TutorPage() {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const scope = await fetchTutorScope(userId);
  const rows = await fetchStudentDashboardRows(scope.studentClerkIds);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6">
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

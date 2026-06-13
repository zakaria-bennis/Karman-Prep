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
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
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
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId: userId } = await resolveEffectiveClerkId(realUserId);

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
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-info">
              Tutor Portal
            </p>
            <h1 className="text-2xl font-extrabold text-ivory dark:text-ivory">My students</h1>
            <p className="mt-1 text-sm text-taupe dark:text-taupe">
              {scope.cohorts.length} cohort{scope.cohorts.length !== 1 ? "s" : ""}
              {" · "}
              {rows.length} student{rows.length !== 1 ? "s" : ""} across cohorts + 1:1
            </p>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/tutor/schedule"
              className="inline-flex items-center gap-1.5 rounded-lg border border-bronze px-3 py-1.5 text-sm font-semibold text-ivory hover:border-info/40 dark:border-bronze dark:text-ivory"
            >
              <CalendarClock className="h-4 w-4 text-taupe" /> Schedule
            </Link>
            <Link
              href="/tutor/earnings"
              className="inline-flex items-center gap-1.5 rounded-lg border border-bronze px-3 py-1.5 text-sm font-semibold text-ivory hover:border-info/40 dark:border-bronze dark:text-ivory"
            >
              <Wallet className="h-4 w-4 text-taupe" /> Earnings
            </Link>
            <Link
              href="/tutor/settings/booking"
              className="inline-flex items-center gap-1.5 rounded-lg border border-bronze px-3 py-1.5 text-sm font-semibold text-ivory hover:border-info/40 dark:border-bronze dark:text-ivory"
            >
              <Settings className="h-4 w-4 text-taupe" /> Booking
            </Link>
          </nav>
        </header>

        {/* ── My Cohorts ───────────────────────────────────── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-ivory dark:text-ivory">
              <UsersIcon className="h-5 w-5 text-taupe" />
              My cohorts
            </h2>
          </div>

          {scope.cohorts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-bronze px-6 py-10 text-center dark:border-bronze">
              <p className="text-sm text-taupe dark:text-taupe">
                No cohorts yet. An admin assigns cohorts to tutors from{" "}
                <span className="font-semibold text-ivory dark:text-ivory">Admin → Cohorts</span>.
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
                      className="block rounded-xl border border-bronze bg-surface p-4 transition hover:border-info/40 hover:shadow-sm dark:border-bronze dark:bg-surface/40"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                        <TierPill tier={c.tier} />
                        <StatusPill status={c.status} />
                        <span className="text-taupe">{satDate} SAT</span>
                      </div>
                      <div className="mt-2 text-base font-bold text-ivory dark:text-ivory">
                        {c.name}
                      </div>
                      <div className="mt-1 text-xs text-taupe dark:text-taupe">
                        {c.current_topic ?? "No current topic set"}
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-taupe">
                        <span>
                          <span className="font-mono text-ivory dark:text-ivory">
                            {c.member_count}
                          </span>
                          <span className="text-taupe dark:text-taupe">/{c.max_size}</span>
                          {" members"}
                          {" · "}
                          <span className="font-mono text-ivory dark:text-ivory">
                            {c.homework_count}
                          </span>
                          {" homework"}
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-info">
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
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-ivory dark:text-ivory">
            <UserSquare className="h-5 w-5 text-taupe" />
            Students ({rows.length})
          </h2>
          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-bronze px-6 py-10 text-center dark:border-bronze">
              <p className="text-sm text-taupe dark:text-taupe">
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
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-warning/40 bg-warning/10 px-5 py-4 dark:border-warning/30 dark:bg-warning/10">
      <AlertCircle className="h-5 w-5 shrink-0 text-warning dark:text-warning" />
      <div className="min-w-[15rem] flex-1">
        <p className="text-sm font-semibold text-warning dark:text-warning-bright">{title}</p>
        <p className="mt-0.5 text-xs text-warning/80 dark:text-warning-bright/80">{body}</p>
      </div>
      <Link
        href="/tutor/settings/booking"
        className="inline-flex items-center gap-1.5 rounded-md bg-warning px-3 py-1.5 text-xs font-semibold text-night hover:bg-warning-bright"
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
      ? "bg-success/10 text-success dark:bg-success/10 dark:text-success-bright border border-success/40 dark:border-success/20"
      : "bg-gold/10 text-gold dark:bg-gold/10 dark:text-gold-bright border border-gold/40 dark:border-gold/20";
  return <span className={`rounded-md px-2 py-0.5 ${cls}`}>{label}</span>;
}

function StatusPill({ status }: { status: "forming" | "active" | "completed" }) {
  const cls =
    status === "active"
      ? "bg-success/10 text-success dark:bg-success/10 dark:text-success-bright border border-success/40 dark:border-success/20"
      : status === "completed"
        ? "bg-surface text-taupe dark:bg-surface-raised/20 dark:text-taupe border border-bronze dark:border-bronze/30"
        : "bg-surface text-taupe dark:bg-surface-raised/10 dark:text-ivory border border-bronze dark:border-bronze/20";
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

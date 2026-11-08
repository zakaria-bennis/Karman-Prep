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
import StudentTable from "@/components/tutor/StudentTable";
import {
  cohortTopicEmptyMessage,
  cohortTopicPresentation,
} from "@/lib/learning-plan/cohort-presentation";
import { CalendarPlus, AlertCircle } from "lucide-react";
import { tierLabel } from "@/lib/scheduling/tiers";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { fetchUserNameAndEmail } from "@/lib/tutor-affiliate/profile";
import AffiliateHome from "@/components/tutor-affiliate/AffiliateHome";

export const metadata: Metadata = { title: "Tutor Portal — Karman" };
export const dynamic = "force-dynamic";

export default async function TutorPage() {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId: userId, isImpersonating } = await resolveEffectiveClerkId(realUserId);

  if ((await fetchUserRole(userId)) === "affiliate_tutor") {
    const me = await fetchUserNameAndEmail(userId);
    return (
      <AffiliateHome
        clerkId={userId}
        firstName={me.firstName}
        email={me.email}
        readOnly={isImpersonating}
      />
    );
  }

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
    <>
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6">
        {needsCalSetup ? (
          <CalSetupBanner
            connected={calStatus.connected}
            needsEventTypePick={calStatus.needsEventTypePick}
          />
        ) : null}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[color:var(--info)]">
              Tutor Portal
            </p>
            <h1 className="text-2xl font-extrabold text-[color:var(--ink)] dark:text-[color:var(--ink)]">My students</h1>
            <p className="mt-1 text-sm text-[color:var(--mute)] dark:text-[color:var(--mute)]">
              {scope.cohorts.length} cohort{scope.cohorts.length !== 1 ? "s" : ""}
              {" · "}
              {rows.length} student{rows.length !== 1 ? "s" : ""} across cohorts + 1:1
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Link
              href="/tutor/briefing"
              className="inline-flex min-h-11 items-center rounded-lg border border-[color:var(--line)] px-3 py-1.5 text-sm font-semibold text-[color:var(--info)] hover:border-[color-mix(in_srgb,var(--info)_40%,transparent)]"
            >
              Daily briefing
            </Link>
            <Link
              href="/tutor/schedule"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--line)] px-3 py-1.5 text-sm font-semibold text-[color:var(--ink)] hover:border-[color-mix(in_srgb,var(--info)_40%,transparent)] dark:border-[color:var(--line)] dark:text-[color:var(--ink)]"
            >
              <CalendarClock className="h-4 w-4 text-[color:var(--mute)]" /> Schedule
            </Link>
            <Link
              href="/tutor/earnings"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--line)] px-3 py-1.5 text-sm font-semibold text-[color:var(--ink)] hover:border-[color-mix(in_srgb,var(--info)_40%,transparent)] dark:border-[color:var(--line)] dark:text-[color:var(--ink)]"
            >
              <Wallet className="h-4 w-4 text-[color:var(--mute)]" /> Earnings
            </Link>
            <Link
              href="/tutor/settings/booking"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--line)] px-3 py-1.5 text-sm font-semibold text-[color:var(--ink)] hover:border-[color-mix(in_srgb,var(--info)_40%,transparent)] dark:border-[color:var(--line)] dark:text-[color:var(--ink)]"
            >
              <Settings className="h-4 w-4 text-[color:var(--mute)]" /> Booking
            </Link>
          </nav>
        </header>

        {/* ── My Cohorts ───────────────────────────────────── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-[color:var(--ink)] dark:text-[color:var(--ink)]">
              <UsersIcon className="h-5 w-5 text-[color:var(--mute)]" />
              My cohorts
            </h2>
          </div>

          {scope.cohorts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[color:var(--line)] px-6 py-10 text-center dark:border-[color:var(--line)]">
              <p className="text-sm text-[color:var(--mute)] dark:text-[color:var(--mute)]">
                No cohorts yet. An admin assigns cohorts to tutors from{" "}
                <span className="font-semibold text-[color:var(--ink)] dark:text-[color:var(--ink)]">Admin → Cohorts</span>.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {scope.cohorts.map((c) => {
                const satDate = formatDate(c.sat_date);
                const topic = cohortTopicPresentation(c.status, c.current_topic);
                return (
                  <li key={c.id}>
                    <Link
                      href={`/tutor/cohort/${c.id}`}
                      className="block rounded-xl border border-[color:var(--line)] bg-[color:var(--card)] p-4 transition hover:border-[color-mix(in_srgb,var(--info)_40%,transparent)] hover:shadow-sm dark:border-[color:var(--line)] dark:bg-[color-mix(in_srgb,var(--card)_40%,transparent)]"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                        <TierPill tier={c.tier} />
                        <StatusPill status={c.status} />
                        <span className="text-[color:var(--mute)]">{satDate} SAT</span>
                      </div>
                      <div className="mt-2 text-base font-bold text-[color:var(--ink)] dark:text-[color:var(--ink)]">
                        {c.name}
                      </div>
                      <div className="mt-1 text-xs text-[color:var(--mute)] dark:text-[color:var(--mute)]">
                        {topic
                          ? `${topic.label}: ${topic.topic}`
                          : cohortTopicEmptyMessage(c.status)}
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-[color:var(--mute)]">
                        <span>
                          <span className="font-mono text-[color:var(--ink)] dark:text-[color:var(--ink)]">
                            {c.member_count}
                          </span>
                          <span className="text-[color:var(--mute)] dark:text-[color:var(--mute)]">/{c.max_size}</span>
                          {" members"}
                          {" · "}
                          <span className="font-mono text-[color:var(--ink)] dark:text-[color:var(--ink)]">
                            {c.homework_count}
                          </span>
                          {" homework"}
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-[color:var(--info)]">
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
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-[color:var(--ink)] dark:text-[color:var(--ink)]">
            <UserSquare className="h-5 w-5 text-[color:var(--mute)]" />
            Students ({rows.length})
          </h2>
          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[color:var(--line)] px-6 py-10 text-center dark:border-[color:var(--line)]">
              <p className="text-sm text-[color:var(--mute)] dark:text-[color:var(--mute)]">
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
    </>
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
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[color-mix(in_srgb,var(--warn)_40%,transparent)] bg-[color-mix(in_srgb,var(--warn)_10%,transparent)] px-5 py-4 dark:border-[color-mix(in_srgb,var(--warn)_30%,transparent)] dark:bg-[color-mix(in_srgb,var(--warn)_10%,transparent)]">
      <AlertCircle className="h-5 w-5 shrink-0 text-[color:var(--warn)] dark:text-[color:var(--warn)]" />
      <div className="min-w-[15rem] flex-1">
        <p className="text-sm font-semibold text-[color:var(--warn)] dark:text-[color:var(--warn)]">{title}</p>
        <p className="mt-0.5 text-xs text-[color-mix(in_srgb,var(--warn)_80%,transparent)] dark:text-[color-mix(in_srgb,var(--warn)_80%,transparent)]">{body}</p>
      </div>
      <Link
        href="/tutor/settings/booking"
        className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--warn)] px-3 py-1.5 text-xs font-semibold text-[color:var(--accent-ink)] hover:bg-[color:var(--warn)]"
      >
        <CalendarPlus className="h-3.5 w-3.5" />
        {!connected ? "Connect Cal" : "Pick event-type"}
      </Link>
    </div>
  );
}

function TierPill({ tier }: { tier: "group" | "small_group" }) {
  const label = tierLabel(tier);
  const cls =
    tier === "small_group"
      ? "bg-[color-mix(in_srgb,var(--good)_10%,transparent)] text-[color:var(--good)] dark:bg-[color-mix(in_srgb,var(--good)_10%,transparent)] dark:text-[color:var(--good)] border border-[color-mix(in_srgb,var(--good)_40%,transparent)] dark:border-[color-mix(in_srgb,var(--good)_20%,transparent)]"
      : "bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[color:var(--accent-text)] dark:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] dark:text-[color:var(--accent-text)] border border-[color-mix(in_srgb,var(--accent)_40%,transparent)] dark:border-[color-mix(in_srgb,var(--accent)_20%,transparent)]";
  return <span className={`rounded-md px-2 py-0.5 ${cls}`}>{label}</span>;
}

function StatusPill({ status }: { status: "forming" | "active" | "completed" }) {
  const cls =
    status === "active"
      ? "bg-[color-mix(in_srgb,var(--good)_10%,transparent)] text-[color:var(--good)] dark:bg-[color-mix(in_srgb,var(--good)_10%,transparent)] dark:text-[color:var(--good)] border border-[color-mix(in_srgb,var(--good)_40%,transparent)] dark:border-[color-mix(in_srgb,var(--good)_20%,transparent)]"
      : status === "completed"
        ? "bg-[color:var(--card)] text-[color:var(--mute)] dark:bg-[color-mix(in_srgb,var(--raised)_20%,transparent)] dark:text-[color:var(--mute)] border border-[color:var(--line)] dark:border-[color-mix(in_srgb,var(--line)_30%,transparent)]"
        : "bg-[color:var(--card)] text-[color:var(--mute)] dark:bg-[color-mix(in_srgb,var(--raised)_10%,transparent)] dark:text-[color:var(--ink)] border border-[color:var(--line)] dark:border-[color-mix(in_srgb,var(--line)_20%,transparent)]";
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

// ============================================================
// /tutor/schedule — tutor's My Schedule view.
//
// Lists every upcoming session this tutor is leading, grouped
// by date. Each row shows: time, student or cohort name, tier,
// status, and a one-click join link.
//
// Past sessions render below in a faded section so the tutor can
// reference recent attendance.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { redirect } from "next/navigation";
import { CalendarClock, Video } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { createAdminClient } from "@/lib/supabase/server";
import { TutorBookingActions } from "./TutorBookingActions";
import {
  getBookingsForTutor,
  getUserUuidByClerkId,
  type BookingRow,
} from "@/lib/supabase/queries/bookings";

export const metadata: Metadata = { title: "My Schedule" };
export const dynamic = "force-dynamic";

interface StudentMini {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

function studentDisplay(s: StudentMini | undefined): string {
  if (!s) return "Unknown student";
  const name = [s.first_name, s.last_name].filter(Boolean).join(" ").trim();
  return name || s.email;
}

function tierLabel(t: BookingRow["plan_tier"]): { label: string; cls: string } {
  switch (t) {
    case "private":
      return {
        label: "Private",
        cls: "bg-warning/10 text-warning dark:bg-warning/10 dark:text-warning-bright border-warning/40 dark:border-warning/20",
      };
    case "elite":
      return {
        label: "Elite",
        cls: "bg-gold/10 text-gold dark:bg-gold/10 dark:text-gold-bright border-gold/40 dark:border-gold/20",
      };
    case "small_group":
      return {
        label: "Small Group",
        cls: "bg-success/10 text-success dark:bg-success/10 dark:text-success-bright border-success/40 dark:border-success/20",
      };
    case "group":
    default:
      return {
        label: "Seminar",
        cls: "bg-gold/10 text-gold dark:bg-gold/10 dark:text-gold-bright border-gold/40 dark:border-gold/20",
      };
  }
}

function statusLabel(s: BookingRow["status"]): { label: string; cls: string } {
  switch (s) {
    case "scheduled":
      return {
        label: "Scheduled",
        cls: "bg-info/10 text-info dark:bg-info/10 dark:text-info-bright",
      };
    case "completed":
      return {
        label: "Completed",
        cls: "bg-success/10 text-success dark:bg-success/10 dark:text-success-bright",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        cls: "bg-surface text-taupe dark:bg-surface-raised/20 dark:text-taupe",
      };
    case "no_show":
      return {
        label: "No-show",
        cls: "bg-error/10 text-error dark:bg-error/10 dark:text-error-bright",
      };
  }
}

function dateKey(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: tz,
  }).format(new Date(iso));
}

function formatDay(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: tz,
  }).format(new Date(iso));
}

function formatTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  }).format(new Date(iso));
}

type TabKey = "upcoming" | "seminars" | "small-groups";
const ALL_TABS: { key: TabKey; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "seminars", label: "Seminars" },
  { key: "small-groups", label: "Small Groups" },
];

function parseTab(input: string | string[] | undefined): TabKey {
  const v = Array.isArray(input) ? input[0] : input;
  if (v === "seminars" || v === "small-groups" || v === "upcoming") return v;
  return "upcoming";
}

export default async function TutorSchedulePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId: userId } = await resolveEffectiveClerkId(realUserId);

  const tutorUuid = await getUserUuidByClerkId(userId);
  if (!tutorUuid) redirect("/onboarding");

  // Read the tutor's preferred timezone — they set it during onboarding.
  // Falls back to America/New_York for any legacy rows without one set
  // (audit #14). Date/time formatting below uses this so a Pacific
  // tutor doesn't see all their sessions in Eastern time.
  const { data: tutorRow } = await createAdminClient()
    .from("users")
    .select("time_zone")
    .eq("id", tutorUuid)
    .maybeSingle();
  const TZ = (tutorRow as { time_zone?: string | null } | null)?.time_zone ?? "America/New_York";

  const sp = await searchParams;
  const tab = parseTab(sp.tab);

  const all = await getBookingsForTutor(tutorUuid, { upcomingOnly: false });
  const now = Date.now();

  // Per-tab filter — tab semantics:
  //   upcoming     : every booking that's still on the calendar (status=scheduled, future-dated), all tiers
  //   seminars     : every group-tier booking, sorted chronologically newest-first
  //   small-groups : every small_group-tier booking, sorted newest-first
  let visible: BookingRow[];
  const counts = { upcoming: 0, seminars: 0, smallGroups: 0 };
  for (const b of all) {
    const isFutureScheduled =
      b.status === "scheduled" && new Date(b.scheduled_start).getTime() >= now;
    if (isFutureScheduled) counts.upcoming += 1;
    if (b.plan_tier === "group") counts.seminars += 1;
    if (b.plan_tier === "small_group") counts.smallGroups += 1;
  }

  if (tab === "upcoming") {
    visible = all
      .filter((b) => b.status === "scheduled" && new Date(b.scheduled_start).getTime() >= now)
      .sort((a, b) => +new Date(a.scheduled_start) - +new Date(b.scheduled_start));
  } else if (tab === "seminars") {
    visible = all
      .filter((b) => b.plan_tier === "group")
      .sort((a, b) => +new Date(b.scheduled_start) - +new Date(a.scheduled_start));
  } else {
    visible = all
      .filter((b) => b.plan_tier === "small_group")
      .sort((a, b) => +new Date(b.scheduled_start) - +new Date(a.scheduled_start));
  }

  const studentIds = Array.from(new Set(visible.map((b) => b.student_id)));
  const studentsById = new Map<string, StudentMini>();
  if (studentIds.length > 0) {
    const supa = createAdminClient();
    const { data: students } = await supa
      .from("users")
      .select("id, first_name, last_name, email")
      .in("id", studentIds);
    for (const s of (students ?? []) as StudentMini[]) studentsById.set(s.id, s);
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <header>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-info">Tutor Portal</p>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-ivory dark:text-ivory">
            <CalendarClock className="h-6 w-6 text-taupe" />
            My schedule
          </h1>
        </header>

        {/* Tab nav */}
        <nav className="-mb-2 border-b border-bronze dark:border-bronze">
          <ul className="-mb-px flex gap-1">
            {ALL_TABS.map((t) => {
              const count =
                t.key === "upcoming"
                  ? counts.upcoming
                  : t.key === "seminars"
                    ? counts.seminars
                    : counts.smallGroups;
              const active = t.key === tab;
              return (
                <li key={t.key}>
                  <Link
                    href={`/tutor/schedule${t.key === "upcoming" ? "" : `?tab=${t.key}`}`}
                    className={[
                      "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold transition-colors",
                      active
                        ? "border-info/40 text-info dark:text-info"
                        : "border-transparent text-taupe hover:border-bronze hover:text-ivory dark:text-taupe dark:hover:border-bronze dark:hover:text-ivory",
                    ].join(" ")}
                  >
                    {t.label}
                    <span
                      className={[
                        "inline-flex h-5 min-w-[20px] items-center justify-center rounded px-1.5 text-[11px] font-bold",
                        active
                          ? "bg-info/10 text-info dark:bg-info/15 dark:text-info-bright"
                          : "bg-surface text-taupe dark:bg-surface-raised dark:text-taupe",
                      ].join(" ")}
                    >
                      {count}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-bronze px-6 py-10 text-center dark:border-bronze">
            <p className="text-sm text-taupe dark:text-taupe">
              {tab === "upcoming"
                ? "Nothing scheduled. New bookings will show up here as students book in."
                : tab === "seminars"
                  ? "No seminar sessions yet. They'll appear here once admin pushes a session to one of your seminar cohorts."
                  : "No small-group sessions yet. They'll appear here once admin pushes a session to one of your small-group cohorts."}
            </p>
          </div>
        ) : (
          <ScheduleGrouped
            bookings={visible}
            studentsById={studentsById}
            tz={TZ}
            showJoin={tab === "upcoming"}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

function ScheduleGrouped({
  bookings,
  studentsById,
  tz,
  showJoin,
}: {
  bookings: BookingRow[];
  studentsById: Map<string, StudentMini>;
  tz: string;
  showJoin?: boolean;
}) {
  // Group by ISO date key — preserves the input ordering of the bookings
  // (caller decides asc vs desc). Just bucket-by-day without resorting.
  const groups = new Map<string, BookingRow[]>();
  for (const b of bookings) {
    const k = dateKey(b.scheduled_start, tz);
    const list = groups.get(k) ?? [];
    list.push(b);
    groups.set(k, list);
  }
  const orderedKeys = Array.from(groups.keys());

  return (
    <div className="space-y-5">
      {orderedKeys.map((k) => {
        const dayBookings = groups.get(k) ?? [];
        const heading = formatDay(dayBookings[0]!.scheduled_start, tz);
        return (
          <div key={k}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-taupe">
              {heading}
            </p>
            <ul className="divide-y divide-bronze overflow-hidden rounded-xl border border-bronze dark:divide-bronze dark:border-bronze">
              {dayBookings.map((b) => {
                const student = studentsById.get(b.student_id);
                const tier = tierLabel(b.plan_tier);
                const status = statusLabel(b.status);
                // Tutor self-serve cancel/reschedule on private/elite
                // sessions that haven't happened yet (#8). Group +
                // small_group bookings keep going through the admin
                // since those move the whole cohort.
                const canManage =
                  b.status === "scheduled" &&
                  (b.plan_tier === "private" || b.plan_tier === "elite") &&
                  new Date(b.scheduled_start).getTime() > Date.now();
                return (
                  <li
                    key={b.id}
                    className="bg-surface px-4 py-3 transition-colors hover:bg-surface dark:bg-surface/40 dark:hover:bg-surface/70"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-20 shrink-0 font-mono text-sm text-ivory dark:text-ivory">
                        {formatTime(b.scheduled_start, tz)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-ivory dark:text-ivory">
                          {studentDisplay(student)}
                        </span>
                        <span
                          className={`mt-0.5 inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold ${tier.cls}`}
                        >
                          {tier.label}
                        </span>
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${status.cls}`}
                      >
                        {status.label}
                      </span>
                      {showJoin && b.status === "scheduled" && b.zoom_join_url ? (
                        <a
                          href={b.zoom_join_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-info px-3 py-1.5 text-xs font-semibold text-ivory hover:bg-info-bright"
                        >
                          <Video className="h-3.5 w-3.5" />
                          Join
                        </a>
                      ) : null}
                    </div>
                    {canManage ? (
                      <TutorBookingActions
                        bookingId={b.id}
                        scheduledStart={b.scheduled_start}
                        tier={b.plan_tier as "private" | "elite"}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

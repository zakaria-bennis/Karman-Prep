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
import { createAdminClient } from "@/lib/supabase/server";
import { TutorBookingActions } from "./TutorBookingActions";
import { tierLabel as schedulingTierLabel } from "@/lib/scheduling/tiers";
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
        label: schedulingTierLabel("private"),
        cls: "bg-[color-mix(in_srgb,var(--warn)_10%,transparent)] text-[color:var(--warn)] dark:bg-[color-mix(in_srgb,var(--warn)_10%,transparent)] dark:text-[color:var(--warn)] border-[color-mix(in_srgb,var(--warn)_40%,transparent)] dark:border-[color-mix(in_srgb,var(--warn)_20%,transparent)]",
      };
    case "elite":
      return {
        label: schedulingTierLabel("elite"),
        cls: "bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[color:var(--accent-text)] dark:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] dark:text-[color:var(--accent-text)] border-[color-mix(in_srgb,var(--accent)_40%,transparent)] dark:border-[color-mix(in_srgb,var(--accent)_20%,transparent)]",
      };
    case "small_group":
      return {
        label: schedulingTierLabel("small_group"),
        cls: "bg-[color-mix(in_srgb,var(--good)_10%,transparent)] text-[color:var(--good)] dark:bg-[color-mix(in_srgb,var(--good)_10%,transparent)] dark:text-[color:var(--good)] border-[color-mix(in_srgb,var(--good)_40%,transparent)] dark:border-[color-mix(in_srgb,var(--good)_20%,transparent)]",
      };
    case "group":
    default:
      return {
        label: schedulingTierLabel("group"),
        cls: "bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[color:var(--accent-text)] dark:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] dark:text-[color:var(--accent-text)] border-[color-mix(in_srgb,var(--accent)_40%,transparent)] dark:border-[color-mix(in_srgb,var(--accent)_20%,transparent)]",
      };
  }
}

function statusLabel(s: BookingRow["status"]): { label: string; cls: string } {
  switch (s) {
    case "scheduled":
      return {
        label: "Scheduled",
        cls: "bg-[color-mix(in_srgb,var(--info)_10%,transparent)] text-[color:var(--info)] dark:bg-[color-mix(in_srgb,var(--info)_10%,transparent)] dark:text-[color:var(--info)]",
      };
    case "completed":
      return {
        label: "Completed",
        cls: "bg-[color-mix(in_srgb,var(--good)_10%,transparent)] text-[color:var(--good)] dark:bg-[color-mix(in_srgb,var(--good)_10%,transparent)] dark:text-[color:var(--good)]",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        cls: "bg-[color:var(--card)] text-[color:var(--mute)] dark:bg-[color-mix(in_srgb,var(--raised)_20%,transparent)] dark:text-[color:var(--mute)]",
      };
    case "no_show":
      return {
        label: "No-show",
        cls: "bg-[color-mix(in_srgb,var(--late)_10%,transparent)] text-[color:var(--late)] dark:bg-[color-mix(in_srgb,var(--late)_10%,transparent)] dark:text-[color:var(--late)]",
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
  { key: "seminars", label: "Live sessions" },
  { key: "small-groups", label: "Cohorts" },
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
    <>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <header>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[color:var(--info)]">Tutor Portal</p>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-[color:var(--ink)] dark:text-[color:var(--ink)]">
            <CalendarClock className="h-6 w-6 text-[color:var(--mute)]" />
            My schedule
          </h1>
        </header>

        {/* Tab nav */}
        <nav className="-mb-2 border-b border-[color:var(--line)] dark:border-[color:var(--line)]">
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
                        ? "border-[color-mix(in_srgb,var(--info)_40%,transparent)] text-[color:var(--info)] dark:text-[color:var(--info)]"
                        : "border-transparent text-[color:var(--mute)] hover:border-[color:var(--line)] hover:text-[color:var(--ink)] dark:text-[color:var(--mute)] dark:hover:border-[color:var(--line)] dark:hover:text-[color:var(--ink)]",
                    ].join(" ")}
                  >
                    {t.label}
                    <span
                      className={[
                        "inline-flex h-5 min-w-[20px] items-center justify-center rounded px-1.5 text-[11px] font-bold",
                        active
                          ? "bg-[color-mix(in_srgb,var(--info)_10%,transparent)] text-[color:var(--info)] dark:bg-[color-mix(in_srgb,var(--info)_15%,transparent)] dark:text-[color:var(--info)]"
                          : "bg-[color:var(--card)] text-[color:var(--mute)] dark:bg-[color:var(--raised)] dark:text-[color:var(--mute)]",
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
          <div className="rounded-xl border border-dashed border-[color:var(--line)] px-6 py-10 text-center dark:border-[color:var(--line)]">
            <p className="text-sm text-[color:var(--mute)] dark:text-[color:var(--mute)]">
              {tab === "upcoming"
                ? "Nothing scheduled. New bookings will show up here as students book in."
                : tab === "seminars"
                  ? "No weekly live sessions yet. They'll appear here once an admin schedules one for your group."
                  : "No cohort classes yet. They'll appear here once an admin schedules a class for one of your cohorts."}
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
    </>
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
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--mute)]">
              {heading}
            </p>
            <ul className="divide-y divide-[color:var(--line)] overflow-hidden rounded-xl border border-[color:var(--line)] dark:divide-[color:var(--line)] dark:border-[color:var(--line)]">
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
                    className="bg-[color:var(--card)] px-4 py-3 transition-colors hover:bg-[color:var(--card)] dark:bg-[color-mix(in_srgb,var(--card)_40%,transparent)] dark:hover:bg-[color-mix(in_srgb,var(--card)_70%,transparent)]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-20 shrink-0 font-mono text-sm text-[color:var(--ink)] dark:text-[color:var(--ink)]">
                        {formatTime(b.scheduled_start, tz)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-[color:var(--ink)] dark:text-[color:var(--ink)]">
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
                          className="inline-flex items-center gap-1 rounded-lg bg-[color:var(--info)] px-3 py-1.5 text-xs font-semibold text-[color:var(--ink)] hover:bg-[color:var(--info)]"
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

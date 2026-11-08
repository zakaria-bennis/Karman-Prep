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
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { redirect } from "next/navigation";
import { Card, Num, SectionHeader } from "@/components/portal";
import { WbEmpty, WbPill, WbTabs, type Tone } from "@/components/admin/workbench";
import { createAdminClient } from "@/lib/supabase/server";
import { TutorBookingActions } from "./TutorBookingActions";
import { tierLabel as schedulingTierLabel } from "@/lib/scheduling/tiers";
import {
  getBookingsForTutor,
  getUserUuidByClerkId,
  type BookingRow,
} from "@/lib/supabase/queries/bookings";

export const metadata: Metadata = { title: "Schedule" };
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

function tierLabel(t: BookingRow["plan_tier"]): { label: string; tone: Tone } {
  switch (t) {
    case "private":
      return { label: schedulingTierLabel("private"), tone: "warn" };
    case "elite":
      return { label: schedulingTierLabel("elite"), tone: "info" };
    case "small_group":
      return { label: schedulingTierLabel("small_group"), tone: "ok" };
    case "group":
    default:
      return { label: schedulingTierLabel("group"), tone: "info" };
  }
}

function statusLabel(s: BookingRow["status"]): { label: string; tone: Tone } {
  switch (s) {
    case "scheduled":
      return { label: "Scheduled", tone: "info" };
    case "completed":
      return { label: "Completed", tone: "ok" };
    case "cancelled":
      return { label: "Cancelled", tone: "neutral" };
    case "no_show":
      return { label: "No-show", tone: "fail" };
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
    <div className="wb" style={{ paddingBlock: 0 }}>
      <WbTabs
        label="Schedule"
        param="tab"
        value={tab}
        basePath="/tutor/schedule"
        options={ALL_TABS.map((t) => ({
          value: t.key,
          label: t.label,
          count:
            t.key === "upcoming"
              ? counts.upcoming
              : t.key === "seminars"
                ? counts.seminars
                : counts.smallGroups,
        }))}
      />

      {visible.length === 0 ? (
        <WbEmpty
          title={
            tab === "upcoming"
              ? "Nothing scheduled."
              : tab === "seminars"
                ? "No weekly live sessions yet."
                : "No cohort classes yet."
          }
        >
          {tab === "upcoming"
            ? "New bookings show up here as students book in."
            : tab === "seminars"
              ? "They appear here once an admin schedules one for your group."
              : "They appear here once an admin schedules a class for one of your cohorts."}
        </WbEmpty>
      ) : (
        <ScheduleGrouped
          bookings={visible}
          studentsById={studentsById}
          tz={TZ}
          showJoin={tab === "upcoming"}
        />
      )}
    </div>
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

  let joinShown = false;
  return (
    <>
      {orderedKeys.map((k) => {
        const dayBookings = groups.get(k) ?? [];
        const heading = formatDay(dayBookings[0]!.scheduled_start, tz);
        return (
          <Card key={k}>
            <SectionHeader title={heading} note={`${dayBookings.length}`} />
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
              const join = showJoin && b.status === "scheduled" && b.zoom_join_url;
              // One highlighted button per screen: the next session's Join.
              const primary = join && !joinShown;
              if (primary) joinShown = true;
              return (
                <div key={b.id} className="kp-staff-booking">
                  <div className="kp-staff-booking-row">
                    <Num>{formatTime(b.scheduled_start, tz)}</Num>
                    <span className="kp-staff-booking-who">
                      <b>{studentDisplay(student)}</b>
                      <span>
                        <WbPill tone={tier.tone}>{tier.label}</WbPill>{" "}
                        <WbPill tone={status.tone}>{status.label}</WbPill>
                      </span>
                    </span>
                    {join ? (
                      <a
                        href={b.zoom_join_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="wb-btn"
                        data-variant={primary ? "primary" : undefined}
                      >
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
                </div>
              );
            })}
          </Card>
        );
      })}
    </>
  );
}

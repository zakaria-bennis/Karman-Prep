// ============================================================
// Maps saved scheduling rows to calendar-feed events.
//
// Pure: the server module loads rows, this module decides titles,
// times and UIDs. UIDs are `<kind>-<row id>-<student id>@karmanprep.com`
// so they never change between fetches (calendars update in place)
// and two siblings in one class get separate events in a parent feed.
// ============================================================

import { dateKeyAt } from "@/lib/learn/week-calendar";
import type { FeedEvent } from "./ics";

export interface FeedBookingRow {
  id: string;
  plan_tier: string;
  scheduled_start: string;
  scheduled_end: string;
  zoom_join_url: string | null;
  tutor_name: string | null;
}

export interface FeedDueRow {
  id: string;
  title: string;
  body: string | null;
  due_at: string;
  /** Cohort name for homework; null for individually assigned practice. */
  context: string | null;
  href: string | null;
}

export interface StudentFeedRows {
  studentId: string;
  /** Shown before each title in a parent's feed; null in the student's own feed. */
  studentLabel: string | null;
  timeZone: string;
  /** One-on-one sessions and live classes (classes are per-student bookings too). */
  bookings: FeedBookingRow[];
  homework: FeedDueRow[];
  practice: FeedDueRow[];
}

const UID_DOMAIN = "karmanprep.com";

function uid(kind: string, rowId: string, studentId: string): string {
  return `${kind}-${rowId}-${studentId}@${UID_DOMAIN}`;
}

function absolute(siteUrl: string, href: string | null): string | null {
  return href ? new URL(href, siteUrl).toString() : null;
}

function joinLines(...lines: (string | null | undefined)[]): string | null {
  const kept = lines.filter((line): line is string => !!line && line.trim().length > 0);
  return kept.length ? kept.join("\n\n") : null;
}

function validRange(start: string, end: string): { start: Date; end: Date } | null {
  const s = new Date(start);
  const e = new Date(end);
  if (!Number.isFinite(s.getTime()) || !Number.isFinite(e.getTime()) || e <= s) return null;
  return { start: s, end: e };
}

function dueTimeLabel(dueAt: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(dueAt));
}

function bookingTitle(tier: string): string {
  switch (tier) {
    case "group":
      return "Karman live class";
    case "small_group":
      return "Karman small-group class";
    default:
      return "Karman 1:1 session";
  }
}

export function studentFeedEvents(rows: StudentFeedRows, siteUrl: string): FeedEvent[] {
  const prefix = rows.studentLabel ? `${rows.studentLabel}: ` : "";
  const scheduleUrl = absolute(siteUrl, "/dashboard/student/schedule");
  const events: FeedEvent[] = [];

  for (const booking of rows.bookings) {
    const range = validRange(booking.scheduled_start, booking.scheduled_end);
    if (!range) continue;
    const withTutor = booking.tutor_name ? ` with ${booking.tutor_name}` : "";
    events.push({
      kind: "timed",
      uid: uid("session", booking.id, rows.studentId),
      summary: `${prefix}${bookingTitle(booking.plan_tier)}${withTutor}`,
      description: joinLines(
        booking.zoom_join_url ? `Join on Zoom: ${booking.zoom_join_url}` : null,
        `Details in Karman: ${scheduleUrl}`
      ),
      location: booking.zoom_join_url,
      url: scheduleUrl,
      ...range,
    });
  }

  const dueEvents = [
    ...rows.homework.map((row) => ({ row, kind: "homework", label: "Homework due" })),
    ...rows.practice.map((row) => ({ row, kind: "practice", label: "Practice due" })),
  ];
  for (const { row, kind, label } of dueEvents) {
    if (!Number.isFinite(Date.parse(row.due_at))) continue;
    events.push({
      kind: "allDay",
      uid: uid(kind, row.id, rows.studentId),
      summary: `${prefix}${label}: ${row.title}`,
      description: joinLines(
        `Due at ${dueTimeLabel(row.due_at, rows.timeZone)}${row.context ? ` · ${row.context}` : ""}`,
        row.body
      ),
      url: absolute(siteUrl, row.href),
      date: dateKeyAt(row.due_at, rows.timeZone),
    });
  }

  return events;
}

/** Stable order so the same data always produces the same bytes. */
export function sortFeedEvents(events: FeedEvent[]): FeedEvent[] {
  const key = (event: FeedEvent) =>
    event.kind === "timed" ? event.start.toISOString() : `${event.date}T00:00:00.000Z`;
  return [...events].sort((a, b) => key(a).localeCompare(key(b)) || a.uid.localeCompare(b.uid));
}

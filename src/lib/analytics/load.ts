// ============================================================
// Everything /admin/analytics shows, from the real tables or (sample mode) from made-up events.
// The two never mix: `mode` says which one every number came from. Server only; the page calls
// requireAdmin() before this.
//
// Real mode reads analytics_events (paged, newest window only), the analytics_daily_people
// view, and, for questions answered, the existing answer tables (quiz_run_responses and
// catalog_practice_responses): those stay the source for learning data.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import {
  dailyActive,
  dayOf,
  dayRange,
  exitPages,
  rollupDailyPeople,
  studentEngagement,
  timeByFeature,
  topPages,
  type DailyActive,
  type DailyPersonRow,
  type ExitPage,
  type FeatureTime,
  type PageStat,
  type StudentEngagement,
} from "./aggregate";
import { computeFunnel, type AnalyticsEvent, type FunnelRow } from "./funnel";
import { SAMPLE_STUDENTS, sampleAnswered, sampleEvents } from "./sample";
import { ANALYTICS_TABLE, pruneOldEvents } from "./server";

export const RANGES = [7, 30, 90] as const;
export type RangeDays = (typeof RANGES)[number];
const PAGE = 1000;
const MAX_EVENTS = 50_000;

export interface AnalyticsDashboard {
  mode: "real" | "sample";
  days: RangeDays;
  truncated: boolean;
  eventCount: number;
  funnel: FunnelRow[];
  daily: DailyActive[];
  features: FeatureTime[];
  pages: PageStat[];
  exits: ExitPage[];
  students: Array<StudentEngagement & { name: string }>;
  totals: { visitors: number; students: number; minutes: number; sessions: number };
}

function db(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

interface EventRow {
  occurred_at: string;
  user_id: string | null;
  anonymous_id: string | null;
  session_id: string | null;
  surface: AnalyticsEvent["surface"];
  path: string | null;
  name: string;
  props: Record<string, unknown> | null;
}

async function pagedEvents(
  since: string
): Promise<{ events: AnalyticsEvent[]; truncated: boolean }> {
  const events: AnalyticsEvent[] = [];
  for (let from = 0; from < MAX_EVENTS; from += PAGE) {
    const { data, error } = await db()
      .from(ANALYTICS_TABLE)
      .select("occurred_at, user_id, anonymous_id, session_id, surface, path, name, props")
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`analytics read failed: ${error.message}`);
    const rows = (data ?? []) as EventRow[];
    for (const r of rows)
      events.push({
        at: r.occurred_at,
        userId: r.user_id,
        anonId: r.anonymous_id,
        sessionId: r.session_id,
        surface: r.surface,
        path: r.path,
        name: r.name,
        props: r.props ?? {},
      });
    if (rows.length < PAGE) return { events, truncated: false };
  }
  return { events, truncated: true };
}

async function dailyRows(firstDay: string): Promise<DailyPersonRow[]> {
  const out: DailyPersonRow[] = [];
  for (let from = 0; from < MAX_EVENTS; from += PAGE) {
    const { data, error } = await db()
      .from("analytics_daily_people")
      .select("day, surface, user_id, anonymous_id, events, page_views, active_seconds, sessions")
      .gte("day", firstDay)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`analytics rollup read failed: ${error.message}`);
    const rows = (data ?? []) as DailyPersonRow[];
    out.push(...rows.map((r) => ({ ...r, active_seconds: Number(r.active_seconds) })));
    if (rows.length < PAGE) break;
  }
  return out;
}

async function people(clerkIds: string[]) {
  const found = new Map<string, { name: string; role: string }>();
  for (let i = 0; i < clerkIds.length; i += 100) {
    const { data } = await db()
      .from("users")
      .select("clerk_id, first_name, last_name, role")
      .in("clerk_id", clerkIds.slice(i, i + 100));
    for (const u of (data ?? []) as Array<Record<string, string | null>>) {
      const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || "Unnamed student";
      found.set(u.clerk_id!, { name, role: u.role ?? "" });
    }
  }
  return found;
}

/** Questions answered per student in the window, from the existing answer tables. */
async function answeredSince(since: string, studentIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!studentIds.length) return counts;
  const add = (id: string | undefined) => id && counts.set(id, (counts.get(id) ?? 0) + 1);
  const sources: Array<[string, string, string]> = [
    ["quiz_run_responses", "quiz_runs!inner(student_id)", "quiz_runs.student_id"],
    [
      "catalog_practice_responses",
      "catalog_practice_sessions!inner(student_id)",
      "catalog_practice_sessions.student_id",
    ],
  ];
  for (const [table, join, column] of sources) {
    for (let from = 0; from < MAX_EVENTS; from += PAGE) {
      const { data, error } = await db()
        .from(table)
        .select(`id, ${join}`)
        .gte("answered_at", since)
        .in(column, studentIds.slice(0, 500))
        .range(from, from + PAGE - 1);
      if (error) {
        console.warn(`[analytics] ${table} read failed:`, error.message);
        break;
      }
      const rows = (data ?? []) as unknown as Array<
        Record<string, { student_id?: string } | undefined>
      >;
      const key = join.split("!")[0];
      for (const r of rows) add(r[key]?.student_id);
      if (rows.length < PAGE) break;
    }
  }
  return counts;
}

function assemble(
  mode: "real" | "sample",
  days: RangeDays,
  allEvents: AnalyticsEvent[],
  allDaily: DailyPersonRow[],
  truncated: boolean,
  isStudent: (id: string) => boolean,
  names: Map<string, string>,
  answered: Map<string, number>,
  now: Date
): AnalyticsDashboard {
  const range = dayRange(days, now);
  // Whole calendar days only, so every chart covers the same window.
  const inRange = new Set(range);
  const events = allEvents.filter((e) => inRange.has(dayOf(e.at)));
  const daily = allDaily.filter((r) => inRange.has(r.day));
  const studentIds = [
    ...new Set(
      daily
        .filter((r) => r.surface === "portal" && r.user_id && isStudent(r.user_id))
        .map((r) => r.user_id!)
    ),
  ];
  const students = studentEngagement(events, daily, studentIds, answered).map((s) => ({
    ...s,
    name: names.get(s.userId) ?? "Unnamed student",
  }));
  const site = new Set(
    daily.filter((r) => r.surface === "site").map((r) => r.user_id ?? r.anonymous_id)
  );
  return {
    mode,
    days,
    truncated,
    eventCount: events.length,
    funnel: computeFunnel(events),
    daily: dailyActive(daily, range, isStudent),
    features: timeByFeature(events),
    pages: topPages(events),
    exits: exitPages(events),
    students,
    totals: {
      visitors: site.size,
      students: studentIds.length,
      minutes: Math.round(students.reduce((a, s) => a + s.minutes, 0)),
      sessions: students.reduce((a, s) => a + s.sessions, 0),
    },
  };
}

export async function loadAnalytics(
  days: RangeDays,
  sample: boolean,
  now = new Date()
): Promise<AnalyticsDashboard> {
  const range = dayRange(days, now);
  if (sample) {
    const events = sampleEvents(days, now);
    const daily = rollupDailyPeople(events);
    const names = new Map(SAMPLE_STUDENTS.map((s) => [s.id, s.name]));
    return assemble(
      "sample",
      days,
      events,
      daily,
      false,
      (id) => id.startsWith("sample_student_"),
      names,
      sampleAnswered(events),
      now
    );
  }

  void pruneOldEvents();
  const since = new Date(now.getTime() - (days + 1) * 86_400_000).toISOString();
  const [{ events, truncated }, daily] = await Promise.all([
    pagedEvents(since),
    dailyRows(range[0]),
  ]);
  const ids = [...new Set(daily.map((r) => r.user_id).filter((x): x is string => !!x))];
  const who = await people(ids);
  const isStudent = (id: string) => who.get(id)?.role === "student";
  const studentIds = ids.filter(isStudent);
  const answered = await answeredSince(since, studentIds);
  const names = new Map([...who.entries()].map(([k, v]) => [k, v.name]));
  return assemble("real", days, events, daily, truncated, isStudent, names, answered, now);
}

// ============================================================
// Pure roll-ups for /admin/analytics (aggregate.test.ts): daily active people, time by feature,
// top pages, where visits end, and the per-student engagement a tutor reads.
// ============================================================

import { featureOf } from "./shared";
import { identityMap, personOf, type AnalyticsEvent } from "./funnel";

/** Days are US Central calendar days (the founder and most families are in the US). */
export const ANALYTICS_TIME_ZONE = "America/Chicago";
const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: ANALYTICS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function dayOf(iso: string | Date): string {
  return dayFmt.format(typeof iso === "string" ? new Date(iso) : iso);
}

/** The last `days` calendar days ending today, oldest first. */
export function dayRange(days: number, now = new Date()): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(dayOf(new Date(now.getTime() - i * 86_400_000)));
  return [...new Set(out)];
}

/** Same shape as the analytics_daily_people view. */
export interface DailyPersonRow {
  day: string;
  surface: "site" | "portal";
  user_id: string | null;
  anonymous_id: string | null;
  events: number;
  page_views: number;
  active_seconds: number;
  sessions: number;
}

const seconds = (e: AnalyticsEvent) =>
  e.name === "page_time" && typeof e.props.seconds === "number" ? e.props.seconds : 0;

/** What the analytics_daily_people view computes, for sample data. */
export function rollupDailyPeople(events: AnalyticsEvent[]): DailyPersonRow[] {
  const rows = new Map<string, DailyPersonRow & { s: Set<string> }>();
  for (const e of events) {
    if (e.surface === "server") continue;
    const key = [dayOf(e.at), e.surface, e.userId ?? "", e.userId ? "" : (e.anonId ?? "")].join(
      "|"
    );
    let r = rows.get(key);
    if (!r) {
      r = {
        day: dayOf(e.at),
        surface: e.surface,
        user_id: e.userId,
        anonymous_id: e.userId ? null : e.anonId,
        events: 0,
        page_views: 0,
        active_seconds: 0,
        sessions: 0,
        s: new Set(),
      };
      rows.set(key, r);
    }
    r.events++;
    if (e.name === "page_view") r.page_views++;
    r.active_seconds += seconds(e);
    if (e.sessionId) r.s.add(e.sessionId);
    r.sessions = r.s.size;
  }
  return [...rows.values()].map(({ s: _s, ...r }) => r);
}

export interface DailyActive {
  day: string;
  students: number;
  visitors: number;
}

/** Students active in a portal, and public-site visitors, per day. */
export function dailyActive(
  rows: DailyPersonRow[],
  days: string[],
  isStudent: (userId: string) => boolean
): DailyActive[] {
  const students = new Map<string, Set<string>>();
  const visitors = new Map<string, Set<string>>();
  for (const r of rows) {
    if (r.surface === "portal" && r.user_id && isStudent(r.user_id)) {
      if (!students.has(r.day)) students.set(r.day, new Set());
      students.get(r.day)!.add(r.user_id);
    }
    if (r.surface === "site") {
      const who = r.user_id ?? r.anonymous_id;
      if (!who) continue;
      if (!visitors.has(r.day)) visitors.set(r.day, new Set());
      visitors.get(r.day)!.add(who);
    }
  }
  return days.map((day) => ({
    day,
    students: students.get(day)?.size ?? 0,
    visitors: visitors.get(day)?.size ?? 0,
  }));
}

export interface FeatureTime {
  feature: string;
  minutes: number;
  people: number;
}

/** Minutes spent in each portal feature (active, visible time). */
export function timeByFeature(events: AnalyticsEvent[]): FeatureTime[] {
  const ids = identityMap(events);
  const map = new Map<string, { s: number; p: Set<string> }>();
  for (const e of events) {
    if (e.surface !== "portal" || !e.path) continue;
    const s = seconds(e);
    if (!s) continue;
    const f = featureOf(e.path);
    const m = map.get(f) ?? { s: 0, p: new Set<string>() };
    m.s += s;
    const who = personOf(e, ids);
    if (who) m.p.add(who);
    map.set(f, m);
  }
  return [...map.entries()]
    .map(([feature, m]) => ({ feature, minutes: Math.round(m.s / 6) / 10, people: m.p.size }))
    .sort((a, b) => b.minutes - a.minutes);
}

export interface PageStat {
  path: string;
  surface: "site" | "portal";
  views: number;
  people: number;
  avgSeconds: number;
}

export function topPages(events: AnalyticsEvent[], limit = 12): PageStat[] {
  const ids = identityMap(events);
  const map = new Map<
    string,
    { surface: "site" | "portal"; v: number; s: number; p: Set<string> }
  >();
  for (const e of events) {
    if (!e.path || e.surface === "server") continue;
    if (e.name !== "page_view" && e.name !== "page_time") continue;
    const m = map.get(e.path) ?? { surface: e.surface, v: 0, s: 0, p: new Set<string>() };
    if (e.name === "page_view") {
      m.v++;
      const who = personOf(e, ids);
      if (who) m.p.add(who);
    }
    m.s += seconds(e);
    map.set(e.path, m);
  }
  return [...map.entries()]
    .filter(([, m]) => m.v > 0)
    .map(([path, m]) => ({
      path,
      surface: m.surface,
      views: m.v,
      people: m.p.size,
      avgSeconds: Math.round(m.s / m.v),
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

/** The last page of each visit, grouped by sessions. */
function lastPerSession(events: AnalyticsEvent[]): Map<string, AnalyticsEvent> {
  const last = new Map<string, AnalyticsEvent>();
  for (const e of events) {
    if (!e.sessionId || !e.path || e.surface === "server") continue;
    const prev = last.get(e.sessionId);
    if (!prev || e.at >= prev.at) last.set(e.sessionId, e);
  }
  return last;
}

export interface ExitPage {
  path: string;
  visitsEnded: number;
}

/** Where visits end: the page each visit was on last. */
export function exitPages(events: AnalyticsEvent[], limit = 8): ExitPage[] {
  const counts = new Map<string, number>();
  for (const e of lastPerSession(events).values())
    counts.set(e.path!, (counts.get(e.path!) ?? 0) + 1);
  return [...counts.entries()]
    .map(([path, visitsEnded]) => ({ path, visitsEnded }))
    .sort((a, b) => b.visitsEnded - a.visitsEnded)
    .slice(0, limit);
}

export interface StudentEngagement {
  userId: string;
  minutes: number;
  sessions: number;
  activeDays: number;
  lastSeen: string | null;
  topFeature: string | null;
  /** The feature where their visits most often end. */
  stallsAt: string | null;
  /** Visits that ended with a question on screen. */
  leftMidQuestion: number;
  questionsSeen: number;
  questionsAnswered: number;
}

export function studentEngagement(
  events: AnalyticsEvent[],
  daily: DailyPersonRow[],
  studentIds: string[],
  answered: Map<string, number>
): StudentEngagement[] {
  const want = new Set(studentIds);
  const out = new Map<
    string,
    StudentEngagement & { f: Map<string, number>; x: Map<string, number> }
  >();
  const get = (id: string) => {
    let s = out.get(id);
    if (!s) {
      s = {
        userId: id,
        minutes: 0,
        sessions: 0,
        activeDays: 0,
        lastSeen: null,
        topFeature: null,
        stallsAt: null,
        leftMidQuestion: 0,
        questionsSeen: 0,
        questionsAnswered: answered.get(id) ?? 0,
        f: new Map(),
        x: new Map(),
      };
      out.set(id, s);
    }
    return s;
  };
  const days = new Map<string, Set<string>>();
  for (const r of daily) {
    if (r.surface !== "portal" || !r.user_id || !want.has(r.user_id)) continue;
    const s = get(r.user_id);
    s.minutes += r.active_seconds / 60;
    s.sessions += r.sessions;
    if (!days.has(r.user_id)) days.set(r.user_id, new Set());
    days.get(r.user_id)!.add(r.day);
  }
  for (const e of events) {
    if (!e.userId || !want.has(e.userId) || e.surface !== "portal") continue;
    const s = get(e.userId);
    if (!s.lastSeen || e.at > s.lastSeen) s.lastSeen = e.at;
    if (e.name === "question_viewed") s.questionsSeen++;
    if (e.path) {
      const f = featureOf(e.path);
      s.f.set(f, (s.f.get(f) ?? 0) + seconds(e));
    }
  }
  for (const e of lastPerSession(events).values()) {
    if (!e.userId || !want.has(e.userId) || e.surface !== "portal") continue;
    const s = get(e.userId);
    const f = featureOf(e.path!);
    s.x.set(f, (s.x.get(f) ?? 0) + 1);
    if (e.name === "question_viewed") s.leftMidQuestion++;
  }
  const top = (m: Map<string, number>) =>
    [...m.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return [...out.values()]
    .map(({ f, x, ...s }) => ({
      ...s,
      minutes: Math.round(s.minutes),
      activeDays: days.get(s.userId)?.size ?? 0,
      topFeature: top(f),
      stallsAt: top(x),
    }))
    .sort((a, b) => b.minutes - a.minutes || (b.lastSeen ?? "").localeCompare(a.lastSeen ?? ""));
}

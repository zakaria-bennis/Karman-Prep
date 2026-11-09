/*
 * Student homework, the pure part: lists, due lines, the week, and time estimates. The server
 * loader is in ./homework.ts. Days are counted in Central time.
 *
 * Time estimates count active time only (founder, 2026-11-07): each answer is capped at
 * 2 minutes so long pauses don't count, sets answered faster than 8 seconds a question are
 * ignored as rushed, and the student's pace is blended with everyone's until they have 30
 * answers of their own.
 */

export const TIME_ZONE = "America/Chicago";
/** Longest single answer that counts as active time. */
export const PAUSE_CAP_SECONDS = 120;
/** A set whose typical answer took less than this is treated as rushed and ignored. */
export const RUSHED_MEDIAN_SECONDS = 8;
/** Answers a student needs before their own pace counts fully. */
export const OWN_HISTORY_FULL = 30;
/** Pace used when nobody has answered anything yet. */
export const DEFAULT_PACE_SECONDS = 75;
/** Cohort posts have no completion record: after this many days past due they leave the list. */
export const COHORT_LATE_DAYS = 3;
/** A full-length test at standard timing: 98 questions, 2 hr 14 min. */
export const FULL_LENGTH = { questions: 98, minutes: 134 } as const;
const DAY_MS = 86_400_000;

export type HomeworkSource = "tutor" | "school" | "catalog" | "trial" | "cohort";
export type HomeworkState = "open" | "scheduled" | "locked" | "done";
export type HomeworkGroup = "past" | "tonight" | "tomorrow" | "week" | "later";

export const GROUP_ORDER: readonly HomeworkGroup[] = [
  "past",
  "tonight",
  "tomorrow",
  "week",
  "later",
];
export const GROUP_TITLES: Record<HomeworkGroup, string> = {
  past: "Past due",
  tonight: "Tonight",
  tomorrow: "Tomorrow",
  week: "This week",
  later: "Later",
};

export interface HomeworkResult {
  correct: number;
  total: number;
  /** Active seconds spent, or null when unknown. */
  seconds: number | null;
  /** Where the answers and explanations open, or null when there is no review screen. */
  reviewHref: string | null;
}

export interface StudentHomeworkItem {
  key: string;
  source: HomeworkSource;
  title: string;
  /** How big the piece is: questions, and the time limit when it is timed. */
  size: { questions: number; timedMinutes?: number } | null;
  /** Due day (YYYY-MM-DD, Central). For scheduled work: the day it opens. */
  dueOn: string | null;
  /** Exact due time, when the source has one (cohort posts, catalog assignments). */
  dueAt: string | null;
  state: HomeworkState;
  /** Where it opens. Null for scheduled or locked work. */
  href: string | null;
  /** The tutor's own words on the assignment, if any. */
  note: string | null;
  /** First name of whoever assigned it. */
  from: string | null;
  completedAt: string | null;
  result: HomeworkResult | null;
}

// ---------------------------------------------------------------- days and groups

// Formatters are costly to build, so each is made once.
const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});
const hourFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  hour12: false,
  timeZone: TIME_ZONE,
});
const shortFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** A moment's calendar day as YYYY-MM-DD in Central time. */
export const centralDay = (at: string | number) => dayFormat.format(new Date(at));

/** Today's date as YYYY-MM-DD in Central time. */
export const today = (nowMs = Date.now()) => centralDay(nowMs);

export const addDays = (key: string, days: number) =>
  new Date(Date.parse(`${key}T12:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

const shortDay = (key: string) => shortFormat.format(new Date(`${key}T12:00:00Z`));
const clockTime = (iso: string) => timeFormat.format(new Date(iso));
const hourIn = (iso: string) => Number(hourFormat.format(new Date(iso))) % 24;

/** The day an item is due, and whether it is already late. */
function dueDay(item: StudentHomeworkItem, nowMs: number): { day: string | null; late: boolean } {
  const now = today(nowMs);
  if (item.dueAt) {
    const day = centralDay(item.dueAt);
    return { day, late: Date.parse(item.dueAt) < nowMs };
  }
  if (item.dueOn) return { day: item.dueOn, late: item.dueOn < now };
  return { day: null, late: false };
}

/** Which list an unfinished item sits in. Work a tutor hasn't opened yet is never late. */
export function groupFor(item: StudentHomeworkItem, nowMs = Date.now()): HomeworkGroup {
  const now = today(nowMs);
  const { day, late } = dueDay(item, nowMs);
  const waiting = item.state === "scheduled" || item.state === "locked";
  if (!day) return "later";
  if (late) return waiting ? "later" : "past";
  if (day === now) return "tonight";
  if (day === addDays(now, 1)) return "tomorrow";
  if (day <= addDays(now, 6)) return "week";
  return "later";
}

/** The right-hand due line: "Tonight, 11:59 PM", "Tomorrow", "Wed, Nov 11", "Was due Fri, Nov 6". */
export function dueText(
  item: StudentHomeworkItem,
  nowMs = Date.now()
): { text: string; late: boolean } {
  const now = today(nowMs);
  const { day, late } = dueDay(item, nowMs);
  if (item.state === "locked") return { text: "Your tutor opens it", late: false };
  if (item.state === "scheduled") {
    if (!day || day < now) return { text: "Waiting for your tutor", late: false };
    if (day === now) return { text: "Opens today", late: false };
    if (day === addDays(now, 1)) return { text: "Opens tomorrow", late: false };
    return { text: `Opens ${shortDay(day)}`, late: false };
  }
  if (!day) return { text: "No due date", late: false };
  if (late) return { text: `Was due ${shortDay(day)}`, late: true };
  if (day === now) {
    if (!item.dueAt) return { text: "Tonight, 11:59 PM", late: false };
    return {
      text: `${hourIn(item.dueAt) >= 17 ? "Tonight" : "Today"}, ${clockTime(item.dueAt)}`,
      late: false,
    };
  }
  if (day === addDays(now, 1)) {
    return { text: item.dueAt ? `Tomorrow, ${clockTime(item.dueAt)}` : "Tomorrow", late: false };
  }
  return { text: shortDay(day), late: false };
}

/** Unfinished work in its lists, soonest first; done work newest first. */
export function groupHomework(
  items: readonly StudentHomeworkItem[],
  nowMs = Date.now()
): {
  groups: { group: HomeworkGroup; items: StudentHomeworkItem[] }[];
  done: StudentHomeworkItem[];
} {
  const sortKey = (i: StudentHomeworkItem) => i.dueAt ?? (i.dueOn ? `${i.dueOn}T23:59:00` : "9999");
  const open = items
    .filter((i) => i.state !== "done")
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const groups = GROUP_ORDER.map((group) => ({
    group,
    items: open.filter((i) => groupFor(i, nowMs) === group),
  })).filter((g) => g.items.length > 0);
  const done = items
    .filter((i) => i.state === "done")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  return { groups, done };
}

/** The piece to start first: the oldest late one, else the soonest due that can open now. */
export function mostUrgent(items: readonly StudentHomeworkItem[], nowMs = Date.now()) {
  const { groups } = groupHomework(items, nowMs);
  for (const g of groups) {
    const first = g.items.find((i) => i.state === "open" && i.href);
    if (first) return first;
  }
  return null;
}

/** The one gentle nudge for late work (founder: one reminder, never repeated alerts). */
export function lateNudge(count: number): string | null {
  if (count <= 0) return null;
  if (count === 1) return "One piece is late. It still counts, so start with it tonight.";
  const words = ["", "", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const n = words[count] ?? String(count);
  return `${n} pieces are late. They still count, so start with the oldest tonight.`;
}

/**
 * The school week as US calendars show it, Sunday to Saturday (Central): what is due in it,
 * what is done, and the time left on its open work plus anything late (late work still counts).
 */
export function weekSummary(
  items: readonly StudentHomeworkItem[],
  paceSeconds: number,
  nowMs = Date.now()
): { assigned: number; done: number; minutesLeft: number } {
  const now = today(nowMs);
  const sunday = addDays(now, -new Date(`${now}T12:00:00Z`).getUTCDay());
  const saturday = addDays(sunday, 6);
  const dayOf = (i: StudentHomeworkItem) => (i.dueAt ? centralDay(i.dueAt) : i.dueOn);
  const inWeek = items.filter((i) => {
    const day = dayOf(i);
    return i.state !== "locked" && !!day && day >= sunday && day <= saturday;
  });
  const minutesLeft = items
    .filter((i) => i.state === "open" && (inWeek.includes(i) || groupFor(i, nowMs) === "past"))
    .reduce((n, i) => n + (estimateMinutes(i.size, paceSeconds) ?? 0), 0);
  return {
    assigned: inWeek.length,
    done: inWeek.filter((i) => i.state === "done").length,
    minutesLeft,
  };
}

// ---------------------------------------------------------------- time estimates

/** The middle value, or null for an empty list. */
export const median = (xs: readonly number[]) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Typical active seconds per question, from answers (capped) with pauses and rushed sets removed. */
export function activeSeconds(
  samples: readonly { sessionId: string; seconds: number }[]
): number[] {
  const bySession = new Map<string, number[]>();
  for (const s of samples) {
    if (!Number.isFinite(s.seconds) || s.seconds < 0) continue;
    const list = bySession.get(s.sessionId) ?? [];
    list.push(Math.min(PAUSE_CAP_SECONDS, s.seconds));
    bySession.set(s.sessionId, list);
  }
  const kept: number[] = [];
  for (const list of bySession.values()) {
    if ((median(list) ?? 0) < RUSHED_MEDIAN_SECONDS) continue;
    kept.push(...list);
  }
  return kept;
}

/** The student's pace, blended with everyone's until they have OWN_HISTORY_FULL answers. */
export function blendedPace(own: readonly number[], everyone: number | null): number {
  const base = everyone && everyone > 0 ? everyone : DEFAULT_PACE_SECONDS;
  if (own.length === 0) return base;
  const mean = own.reduce((n, s) => n + s, 0) / own.length;
  const w = Math.min(1, own.length / OWN_HISTORY_FULL);
  return w * mean + (1 - w) * base;
}

/** Minutes a piece should take: its time limit when timed, else questions at the student's pace. */
export function estimateMinutes(
  size: StudentHomeworkItem["size"],
  paceSeconds: number
): number | null {
  if (!size) return null;
  if (size.timedMinutes) return size.timedMinutes;
  return Math.max(1, Math.round((size.questions * paceSeconds) / 60));
}

export function formatMinutes(total: number): string {
  const m = Math.max(0, Math.round(total));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} hr ${rest} min` : `${h} hr`;
}

/** "10 questions · about 12 min", or "27 questions · 32 min" for timed work. */
export function sizeText(size: StudentHomeworkItem["size"], paceSeconds: number): string | null {
  if (!size) return null;
  const q = `${size.questions} ${size.questions === 1 ? "question" : "questions"}`;
  if (size.timedMinutes) return `${q} · ${formatMinutes(size.timedMinutes)}`;
  return `${q} · about ${formatMinutes(estimateMinutes(size, paceSeconds) ?? 1)}`;
}

/** "9 of 10 right · 11 min". */
export function resultText(r: HomeworkResult): string {
  const parts = [`${r.correct} of ${r.total} right`];
  if (r.seconds !== null && r.seconds > 0) parts.push(formatMinutes(Math.max(1, r.seconds / 60)));
  return parts.join(" · ");
}

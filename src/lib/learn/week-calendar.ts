/** Read-only learner calendar. These are saved commitments, not generated plan tasks. */
export interface CalendarSource<T> {
  state: "ready" | "unavailable";
  items: T[];
}

export interface SavedSession {
  id: string;
  plan_tier: string;
  scheduled_start: string;
  scheduled_end: string;
}

export interface PostedHomework {
  id: string;
  title: string;
  body: string | null;
  assigned_at: string;
  due_at: string | null;
}

export interface PostedPractice {
  id: string;
  title: string;
  catalog_skill_id: string;
  created_at: string;
  due_at: string | null;
}

export interface StudentCalendarData {
  sessions: CalendarSource<SavedSession>;
  cohortHomework: CalendarSource<PostedHomework>;
  practiceAssignments: CalendarSource<PostedPractice>;
}

export interface CalendarItem {
  id: string;
  source: "session" | "cohort" | "practice";
  sourceLabel: string;
  title: string;
  description: string | null;
  at: string | null;
  endAt: string | null;
  postedAt: string | null;
  href: string | null;
}

export interface CalendarDay {
  key: string;
  items: CalendarItem[];
}

export interface CalendarWeek {
  days: CalendarDay[];
  earlierDue: CalendarItem[];
  undated: CalendarItem[];
  unavailableSources: string[];
}

/** Use a real IANA zone; a missing/invalid account zone can use the device zone. */
export function resolveCalendarTimeZone(preferred: string | null, device?: string): string {
  for (const candidate of [preferred, device, "UTC"]) {
    if (!candidate) continue;
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: candidate });
      return candidate;
    } catch {
      // Try the next available zone.
    }
  }
  return "UTC";
}

export function dateKeyAt(instant: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(instant));
  const part = (type: string) => parts.find((entry) => entry.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function addDays(day: string, count: number): string {
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

function sessionTitle(tier: string): string {
  switch (tier) {
    case "group":
      return "Seminar session";
    case "small_group":
      return "Small-group session";
    case "private":
    case "elite":
      return "Private tutor session";
    default:
      return "Tutor session";
  }
}

export function buildCalendarWeek(
  data: StudentCalendarData,
  asOf: string,
  timeZone: string
): CalendarWeek {
  const today = dateKeyAt(asOf, timeZone);
  const days = Array.from({ length: 7 }, (_, offset) => ({
    key: addDays(today, offset),
    items: [] as CalendarItem[],
  }));
  const dayMap = new Map(days.map((day) => [day.key, day]));
  const earlierDue: CalendarItem[] = [];
  const undated: CalendarItem[] = [];
  // The existing schedule page manages only the next booking, not an arbitrary
  // booking selected from this week.
  const nextSessionId = data.sessions.items
    .filter((row) => row.scheduled_start >= asOf)
    .sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start))[0]?.id;
  const items: CalendarItem[] = [
    ...data.sessions.items.map((row) => ({
      id: `session:${row.id}`,
      source: "session" as const,
      sourceLabel: "Scheduled session",
      title: sessionTitle(row.plan_tier),
      description: null,
      at: row.scheduled_start,
      endAt: row.scheduled_end,
      postedAt: null,
      href: row.id === nextSessionId ? "/dashboard/student/schedule" : null,
    })),
    ...data.cohortHomework.items.map((row) => ({
      id: `cohort:${row.id}`,
      source: "cohort" as const,
      sourceLabel: "Tutor-posted cohort work",
      title: row.title,
      description: row.body,
      at: row.due_at,
      endAt: null,
      postedAt: row.assigned_at,
      href: null,
    })),
    ...data.practiceAssignments.items.map((row) => ({
      id: `practice:${row.id}`,
      source: "practice" as const,
      sourceLabel: "Practice posted by your educator",
      title: row.title,
      description: null,
      at: row.due_at,
      endAt: null,
      postedAt: row.created_at,
      href: `/learn/practice/${encodeURIComponent(row.catalog_skill_id)}?assignment=${encodeURIComponent(row.id)}`,
    })),
  ];

  for (const item of items) {
    if (!item.at) {
      undated.push(item);
      continue;
    }
    if (!Number.isFinite(Date.parse(item.at))) continue;
    const day = dateKeyAt(item.at, timeZone);
    if (dayMap.has(day)) dayMap.get(day)!.items.push(item);
    else if (day < today && item.source !== "session") earlierDue.push(item);
  }
  for (const day of days) day.items.sort((a, b) => a.at!.localeCompare(b.at!));
  earlierDue.sort((a, b) => b.at!.localeCompare(a.at!));
  undated.sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? ""));

  return {
    days,
    earlierDue: earlierDue.slice(0, 3),
    undated: undated.slice(0, 3),
    unavailableSources: [
      data.sessions.state === "unavailable" ? "sessions" : null,
      data.cohortHomework.state === "unavailable" ? "group homework" : null,
      data.practiceAssignments.state === "unavailable" ? "assigned practice" : null,
    ].filter((label): label is string => !!label),
  };
}

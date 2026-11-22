/*
 * Homework for a real Cohort or Private student, in the shape the Homework screen draws
 * (src/app/dev/shell/homeworkData.ts): the work tutors assigned, today's Daily 10 and challenge,
 * the live classes on the calendar, and which week of the cohort it is. Read from the same places
 * the old Homework and Today pages read.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCalendar } from "@/components/student-portal/calendar/load";
import { challengeAnsweredCount } from "@/lib/daily-ten/challenge";
import { utcDayKey } from "@/lib/daily-challenge/selection";
import type { StudentContext } from "@/lib/student/context";
import { doneToday } from "@/lib/student/daily-ten";
import { loadStudentHomework, type StudentHomeworkItem } from "@/lib/student/homework";
import { dayKey } from "@/lib/student/streak";
import { SKILLS } from "@/app/dev/shell/skills72";
import type { Kind, Sort, Work } from "@/app/dev/shell/homeworkData";
import { between } from "./progress";

/** A piece of work on its day: days from today (0 today, less than 0 past), and where it opens. */
export type RealWork = Work & { from: number; href: string | null };

export interface RealHomework {
  work: RealWork[];
  /** Live classes and 1:1 sessions ahead and just past: days from today, the time, the start. */
  classes: { from: number; time: string; at: number }[];
  dailyDone: boolean;
  challengeDone: boolean;
  /** The cohort's week now, and how many it has; a Private student has no count of weeks. */
  weekNow: number;
  weeks: number | null;
}

const COHORT_WEEKS = 9;
/** Missed work is marked for a week, then closed (founder, 2026-11-16). */
const MISSING_DAYS = 7;

const MATH_NAMES = new Set(SKILLS.Math.flatMap((d) => [d.name, ...d.skills.map((s) => s.name)]));
const RW_NAMES = new Set(
  SKILLS["Reading and Writing"].flatMap((d) => [d.name, ...d.skills.map((s) => s.name)])
);

/** Reading and Writing, Math or Mixed, from the work's words or its link. */
export function kindOf(item: Pick<StudentHomeworkItem, "title" | "href">): Kind {
  const words = `${item.title} ${item.href ?? ""}`.toLowerCase();
  const math =
    /\bma-skill|math|section=math/.test(words) ||
    [...MATH_NAMES].some((n) => words.includes(n.toLowerCase()));
  const rw =
    /\brw-skill|reading|writing|section=reading/.test(words) ||
    [...RW_NAMES].some((n) => words.includes(n.toLowerCase()));
  return math === rw ? "mixed" : math ? "math" : "rw";
}

export function workOf(item: StudentHomeworkItem, todayKey: string): RealWork | null {
  const due = item.dueOn ?? item.completedAt?.slice(0, 10) ?? null;
  if (!due) return null;
  const from = between(todayKey, due);
  const sort: Sort = item.source === "trial" ? "trial" : "skill";
  const state: Work["state"] =
    item.state === "done"
      ? "done"
      : from >= 0
        ? "todo"
        : from >= -MISSING_DAYS
          ? "missing"
          : "closed";
  return {
    id: item.key,
    kind: kindOf(item),
    sort,
    name: item.title,
    much: item.size ? `${item.size.questions} questions` : "",
    state,
    from,
    href: item.state === "open" ? item.href : (item.result?.reviewHref ?? null),
  };
}

const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Chicago",
});

export async function loadHomework(
  db: SupabaseClient,
  ctx: StudentContext,
  dailyDays: readonly string[],
  studentDays: number,
  nowMs: number
): Promise<RealHomework> {
  const today = dayKey(nowMs);
  const [homework, calendar, challenge, cohort] = await Promise.all([
    ctx.hasTutor
      ? loadStudentHomework({ userId: ctx.userId, clerkId: ctx.clerkId }, { nowMs }).catch(
          () => null
        )
      : null,
    ctx.showCalendar ? loadCalendar(ctx, nowMs).catch(() => null) : null,
    challengeAnsweredCount(ctx.clerkId, utcDayKey(new Date(nowMs))).catch(() => 0),
    db
      .from("cohort_members")
      .select("cohorts(sat_date)")
      .eq("user_id", ctx.userId)
      .is("left_at", null)
      .limit(1)
      .maybeSingle()
      .then(
        (r) => (r.data as { cohorts: { sat_date: string } | null } | null)?.cohorts ?? null,
        () => null
      ),
  ]);

  const work = (homework?.items ?? [])
    .map((i) => workOf(i, today))
    .filter((w): w is RealWork => w !== null);
  const classes = (calendar?.booked ?? [])
    .map((b) => ({
      from: between(today, dayKey(b.start)),
      time: timeFormat.format(new Date(b.start)),
      at: Date.parse(b.start),
    }))
    .sort((a, b) => a.at - b.at);
  // a cohort's nine weeks end on its SAT
  const weekNow = cohort
    ? Math.max(
        1,
        Math.min(COHORT_WEEKS, COHORT_WEEKS - Math.floor(between(today, cohort.sat_date) / 7))
      )
    : Math.floor(studentDays / 7) + 1;
  return {
    work,
    classes,
    dailyDone: doneToday(dailyDays as string[], nowMs),
    challengeDone: challenge >= 2,
    weekNow,
    weeks: cohort ? COHORT_WEEKS : null,
  };
}

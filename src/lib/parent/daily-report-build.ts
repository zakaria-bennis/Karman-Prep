/*
 * The daily report for parents (founder, 2026-11-11, PRODUCT.md "Operating Context"): parents on
 * the Cohort, Private tutoring and Pro plans get the day's work, the predicted score and a note
 * from the tutor. This file is pure: it turns rows the loader read (daily-report.ts) into the
 * report the portal page and the email both show, so the two always match.
 *
 * Counts, minutes, skill names and homework titles only. Never a question or an answer.
 */
import { clampLevel, type SkillLevel } from "@/components/portal/skill-levels";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import { dayKeyIn, safeTimeZone } from "@/lib/daily-ten/day";
import { levelFromHistory } from "@/lib/levels/rules";
import { predictedScore } from "@/lib/progress-glance/levels";
import { subSkillTitle } from "@/lib/subskills/taxonomy";

/** One saved answer, from catalog practice or the quiz flows. */
export interface ReportAnswerRow {
  skillId: string;
  /** The question's sub-skill; levels and names follow it. */
  subSkillId: string;
  correct: boolean;
  usedHint?: boolean;
  /** ISO time it was answered. */
  at: string;
  seconds: number;
}

export interface ReportHomeworkRow {
  title: string;
  /** YYYY-MM-DD */
  dueOn: string;
  /** ISO time it was finished; null while open. */
  completedAt: string | null;
}

export interface ReportNoteRow {
  body: string;
  from: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface DailyReportRows {
  answers: readonly ReportAnswerRow[];
  homework: readonly ReportHomeworkRow[];
  /** Diagnostic ranges, any order. */
  scores: readonly { takenAt: string; low: number; high: number }[];
  notes: readonly ReportNoteRow[];
}

export interface ReportSkill {
  id: string;
  label: string;
  answered: number;
  correct: number;
  /** Set when the skill reached Learning or higher that day. */
  levelUp: { from: SkillLevel; to: SkillLevel } | null;
  /** True when the day's answers were the skill's first ever. */
  firstTry: boolean;
}

export interface ReportHomeworkItem {
  title: string;
  dueOn: string;
}

export interface DailyReport {
  /** YYYY-MM-DD in `timeZone`. */
  day: string;
  timeZone: string;
  isToday: boolean;
  minutes: number;
  answered: number;
  correct: number;
  /** Whole percent right, or null with no answers. */
  accuracy: number | null;
  /** Most answered first. */
  skills: ReportSkill[];
  homework: {
    completed: ReportHomeworkItem[];
    dueToday: ReportHomeworkItem[];
    dueTomorrow: ReportHomeworkItem[];
    pastDue: ReportHomeworkItem[];
  };
  /** The latest predicted score as of the end of the day (one number, never a range). */
  score: { current: number | null; measuredThatDay: boolean; previous: number | null };
  /** The tutor's note last written that day, if any. */
  tutorNote: { body: string; from: string | null; at: string } | null;
  /** Nothing was practiced, finished, measured or noted that day. */
  quiet: boolean;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar day written YYYY-MM-DD. */
export function isDayKey(value: string | null | undefined): value is string {
  if (!value || !DAY_RE.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** The day `n` days after `day` (negative for before). */
export function shiftDay(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "Thursday, November 12" for a day key. */
export function dayLabel(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * The day to show: the requested one when it is a real day no later than today, else today, in
 * the parent's zone (Central time when none is stored or it is invalid).
 */
export function resolveReportDay(
  requested: string | null | undefined,
  zone: string | null | undefined,
  now: Date
): { day: string; today: string; timeZone: string } {
  const timeZone = safeTimeZone(zone);
  const today = dayKeyIn(now, timeZone);
  const day = isDayKey(requested) && requested <= today ? requested : today;
  return { day, today, timeZone };
}

const CATALOG_LABEL = new Map(CATALOG_SKILLS.map((s) => [s.id, s.label]));

function skillLabel(subSkillId: string, skillId: string): string {
  return (
    subSkillTitle(subSkillId) ?? subSkillTitle(skillId) ?? CATALOG_LABEL.get(skillId) ?? "A skill"
  );
}

function ms(at: string): number {
  return Date.parse(at);
}

function skillsOfDay(
  answers: readonly ReportAnswerRow[],
  dayOf: (at: string) => string,
  day: string
): ReportSkill[] {
  const bySkill = new Map<string, ReportAnswerRow[]>();
  for (const a of answers) {
    if (dayOf(a.at) > day) continue;
    const key = a.subSkillId || a.skillId;
    const list = bySkill.get(key) ?? [];
    list.push(a);
    bySkill.set(key, list);
  }
  const out: ReportSkill[] = [];
  for (const [id, list] of bySkill) {
    const today = list.filter((a) => dayOf(a.at) === day).sort((x, y) => ms(x.at) - ms(y.at));
    if (!today.length) continue;
    const before = list.filter((a) => dayOf(a.at) < day);
    const toHistory = (a: ReportAnswerRow) => ({
      correct: a.correct,
      usedHint: !!a.usedHint,
      at: a.at,
    });
    const from = clampLevel(levelFromHistory(before.map(toHistory), new Date(today[0].at)).level);
    const to = clampLevel(
      levelFromHistory([...before, ...today].map(toHistory), new Date(today.at(-1)!.at)).level
    );
    out.push({
      id,
      label: skillLabel(id, today[0].skillId),
      answered: today.length,
      correct: today.filter((a) => a.correct).length,
      levelUp: to > from && to >= 2 ? { from, to } : null,
      firstTry: before.length === 0,
    });
  }
  return out.sort((a, b) => b.answered - a.answered || a.label.localeCompare(b.label));
}

export function buildDailyReport(
  rows: DailyReportRows,
  opts: { day: string; timeZone: string; now: Date }
): DailyReport {
  const timeZone = safeTimeZone(opts.timeZone);
  const { day } = opts;
  const dayOf = (at: string) => dayKeyIn(new Date(at), timeZone);
  const valid = rows.answers.filter((a) => Number.isFinite(ms(a.at)));
  const ofDay = valid.filter((a) => dayOf(a.at) === day);
  const answered = ofDay.length;
  const correct = ofDay.filter((a) => a.correct).length;
  const seconds = ofDay.reduce((sum, a) => sum + Math.max(0, a.seconds || 0), 0);

  const tomorrow = shiftDay(day, 1);
  const openAtEnd = rows.homework.filter((h) => !h.completedAt || dayOf(h.completedAt) > day);
  const byDue = (a: ReportHomeworkItem, b: ReportHomeworkItem) =>
    a.dueOn.localeCompare(b.dueOn) || a.title.localeCompare(b.title);
  const item = (h: ReportHomeworkRow): ReportHomeworkItem => ({ title: h.title, dueOn: h.dueOn });
  const homework = {
    completed: rows.homework
      .filter((h) => h.completedAt && dayOf(h.completedAt) === day)
      .map(item)
      .sort(byDue),
    dueToday: openAtEnd.filter((h) => h.dueOn === day).map(item),
    dueTomorrow: openAtEnd.filter((h) => h.dueOn === tomorrow).map(item),
    pastDue: openAtEnd
      .filter((h) => h.dueOn < day)
      .map(item)
      .sort(byDue),
  };

  const measured = rows.scores
    .filter((s) => Number.isFinite(ms(s.takenAt)) && dayOf(s.takenAt) <= day)
    .sort((a, b) => ms(a.takenAt) - ms(b.takenAt));
  const last = measured.at(-1);
  const prior = measured.at(-2);
  const score = {
    current: last ? predictedScore(last.low, last.high) : null,
    measuredThatDay: !!last && dayOf(last.takenAt) === day,
    previous: prior ? predictedScore(prior.low, prior.high) : null,
  };

  const noteOfDay = rows.notes
    .map((n) => ({ ...n, at: n.updatedAt ?? n.createdAt }))
    .filter((n) => n.body.trim() && Number.isFinite(ms(n.at)) && dayOf(n.at) === day)
    .sort((a, b) => ms(b.at) - ms(a.at))[0];
  const tutorNote = noteOfDay
    ? { body: noteOfDay.body.trim(), from: noteOfDay.from, at: noteOfDay.at }
    : null;

  return {
    day,
    timeZone,
    isToday: day === dayKeyIn(opts.now, timeZone),
    minutes: Math.round(seconds / 60),
    answered,
    correct,
    accuracy: answered ? Math.round((correct / answered) * 100) : null,
    skills: skillsOfDay(valid, dayOf, day),
    homework,
    score,
    tutorNote,
    quiet: !answered && !homework.completed.length && !score.measuredThatDay && !tutorNote,
  };
}

/*
 * Who gets the daily report: the Cohort, Private tutoring and Pro plans (founder, 2026-11-11).
 * Plan ids come from `getPlan` (src/lib/plans); older rows still carry a `subscriptions.tier`
 * (the names guarantee.ts reads), so an active one of those counts too.
 */
export const DAILY_REPORT_PLAN_IDS = ["pro", "cohort", "private-10", "private-20"] as const;
const LEGACY_TIERS = new Set([
  "pro",
  "group",
  "small_group",
  "cohort",
  "private",
  "private-10",
  "private-20",
  "elite",
]);
const LIVE_STATUSES = new Set(["active", "trialing"]);

export function hasDailyReport(
  planIds: readonly string[],
  legacy: { tier: string | null; status: string | null } | null = null
): boolean {
  if (planIds.some((id) => (DAILY_REPORT_PLAN_IDS as readonly string[]).includes(id))) return true;
  return !!legacy?.tier && LEGACY_TIERS.has(legacy.tier) && LIVE_STATUSES.has(legacy.status ?? "");
}

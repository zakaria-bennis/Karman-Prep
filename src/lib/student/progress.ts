/*
 * The numbers behind the student's Progress tab (founder, 2026-11-07): one predicted score and
 * its history, what moved this week, time and effort, personal bests, and the mystery box.
 * Pure, so the page and the tests share one rule. The page loads the rows; this file decides.
 *
 * Never a range and never a goal: a source that only stores a range (the diagnostic) shows
 * its midpoint, rounded to the nearest 10 like a real SAT score.
 */
import { levelFromAnswers, type LevelAnswer, type SkillLevel } from "./levels";
import { dayKey } from "./streak";

const DAY_MS = 86_400_000;
export const TIME_ZONE = "America/Chicago";
/** The longest single answer that counts as active time (longer means a pause). */
export const ANSWER_CAP_SECONDS = 120;
/** A mystery box arrives every this many tokens. */
export const MYSTERY_BOX_TOKENS = 300;

// ---------------------------------------------------------------- predicted score

export interface ScorePoint {
  /** ISO time the score was measured. */
  at: string;
  score: number;
}

/** One SAT score from a stored range: the midpoint, to the nearest 10, between 400 and 1600. */
export function predictedFromRange(low: number, high: number): number {
  const mid = (low + high) / 2;
  return Math.min(1600, Math.max(400, Math.round(mid / 10) * 10));
}

/** Diagnostic rows (any order) as a score history, oldest first. */
export function scoreHistory(
  rows: readonly { taken_at: string; score_range_low: number; score_range_high: number }[]
): ScorePoint[] {
  return rows
    .filter((r) => Number.isFinite(Date.parse(r.taken_at)))
    .map((r) => ({
      at: r.taken_at,
      score: predictedFromRange(r.score_range_low, r.score_range_high),
    }))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

/** "Oct 4" in Central time. */
export function shortDate(at: string | number): string {
  return new Date(at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: TIME_ZONE,
  });
}

/** How the latest score compares with the one before it, in words, or null with one score. */
export function scoreChange(history: readonly ScorePoint[]): string | null {
  if (history.length < 2) return null;
  const last = history[history.length - 1];
  const before = history[history.length - 2];
  const diff = last.score - before.score;
  const since = shortDate(before.at);
  if (diff === 0) return `Same as ${since}`;
  return `${diff > 0 ? "Up" : "Down"} ${Math.abs(diff)} since ${since}`;
}

export interface TrendGeometry {
  width: number;
  height: number;
  points: { x: number; y: number; score: number; label: string }[];
  /** The polyline's `points` attribute. */
  path: string;
}

/** Where each score sits on the history line (an SVG of `width` by `height`). */
export function trendGeometry(
  history: readonly ScorePoint[],
  width = 300,
  height = 92
): TrendGeometry {
  /* Room at the sides for the date labels, and above the top point for its value. */
  const padX = 28;
  const padTop = 24;
  const padBottom = 8;
  const scores = history.map((p) => p.score);
  const lo = Math.floor((Math.min(...scores) - 20) / 10) * 10;
  const hi = Math.ceil((Math.max(...scores) + 20) / 10) * 10;
  const span = Math.max(10, hi - lo);
  const points = history.map((p, i) => {
    const x =
      history.length === 1 ? width / 2 : padX + (i * (width - 2 * padX)) / (history.length - 1);
    const y = height - padBottom - ((p.score - lo) / span) * (height - padTop - padBottom);
    return {
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      score: p.score,
      label: shortDate(p.at),
    };
  });
  return { width, height, points, path: points.map((p) => `${p.x},${p.y}`).join(" ") };
}

// ---------------------------------------------------------------- what moved this week

export interface SkillAnswerLike extends LevelAnswer {
  skillId: string;
}

export interface SkillMove {
  skillId: string;
  label: string;
  from: SkillLevel;
  to: SkillLevel;
}

function bySkill<T extends SkillAnswerLike>(answers: readonly T[]): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const a of answers) {
    const list = out.get(a.skillId) ?? [];
    list.push(a);
    out.set(a.skillId, list);
  }
  return out;
}

const timeOf = (at: string | number) => (typeof at === "number" ? at : Date.parse(at));

/**
 * Skills whose level is different now from a week ago: ups first (biggest first), then downs.
 * A week ago means the answers saved before then, read as of then (so decay counts too).
 */
export function whatMoved(
  answers: readonly SkillAnswerLike[],
  labels: ReadonlyMap<string, string>,
  nowMs = Date.now()
): SkillMove[] {
  const weekAgo = nowMs - 7 * DAY_MS;
  const moves: SkillMove[] = [];
  for (const [skillId, list] of bySkill(answers)) {
    const label = labels.get(skillId);
    if (!label) continue;
    const to = levelFromAnswers(list, nowMs);
    const from = levelFromAnswers(
      list.filter((a) => timeOf(a.at) <= weekAgo),
      weekAgo
    );
    if (from !== to) moves.push({ skillId, label, from, to });
  }
  return moves.sort((a, b) => {
    const da = a.to - a.from;
    const db = b.to - b.from;
    if (da > 0 !== db > 0) return da > 0 ? -1 : 1;
    return Math.abs(db) - Math.abs(da) || a.label.localeCompare(b.label);
  });
}

// ---------------------------------------------------------------- time and effort

export interface TimedAnswer {
  at: string | number;
  seconds: number;
}

/** Active seconds for one answer: never negative, and a long pause counts as 2 minutes. */
export const activeSeconds = (seconds: number) =>
  Math.min(ANSWER_CAP_SECONDS, Math.max(0, Number.isFinite(seconds) ? seconds : 0));

export interface DayEffort {
  /** The day (YYYY-MM-DD, Central time). */
  day: string;
  /** "Today", or the weekday ("Mon"). */
  label: string;
  seconds: number;
  /** This day's share of the busiest day, from 0 to 1 (the bar's height). */
  share: number;
}

/**
 * Active time on each of the last `days` days (Central time), oldest first. One bar per day, so
 * days compare at a glance (founder, 2026-11-08: bars, not rings).
 */
export function dailyEffort(
  answers: readonly TimedAnswer[],
  nowMs = Date.now(),
  days = 7
): DayEffort[] {
  const today = dayKey(nowMs, TIME_ZONE);
  const keys = Array.from({ length: days }, (_, i) =>
    new Date(Date.parse(`${today}T12:00:00Z`) - (days - 1 - i) * DAY_MS).toISOString().slice(0, 10)
  );
  const totals = new Map(keys.map((k) => [k, 0]));
  for (const a of answers) {
    const t = timeOf(a.at);
    if (!Number.isFinite(t)) continue;
    const key = dayKey(t, TIME_ZONE);
    if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + activeSeconds(a.seconds));
  }
  const busiest = Math.max(0, ...totals.values());
  return keys.map((day) => {
    const seconds = totals.get(day) ?? 0;
    return {
      day,
      label:
        day === today
          ? "Today"
          : new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", {
              weekday: "short",
              timeZone: "UTC",
            }),
      seconds,
      share: busiest > 0 ? seconds / busiest : 0,
    };
  });
}

/** Hours with one decimal ("3.1"), or minutes under an hour ("25 min"). */
export function formatEffort(seconds: number): string {
  if (seconds <= 0) return "0";
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min`;
  return `${(Math.round(seconds / 360) / 10).toFixed(1)} hr`;
}

/** Answers this calendar month (Central time), and the average active seconds per answer. */
export function monthEffort(
  answers: readonly TimedAnswer[],
  nowMs = Date.now()
): { questions: number; paceSeconds: number | null } {
  const month = dayKey(nowMs, TIME_ZONE).slice(0, 7);
  const inMonth = answers.filter((a) => {
    const t = timeOf(a.at);
    return Number.isFinite(t) && dayKey(t, TIME_ZONE).slice(0, 7) === month;
  });
  if (inMonth.length === 0) return { questions: 0, paceSeconds: null };
  const total = inMonth.reduce((n, a) => n + activeSeconds(a.seconds), 0);
  return { questions: inMonth.length, paceSeconds: Math.round(total / inMonth.length) };
}

// ---------------------------------------------------------------- personal bests

export interface PracticeSetResult {
  sessionId: string;
  correct: number;
  total: number;
  at: string;
}

/** Practice sets from saved answers: right and total per session, for sets of 5 or more. */
export function practiceSets(
  answers: readonly (LevelAnswer & { sessionId: string })[]
): PracticeSetResult[] {
  const sets = new Map<string, PracticeSetResult>();
  for (const a of answers) {
    const at = typeof a.at === "number" ? new Date(a.at).toISOString() : a.at;
    const s = sets.get(a.sessionId) ?? { sessionId: a.sessionId, correct: 0, total: 0, at };
    s.total += 1;
    if (a.correct) s.correct += 1;
    if (Date.parse(at) > Date.parse(s.at)) s.at = at;
    sets.set(a.sessionId, s);
  }
  return [...sets.values()].filter((s) => s.total >= 5);
}

export interface TrialRun {
  beat: boolean;
  finished: boolean;
  elapsed_seconds: number;
  section: string;
}

export interface PersonalBest {
  key: "practice" | "trial";
  value: string;
  label: string;
}

/** "6:12" from seconds. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * The student's bests, only those that exist: the best practice set and the fastest beaten
 * time trial. The longest streak sits beside the current one in Streak and rewards instead.
 */
export function personalBests(input: {
  sets: readonly PracticeSetResult[];
  trials: readonly TrialRun[];
}): PersonalBest[] {
  const out: PersonalBest[] = [];
  const best = [...input.sets].sort(
    (a, b) =>
      b.correct / b.total - a.correct / a.total ||
      b.total - a.total ||
      Date.parse(b.at) - Date.parse(a.at)
  )[0];
  if (best) {
    out.push({
      key: "practice",
      value: `${best.correct} of ${best.total}`,
      label: "Best practice set",
    });
  }
  const fastest = input.trials
    .filter((t) => t.beat && t.finished && t.elapsed_seconds > 0)
    .sort((a, b) => a.elapsed_seconds - b.elapsed_seconds)[0];
  if (fastest) {
    out.push({
      key: "trial",
      value: clock(fastest.elapsed_seconds),
      label: `Fastest ${fastest.section === "math" ? "Math" : "Reading and Writing"} time trial`,
    });
  }
  return out;
}

// ---------------------------------------------------------------- rewards

/** Progress to the next mystery box: the ring's fill and the tokens still to earn. */
export function mysteryBox(tokens: number): { share: number; toGo: number } {
  const t = Math.max(0, Math.floor(tokens));
  const into = t % MYSTERY_BOX_TOKENS;
  return { share: into / MYSTERY_BOX_TOKENS, toGo: MYSTERY_BOX_TOKENS - into };
}

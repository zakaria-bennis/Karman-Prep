/*
 * Skill levels for the student portal (founder, 2026-11-08). One small module maps the app's
 * saved answers onto the five levels the portal draws as squares:
 *
 *   0 Not started    no answer yet (an empty outline square)
 *   1 New            reached on the first try: any answer at all
 *   2 Learning       a run of 3 right answers in a row
 *   3 Understanding  then a run of 4 right answers in a row
 *   4 Conquered      then a run of 5 right answers in a row
 *
 * How the run works: answers are read oldest first. A right answer given without a hint adds
 * one to the run. A wrong answer, or any answer given with a hint, sets the run back to 0.
 * When the run reaches the number the next level needs, the skill moves up one level and the
 * run starts again from 0. So from New it takes 3, then 4 more, then 5 more.
 *
 * Mixed check-ins (Domain quizzes, Daily 10, reviews) are answers like any other, so they
 * bring old skills back simply by being counted here.
 *
 * Skill decay: a skill drops one level for every DECAY_DAYS without an answer, but never
 * below New (a skill once started stays started).
 *
 * The level names and run lengths come from the portal's one source,
 * `src/components/portal/skill-levels.ts`. The quiz-flows session writes practice answers;
 * this module only reads them.
 */
import { SKILL_LEVELS, clampLevel, type SkillLevel } from "@/components/portal/skill-levels";
import type { ConfidenceBand } from "@/types/quiz";

export type { SkillLevel };

/** One saved answer for a skill. */
export interface LevelAnswer {
  correct: boolean;
  /** When it was answered: an ISO string or epoch milliseconds. */
  at: string | number;
  /** True when the student opened a hint first. Such an answer never counts toward a run. */
  hint?: boolean;
}

/** Days without practice before a skill drops one level. */
export const DECAY_DAYS = 28;
const DAY_MS = 86_400_000;

/** Right answers in a row needed to move up from `level` to `level + 1` (null at the top or from 0). */
export function runToNext(level: SkillLevel): number | null {
  if (level === 0 || level === 4) return null;
  return SKILL_LEVELS[level + 1].run;
}

const timeOf = (at: string | number) => (typeof at === "number" ? at : Date.parse(at));

/** The level before decay, and the run in progress, from answers in any order. */
export function climb(answers: readonly LevelAnswer[]): { level: SkillLevel; run: number } {
  const ordered = answers
    .filter((a) => Number.isFinite(timeOf(a.at)))
    .sort((a, b) => timeOf(a.at) - timeOf(b.at));
  if (ordered.length === 0) return { level: 0, run: 0 };
  let level: SkillLevel = 1;
  let run = 0;
  for (const a of ordered) {
    run = a.correct && !a.hint ? run + 1 : 0;
    const need = runToNext(level);
    if (need !== null && run >= need) {
      level = clampLevel(level + 1);
      run = 0;
    }
  }
  return { level, run };
}

/** Levels lost to decay: one for every DECAY_DAYS since the last answer, floored at New. */
export function decay(level: SkillLevel, lastAnsweredMs: number | null, nowMs: number): SkillLevel {
  if (level <= 1 || lastAnsweredMs === null) return level;
  const idle = Math.floor(Math.max(0, nowMs - lastAnsweredMs) / (DECAY_DAYS * DAY_MS));
  return clampLevel(Math.max(1, level - idle));
}

/** A skill's level from its saved answers, with decay applied. */
export function levelFromAnswers(answers: readonly LevelAnswer[], nowMs = Date.now()): SkillLevel {
  const { level } = climb(answers);
  const last = answers.reduce<number | null>((m, a) => {
    const t = timeOf(a.at);
    return Number.isFinite(t) && (m === null || t > m) ? t : m;
  }, null);
  return decay(level, last, nowMs);
}

/**
 * The Oct 27 dashboard's mastery bands (`src/lib/student/mastery.ts`), for screens that only
 * have a band. A band needs some answers, so "no band" with answers is New.
 */
export function levelFromBand(band: ConfidenceBand | null, answered: number): SkillLevel {
  if (answered <= 0) return 0;
  switch (band) {
    case "mastered":
      return 4;
    case "proficient":
      return 3;
    case "developing":
      return 2;
    default:
      return 1;
  }
}

/** How many skills sit at each level. */
export function levelCounts(levels: readonly SkillLevel[]): Record<SkillLevel, number> {
  const counts: Record<SkillLevel, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const l of levels) counts[l] += 1;
  return counts;
}

/** Share of the way to every skill Conquered, from 0 to 1. */
export function levelProgress(levels: readonly SkillLevel[]): number {
  if (levels.length === 0) return 0;
  return levels.reduce<number>((n, l) => n + l, 0) / (levels.length * 4);
}

/** Skills at Understanding or above. */
export function strongCount(levels: readonly SkillLevel[]): number {
  return levels.filter((l) => l >= 3).length;
}

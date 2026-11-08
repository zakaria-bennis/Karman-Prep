/*
 * Skill levels for the student portal (founder, 2026-11-08). The rule itself (New on the first
 * try; runs of 3, then 4 more, then 5 more right answers without a hint; a level lost for every
 * DECAY_DAYS without practice, never below New) lives in one place, `src/lib/levels/rules.ts`.
 * This module only adapts the portal's answer shape to it and adds display helpers.
 *
 * The level names and colours come from `src/components/portal/skill-levels.ts`.
 */
import {
  DECAY_DAYS,
  effective,
  foldAnswers,
  levelFromHistory,
  runToNext,
  type HistoryAnswer,
  type SkillLevel,
} from "@/lib/levels/rules";
import type { ConfidenceBand } from "@/types/quiz";

export type { SkillLevel };
export { DECAY_DAYS, runToNext };

/** One saved answer for a skill. */
export interface LevelAnswer {
  correct: boolean;
  /** When it was answered: an ISO string or epoch milliseconds. */
  at: string | number;
  /** True when the student opened a hint first. Such an answer never counts toward a run. */
  hint?: boolean;
}

const toHistory = (a: LevelAnswer): HistoryAnswer => ({
  correct: a.correct,
  usedHint: !!a.hint,
  at: a.at,
});

/** The level before decay up to now, and the run in progress, from answers in any order. */
export function climb(answers: readonly LevelAnswer[]): { level: SkillLevel; run: number } {
  const state = foldAnswers(answers.map(toHistory));
  return { level: state.level, run: state.run };
}

/** Levels lost to decay since the last answer, floored at New. */
export function decay(level: SkillLevel, lastAnsweredMs: number | null, nowMs: number): SkillLevel {
  return effective(
    {
      level,
      run: 0,
      answered: 0,
      lastPracticedAt: lastAnsweredMs === null ? null : new Date(lastAnsweredMs).toISOString(),
    },
    new Date(nowMs)
  ).level;
}

/** A skill's level from its saved answers, with decay applied. */
export function levelFromAnswers(answers: readonly LevelAnswer[], nowMs = Date.now()): SkillLevel {
  return levelFromHistory(answers.map(toHistory), new Date(nowMs)).level;
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

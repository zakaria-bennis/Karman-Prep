/*
 * Skill levels for the student portal (founder, 2026-11-08): the five levels the portal draws
 * as squares (Not started, New, Learning, Understanding, Conquered).
 *
 * The rule itself (runs of 3, 4 and 5 right answers in a row without a hint, decay after
 * DECAY_WEEKS without practice) lives in one place, `src/lib/levels/rules.ts`. This module only
 * adapts the portal's saved answers to it and adds the portal's counts.
 */
import { clampLevel, type SkillLevel } from "@/components/portal/skill-levels";
import { DECAY_DAYS, decayedLevel, levelFromAnswers as levelAt } from "@/lib/levels/rules";
import type { ConfidenceBand } from "@/types/quiz";

export type { SkillLevel };
export { DECAY_DAYS };

/** One saved answer for a skill. */
export interface LevelAnswer {
  correct: boolean;
  /** When it was answered: an ISO string or epoch milliseconds. */
  at: string | number;
  /** True when the student opened a hint first. Such an answer never counts toward a run. */
  hint?: boolean;
}

const toRecord = (a: LevelAnswer) => ({ correct: a.correct, usedHint: a.hint, at: a.at });

/** A stored level after decay (see `src/lib/levels/rules.ts`). */
export function decay(level: SkillLevel, lastAnsweredMs: number | null, nowMs: number): SkillLevel {
  return decayedLevel(
    clampLevel(level),
    lastAnsweredMs === null ? null : new Date(lastAnsweredMs).toISOString(),
    new Date(nowMs)
  );
}

/** A skill's level from its saved answers, with decay applied. */
export function levelFromAnswers(answers: readonly LevelAnswer[], nowMs = Date.now()): SkillLevel {
  return levelAt(answers.map(toRecord), new Date(nowMs));
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

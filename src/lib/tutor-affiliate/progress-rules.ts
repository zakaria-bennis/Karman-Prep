// Progress at a glance for a tutor's roster: a level per skill from the
// student's practice answers (levels as in src/components/portal/skill-levels.ts),
// and a course percent for the ring. Hints aren't recorded on practice answers yet,
// so every right answer counts toward the run.

import type { SkillLevel } from "@/components/portal/skill-levels";

/** Longest run of right answers in a row: 3 Learning, 4 Understanding, 5 Conquered. */
export function skillLevelFromAnswers(answers: readonly boolean[]): SkillLevel {
  if (!answers.length) return 0;
  let run = 0;
  let best = 0;
  for (const right of answers) {
    run = right ? run + 1 : 0;
    best = Math.max(best, run);
  }
  if (best >= 5) return 4;
  if (best >= 4) return 3;
  if (best >= 3) return 2;
  return 1;
}

/** Share of the way to Conquered across all of a course's skills, 0 to 100. */
export function coursePercent(levels: readonly number[]): number {
  if (!levels.length) return 0;
  const total = levels.reduce((sum, level) => sum + level, 0);
  return Math.round((total / (levels.length * 4)) * 100);
}

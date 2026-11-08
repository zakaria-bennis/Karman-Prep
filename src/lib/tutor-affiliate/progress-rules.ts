// Progress at a glance for a tutor's roster: the course percent for the ring.
// Skill levels come from the one rule in src/lib/levels/rules.ts (levelFromHistory),
// the same the student sees.

/** Share of the way to Conquered across all of a course's skills, 0 to 100. */
export function coursePercent(levels: readonly number[]): number {
  if (!levels.length) return 0;
  const total = levels.reduce((sum, level) => sum + level, 0);
  return Math.round((total / (levels.length * 4)) * 100);
}

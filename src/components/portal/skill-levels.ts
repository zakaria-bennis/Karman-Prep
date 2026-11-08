/*
 * Skill levels (founder, 2026-11-08). An empty outline square means not started. A skill is New
 * once reached on the first try, then a run of right answers in a row moves it up: 3 to
 * Learning, 4 to Understanding, 5 to Conquered. An answer given with a hint does not count
 * toward the run. Mixed check-ins bring old skills back, and a skill drops a level after weeks
 * without practice. The colors are the four shades of the day's painting (see portal.css).
 */

export type SkillLevel = 0 | 1 | 2 | 3 | 4;

export interface SkillLevelInfo {
  level: SkillLevel;
  name: string;
  /** Right answers in a row (without a hint) needed to reach this level. */
  run: number | null;
  /** CSS color of the square. Not started has no fill, only an outline. */
  color: string | null;
}

export const SKILL_LEVELS: readonly SkillLevelInfo[] = [
  { level: 0, name: "Not started", run: null, color: null },
  { level: 1, name: "New", run: null, color: "var(--l1)" },
  { level: 2, name: "Learning", run: 3, color: "var(--l2)" },
  { level: 3, name: "Understanding", run: 4, color: "var(--l3)" },
  { level: 4, name: "Conquered", run: 5, color: "var(--l4)" },
] as const;

export const levelName = (level: number) => SKILL_LEVELS[clampLevel(level)].name;

export function clampLevel(level: number): SkillLevel {
  return Math.max(0, Math.min(4, Math.round(level))) as SkillLevel;
}

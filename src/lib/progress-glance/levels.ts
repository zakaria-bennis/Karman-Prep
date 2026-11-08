/*
 * Progress at a glance, for the people around a student: parents and school staff.
 * Levels follow the one rule in `src/lib/levels/rules.ts` (the same the student sees): New on
 * the first answer, then runs of 3, then 4 more, then 5 more right answers in a row; a level is
 * lost for every 4 weeks without practice, never below New. Practice answers carry no hint
 * flag yet, so every right answer counts toward the run.
 *
 * Only skill names, levels and counts leave this module. Never questions or answers.
 */
import type { SkillLevel } from "@/components/portal/skill-levels";
import { CATALOG_SKILLS, SKILL_DOMAINS } from "@/data/curriculum/skill-catalog";
import { levelFromHistory } from "@/lib/levels/rules";

export interface PracticeAnswer {
  skillId: string;
  correct: boolean;
  /** ISO time the answer was given. */
  at: string;
}

export interface SkillGlance {
  id: string;
  label: string;
  level: SkillLevel;
}

export interface DomainGlance {
  id: string;
  label: string;
  subject: "math" | "reading";
  skills: SkillGlance[];
}

export interface ProgressGlance {
  domains: DomainGlance[];
  /** How many skills sit at each level, across both courses. */
  counts: Record<SkillLevel, number>;
  /** Share of the way to Conquered, 0 to 100, per course. */
  coursePercent: { math: number; reading: number };
}

/** Share of the way to Conquered across a course's skills, 0 to 100. */
export function coursePercent(levels: readonly number[]): number {
  if (!levels.length) return 0;
  const total = levels.reduce((sum, level) => sum + level, 0);
  return Math.round((total / (levels.length * 4)) * 100);
}

export function buildProgressGlance(
  answers: readonly PracticeAnswer[],
  now: Date = new Date()
): ProgressGlance {
  const bySkill = new Map<string, PracticeAnswer[]>();
  for (const a of answers) {
    const list = bySkill.get(a.skillId) ?? [];
    list.push(a);
    bySkill.set(a.skillId, list);
  }
  const levelOf = (skillId: string): SkillLevel =>
    levelFromHistory(
      (bySkill.get(skillId) ?? []).map((a) => ({ correct: a.correct, at: a.at })),
      now
    ).level;
  const counts: Record<SkillLevel, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  const domains: DomainGlance[] = SKILL_DOMAINS.map((d) => ({
    id: d.id,
    label: d.label,
    subject: d.subject,
    skills: CATALOG_SKILLS.filter((s) => s.domainId === d.id).map((s) => {
      const level = levelOf(s.id);
      counts[level] += 1;
      return { id: s.id, label: s.label, level };
    }),
  }));
  const levelsFor = (subject: "math" | "reading") =>
    domains.filter((d) => d.subject === subject).flatMap((d) => d.skills.map((s) => s.level));
  return {
    domains,
    counts,
    coursePercent: {
      math: coursePercent(levelsFor("math")),
      reading: coursePercent(levelsFor("reading")),
    },
  };
}

/** Skills at Understanding or above, out of all, for a short spoken label. */
export function strongCount(domain: DomainGlance): number {
  return domain.skills.filter((s) => s.level >= 3).length;
}

/**
 * One predicted score from a measured range (the diagnostic stores a low and a high): the
 * middle, rounded to the nearest 10 like SAT scores. The founder's rule: never show a range.
 */
export function predictedScore(low: number, high: number): number {
  const mid = (low + high) / 2;
  return Math.max(400, Math.min(1600, Math.round(mid / 10) * 10));
}

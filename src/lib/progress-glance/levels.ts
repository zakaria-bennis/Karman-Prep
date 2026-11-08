/*
 * Progress at a glance, for the people around a student: parents and school staff.
 * Levels follow the founder's rule (src/components/portal/skill-levels.ts): New on the first
 * answer, then a run of 3, 4 and 5 right answers in a row for Learning, Understanding and
 * Conquered. A skill drops one level for every three weeks without practice, never below New.
 * Practice answers carry no hint flag yet, so every right answer counts toward the run.
 *
 * Only skill names, levels and counts leave this module. Never questions or answers.
 */
import type { SkillLevel } from "@/components/portal/skill-levels";
import { CATALOG_SKILLS, SKILL_DOMAINS } from "@/data/curriculum/skill-catalog";

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

export const DECAY_DAYS = 21;
const DAY_MS = 86_400_000;

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

/** One level down for every DECAY_DAYS since the last answer, never below New. */
export function decayed(level: SkillLevel, lastAt: string | null, now: Date): SkillLevel {
  if (level <= 1 || !lastAt) return level;
  const idle = Math.floor((now.getTime() - Date.parse(lastAt)) / (DECAY_DAYS * DAY_MS));
  return Math.max(1, level - Math.max(0, idle)) as SkillLevel;
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
  const levelOf = (skillId: string): SkillLevel => {
    const list = (bySkill.get(skillId) ?? []).slice().sort((x, y) => x.at.localeCompare(y.at));
    const raw = skillLevelFromAnswers(list.map((a) => a.correct));
    return decayed(raw, list.at(-1)?.at ?? null, now);
  };
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

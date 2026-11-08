/*
 * The two Library courses, SAT Math and SAT Reading and Writing, each split into the College
 * Board's Domains, with every skill's level (founder, 2026-11-08). Pure: the page passes the
 * levels in, so the server, the tests and any preview share one rule.
 *
 * "Up next" is the skill with the biggest expected score gain: the skill's share of its section
 * (the Domain's share of the test, split evenly over its skills) times the levels it has left
 * to climb. No reason line is shown for it.
 */
import { CATALOG_SKILLS, SKILL_DOMAINS, type CatalogSkill } from "@/data/curriculum/skill-catalog";
import type { Subject } from "@/data/curriculum/types";
import { levelProgress, strongCount, type SkillLevel } from "./levels";
import { practiceSet } from "./quiz-routes";

/** Approximate share of each section's questions by Domain (College Board test specs). */
export const DOMAIN_SHARE: Record<string, number> = {
  algebra: 0.35,
  advanced_math: 0.35,
  data_analysis: 0.15,
  geometry: 0.15,
  info_ideas: 0.26,
  craft_structure: 0.28,
  expression_ideas: 0.2,
  conventions: 0.26,
};

export interface CourseSkill {
  id: string;
  label: string;
  level: SkillLevel;
}

export interface CourseDomain {
  id: string;
  label: string;
  skills: CourseSkill[];
  /** Skills at Understanding or above. */
  strong: number;
  progress: number;
}

export interface Course {
  subject: Subject;
  slug: "math" | "reading-writing";
  name: string;
  domains: CourseDomain[];
  /** From 0 to 1: the share of the way to every skill Conquered. */
  progress: number;
  strong: number;
  total: number;
  upNext: (CourseSkill & { domainId: string }) | null;
}

export const COURSE_NAMES: Record<Subject, string> = {
  math: "SAT Math",
  reading: "SAT Reading and Writing",
};

export const courseSlug = (subject: Subject): Course["slug"] =>
  subject === "math" ? "math" : "reading-writing";

export const subjectFromSlug = (slug: string): Subject | null =>
  slug === "math" ? "math" : slug === "reading-writing" ? "reading" : null;

function skillsIn(domainId: string): CatalogSkill[] {
  return CATALOG_SKILLS.filter((s) => s.domainId === domainId);
}

/** Expected score gain from taking a skill to Conquered, in arbitrary but comparable units. */
export function scoreGain(domainId: string, level: SkillLevel): number {
  const share = DOMAIN_SHARE[domainId] ?? 0.2;
  const count = Math.max(1, skillsIn(domainId).length);
  return (share / count) * (4 - level);
}

export function buildCourse(subject: Subject, levels: ReadonlyMap<string, SkillLevel>): Course {
  const domains: CourseDomain[] = SKILL_DOMAINS.filter((d) => d.subject === subject).map((d) => {
    const skills = skillsIn(d.id).map((s) => ({
      id: s.id,
      label: s.label,
      level: levels.get(s.id) ?? 0,
    }));
    const lv = skills.map((s) => s.level);
    return {
      id: d.id,
      label: d.label,
      skills,
      strong: strongCount(lv),
      progress: levelProgress(lv),
    };
  });
  const all = domains.flatMap((d) => d.skills.map((s) => ({ ...s, domainId: d.id })));
  const lv = all.map((s) => s.level);
  let upNext: Course["upNext"] = null;
  let best = 0;
  for (const s of all) {
    const gain = scoreGain(s.domainId, s.level);
    if (gain > best + 1e-9) {
      best = gain;
      upNext = s;
    }
  }
  return {
    subject,
    slug: courseSlug(subject),
    name: COURSE_NAMES[subject],
    domains,
    progress: levelProgress(lv),
    strong: strongCount(lv),
    total: all.length,
    upNext,
  };
}

/** Where a skill's practice set opens (the quiz flows' 10-question set; see quiz-routes.ts). */
export const practiceHref = (skillId: string) => practiceSet(skillId).path;

/** A tutor's assigned set with fixed questions opens in catalog practice, which serves them. */
export const assignedSetHref = (skillId: string, assignmentId: string) =>
  `/learn/practice/${encodeURIComponent(skillId)}?assignment=${encodeURIComponent(assignmentId)}`;

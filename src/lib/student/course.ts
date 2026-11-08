/*
 * The two Library courses, SAT Math and SAT Reading and Writing, each split into the College
 * Board's Domains. Inside each Domain the official skills are headings and their sub-skills are
 * the squares (founder, 2026-11-08: about 90 sub-skills, see src/lib/subskills/). Pure: the page
 * passes the levels (by sub-skill id) and the weights in, so the server, the tests and any
 * preview share one rule.
 *
 * "Up next" is the sub-skill with the biggest expected score gain: its Domain's share of the
 * test, times the sub-skill's share of the Domain (by how many questions of that type the bank
 * holds, a stand-in for how often the test asks it), times the levels it has left to climb.
 * No reason line is shown for it.
 */
import { SKILL_DOMAINS } from "@/data/curriculum/skill-catalog";
import type { Subject } from "@/data/curriculum/types";
import { officialSkillsIn, subSkillTitle } from "@/lib/subskills/taxonomy";
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

/** One square: a sub-skill. */
export interface CourseSkill {
  id: string;
  label: string;
  level: SkillLevel;
}

/** An official College Board skill, shown as a heading over its sub-skills. */
export interface CourseOfficial {
  id: string;
  label: string;
  skills: CourseSkill[];
}

export interface CourseDomain {
  id: string;
  label: string;
  officials: CourseOfficial[];
  /** Every sub-skill in the Domain, in order. */
  skills: CourseSkill[];
  /** Sub-skills at Understanding or above. */
  strong: number;
  progress: number;
}

export interface Course {
  subject: Subject;
  slug: "math" | "reading-writing";
  name: string;
  domains: CourseDomain[];
  /** From 0 to 1: the share of the way to every sub-skill Conquered. */
  progress: number;
  strong: number;
  total: number;
  upNext: (CourseSkill & { domainId: string; title: string }) | null;
}

/** How much a sub-skill weighs inside its Domain; the page passes question counts. */
export type SubSkillWeight = (subSkillId: string) => number;

export const COURSE_NAMES: Record<Subject, string> = {
  math: "SAT Math",
  reading: "SAT Reading and Writing",
};

export const courseSlug = (subject: Subject): Course["slug"] =>
  subject === "math" ? "math" : "reading-writing";

export const subjectFromSlug = (slug: string): Subject | null =>
  slug === "math" ? "math" : slug === "reading-writing" ? "reading" : null;

/** Expected score gain from taking a sub-skill to Conquered, in comparable units. */
export function scoreGain(domainId: string, share: number, level: SkillLevel): number {
  return (DOMAIN_SHARE[domainId] ?? 0.2) * share * (4 - level);
}

export function buildCourse(
  subject: Subject,
  levels: ReadonlyMap<string, SkillLevel>,
  weight: SubSkillWeight = () => 1
): Course {
  const domains: CourseDomain[] = SKILL_DOMAINS.filter((d) => d.subject === subject).map((d) => {
    const officials = officialSkillsIn(d.id).map((o) => ({
      id: o.id,
      label: o.label,
      skills: o.subSkills.map((s) => ({ id: s.id, label: s.label, level: levels.get(s.id) ?? 0 })),
    }));
    const skills = officials.flatMap((o) => o.skills);
    const lv = skills.map((s) => s.level);
    return {
      id: d.id,
      label: d.label,
      officials,
      skills,
      strong: strongCount(lv),
      progress: levelProgress(lv),
    };
  });
  let upNext: Course["upNext"] = null;
  let best = 0;
  for (const d of domains) {
    const total = d.skills.reduce((n, s) => n + Math.max(0, weight(s.id)), 0) || 1;
    for (const s of d.skills) {
      const gain = scoreGain(d.id, Math.max(0, weight(s.id)) / total, s.level);
      if (gain > best + 1e-9) {
        best = gain;
        upNext = { ...s, domainId: d.id, title: subSkillTitle(s.id) ?? s.label };
      }
    }
  }
  const lv = domains.flatMap((d) => d.skills.map((s) => s.level));
  return {
    subject,
    slug: courseSlug(subject),
    name: COURSE_NAMES[subject],
    domains,
    progress: levelProgress(lv),
    strong: strongCount(lv),
    total: lv.length,
    upNext,
  };
}

/** Where a skill's practice set opens (the quiz flows' 10-question set; see quiz-routes.ts). */
export const practiceHref = (skillId: string) => practiceSet(skillId).path;

/** A tutor's assigned set with fixed questions opens in catalog practice, which serves them. */
export const assignedSetHref = (skillId: string, assignmentId: string) =>
  `/learn/practice/${encodeURIComponent(skillId)}?assignment=${encodeURIComponent(assignmentId)}`;

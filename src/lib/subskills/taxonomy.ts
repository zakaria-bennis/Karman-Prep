/*
 * The sub-skill tree the portals show (founder, 2026-11-08): Domain, then the official College
 * Board skill as a heading, then its sub-skills as squares. Math and Reading and Writing stay
 * separate. Pure data, safe on the client.
 *
 * A catalog skill with one sub-skill keeps its own id as the sub-skill id, so levels saved
 * against it before sub-skills existed still count. That covers the 12 Standard English
 * Conventions skills (each one sub-skill, under Boundaries or Form, Structure, and Sense) and
 * the two smallest data skills.
 */
import { CATALOG_SKILLS, SKILL_DOMAINS, type CatalogSkill } from "@/data/curriculum/skill-catalog";
import type { Subject } from "@/data/curriculum/types";
import { SEC_OFFICIAL, SUB_SKILL_RULES } from "./rules";

export interface SubSkill {
  id: string;
  label: string;
  /** The catalog skill whose questions it splits (the pool and the tags use this id). */
  skillId: string;
  /** The official College Board skill it sits under (a heading). */
  officialId: string;
  officialLabel: string;
  domainId: string;
  subject: Subject;
}

export interface OfficialSkill {
  id: string;
  label: string;
  domainId: string;
  subSkills: SubSkill[];
}

export const subSkillId = (skillId: string, key: string, single: boolean) =>
  single ? skillId : `${skillId}--${key}`;

function officialOf(skill: CatalogSkill) {
  const sec = skill.backgroundMapping ? SEC_OFFICIAL[skill.backgroundMapping] : undefined;
  return sec ?? { id: skill.id, label: skill.label };
}

export const SUB_SKILLS: SubSkill[] = CATALOG_SKILLS.flatMap((skill) => {
  const rules = SUB_SKILL_RULES[skill.id] ?? [{ key: "all", label: skill.label }];
  const single = rules.length === 1;
  const official = officialOf(skill);
  return rules.map((r) => ({
    id: subSkillId(skill.id, r.key, single),
    label: single ? skill.label : r.label,
    skillId: skill.id,
    officialId: official.id,
    officialLabel: official.label,
    domainId: skill.domainId,
    subject: skill.subject,
  }));
});

const BY_ID = new Map(SUB_SKILLS.map((s) => [s.id, s]));
const SKILL_LABEL = new Map(CATALOG_SKILLS.map((s) => [s.id, s.label]));

/** A sub-skill's full name for titles and results: "Transitions: Contrast". */
export function subSkillTitle(id: string): string | undefined {
  const s = BY_ID.get(id);
  if (!s) return undefined;
  const parent = SKILL_LABEL.get(s.skillId) ?? s.label;
  return s.id === s.skillId ? s.label : `${parent}: ${s.label}`;
}

export const getSubSkill = (id: string) => BY_ID.get(id);
export const isSubSkillId = (id: string) => BY_ID.has(id);

/** The sub-skills of one catalog skill, in order. */
export const subSkillsOfSkill = (skillId: string) =>
  SUB_SKILLS.filter((s) => s.skillId === skillId);

/** A catalog skill's catch-all sub-skill: where a question not in the map goes. */
export function fallbackSubSkill(skillId: string): string {
  const list = subSkillsOfSkill(skillId);
  return list[list.length - 1]?.id ?? skillId;
}

/** The official skills of a Domain, each with its sub-skills, in catalog order. */
export function officialSkillsIn(domainId: string): OfficialSkill[] {
  const out: OfficialSkill[] = [];
  for (const s of SUB_SKILLS) {
    if (s.domainId !== domainId) continue;
    let o = out.find((x) => x.id === s.officialId);
    if (!o) {
      o = { id: s.officialId, label: s.officialLabel, domainId, subSkills: [] };
      out.push(o);
    }
    o.subSkills.push(s);
  }
  return out;
}

export const subSkillsIn = (subject: Subject) => SUB_SKILLS.filter((s) => s.subject === subject);

export const SUB_SKILL_DOMAINS = SKILL_DOMAINS;

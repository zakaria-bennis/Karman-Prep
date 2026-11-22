/*
 * Where a generated question sits in the bank: its 72-skill id (the question_skills72 binding,
 * Bank stream, 2026-11-22), and the 39-skill catalog skill, domain and topic cluster the
 * student pools still filter on (fetchCatalogQuestionPool). The catalog skill comes from the
 * portal's bridge (src/lib/portal/skill-bridge.ts): the catalog skill of the first sub-skill
 * each of the 72 reads, so generated questions land in the same pool as the real ones.
 */
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import { BRIDGE } from "@/lib/portal/skill-bridge";
import { clusterLabelsForDomain, type SATDomain } from "@/lib/question-bank/taxonomy";
import { skill72 } from "@/lib/skills/ids72";

export interface Placement {
  skill72: string;
  skill72Name: string;
  catalogSkillId: string;
  subject: "math" | "reading";
  domainId: string;
  domainLabel: string;
  skillLabel: string;
  topicCluster: string;
}

export function placementFor(skill72Id: string): Placement {
  const skill = skill72(skill72Id);
  if (!skill) throw new Error(`unknown 72-skill id ${skill72Id}`);
  const first = BRIDGE[skill.name]?.[0];
  if (!first) throw new Error(`no bridge entry for ${skill.name}`);
  const catalogId = first.split("--")[0];
  const catalog = CATALOG_SKILLS.find((c) => c.id === catalogId);
  if (!catalog) throw new Error(`bridge names unknown catalog skill ${catalogId}`);
  const cluster = clusterLabelsForDomain(catalog.domainId as SATDomain)[0];
  if (!cluster) throw new Error(`no topic cluster for ${catalog.domainId}`);
  return {
    skill72: skill.id,
    skill72Name: skill.name,
    catalogSkillId: catalog.id,
    subject: catalog.subject === "math" ? "math" : "reading",
    domainId: catalog.domainId,
    domainLabel: catalog.domainLabel,
    skillLabel: catalog.label,
    topicCluster: cluster,
  };
}

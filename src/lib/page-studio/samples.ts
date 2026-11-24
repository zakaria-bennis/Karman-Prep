// Fixed example values for pages that need one in their address (a skill, a domain, exam 1), so
// every quiz page opens on something real. Taken from the site's own lists, never invented.
import { CATALOG_SKILLS, SKILL_DOMAINS } from "@/data/curriculum/skill-catalog";
import { RW_NODES } from "@/data/curriculum";
import { SUB_SKILLS } from "@/lib/subskills/taxonomy";
import { SKILLS72 } from "@/lib/skills/ids72";
import type { SampleKey } from "./inventory";

export function sampleValues(): Record<SampleKey, string> {
  return {
    subSkill: SUB_SKILLS[0]?.id ?? "",
    catalogSkill: CATALOG_SKILLS[0]?.id ?? "",
    skill72: SKILLS72[0]?.id ?? "",
    domain: SKILL_DOMAINS[0]?.id ?? "",
    examForm: "1",
    rwNode: RW_NODES[0]?.id ?? "",
  };
}

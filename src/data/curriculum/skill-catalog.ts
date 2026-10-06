import approved from "./approved-skill-taxonomy.json";
import type { Subject } from "./types";

export interface CatalogSkill {
  id: string;
  subject: Subject;
  domainId: string;
  domainLabel: string;
  label: string;
  backgroundMapping?: string;
}

const domainIds: Record<string, string> = {
  "Information and Ideas": "info_ideas",
  "Craft and Structure": "craft_structure",
  "Expression of Ideas": "expression_ideas",
  "Standard English Conventions": "conventions",
  Algebra: "algebra",
  "Advanced Math": "advanced_math",
  "Problem-Solving and Data Analysis": "data_analysis",
  "Geometry and Trigonometry": "geometry",
};

/** Display identities are deliberately separate from persisted legacy node IDs. */
export function catalogSkillId(subject: Subject, label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${subject === "reading" ? "rw" : "ma"}-skill-${slug}`;
}

export const SKILL_DOMAINS = approved.domains.map((domain) => ({
  id: domainIds[domain.label],
  subject: (domain.section === "Math" ? "math" : "reading") as Subject,
  label: domain.label,
}));

export const CATALOG_SKILLS: CatalogSkill[] = approved.domains.flatMap((domain) => {
  const subject: Subject = domain.section === "Math" ? "math" : "reading";
  return domain.skills
    .filter((skill) => skill.selectable)
    .map((skill) => ({
      id: catalogSkillId(subject, skill.label),
      subject,
      domainId: domainIds[domain.label],
      domainLabel: domain.label,
      label: skill.label,
      backgroundMapping:
        "background_mapping" in skill && typeof skill.background_mapping === "string"
          ? skill.background_mapping
          : undefined,
    }));
});

export function getCatalogSkills(subject: Subject): CatalogSkill[] {
  return CATALOG_SKILLS.filter((skill) => skill.subject === subject);
}

/** Coordinates only: retain the existing equal lobe geometry, with no mastery weights or tiers. */
export function getCatalogPositions(subject: Subject): Map<string, { x: number; y: number }> {
  const skills = getCatalogSkills(subject);
  let sx = subject === "reading" ? 0.31 : 0.67;
  let sy = subject === "reading" ? 0.23 : 0.41;
  return new Map(
    skills.map((skill) => {
      sx = (sx + 0.7548776662466927) % 1;
      sy = (sy + 0.5698402909980532) % 1;
      const yFraction = -0.82 + sy * 1.64;
      const xOffset = 0.17 * Math.sqrt(1 - yFraction * yFraction) * 0.9;
      return [
        skill.id,
        {
          x: (subject === "reading" ? 0.29 : 0.71) + (2 * sx - 1) * xOffset,
          y: 0.5 + yFraction * 0.38,
        },
      ];
    })
  );
}

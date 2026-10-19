import { describe, expect, it } from "vitest";
import approved from "./approved-skill-taxonomy.json";
import { MATH_NODES, RW_NODES, LOBE_LAYOUT } from "./index";
import {
  CATALOG_SKILLS,
  SKILL_DOMAINS,
  getCatalogSkills,
  getCatalogPositions,
} from "./skill-catalog";
import {
  LEGACY_SKILL_CROSSWALK,
  getCoveredLegacyNodes,
  getLegacySkillMapping,
} from "./legacy-skill-crosswalk";
import { quizNodeIdSchema } from "@/app/learn/quiz-action-schemas";

describe("approved 39-skill catalog compatibility", () => {
  it("retains the exact approved labels/order and excludes both broad grammar backgrounds", () => {
    expect(CATALOG_SKILLS.map((s) => s.label)).toEqual(
      approved.domains.flatMap((d) => d.skills.filter((s) => s.selectable).map((s) => s.label))
    );
    expect(CATALOG_SKILLS).toHaveLength(39);
    expect(getCatalogSkills("reading")).toHaveLength(20);
    expect(getCatalogSkills("math")).toHaveLength(19);
    expect(SKILL_DOMAINS).toHaveLength(8);
    expect(CATALOG_SKILLS.filter((s) => s.backgroundMapping)).toHaveLength(12);
    expect(CATALOG_SKILLS.some((s) => approved.background_only_skills.includes(s.label))).toBe(
      false
    );
    expect(new Set(CATALOG_SKILLS.map((s) => s.id)).size).toBe(39);
  });

  it("never sends display IDs to the persisted legacy quiz contract", () => {
    expect(CATALOG_SKILLS.every((s) => !quizNodeIdSchema.safeParse(s.id).success)).toBe(true);
    expect(RW_NODES).toHaveLength(49);
    expect(MATH_NODES).toHaveLength(40);
    expect(
      [...RW_NODES, ...MATH_NODES].every((n) => quizNodeIdSchema.safeParse(n.id).success)
    ).toBe(true);
  });

  it("accounts for every legacy identity once and cannot route an ambiguous pool", () => {
    const legacyIds = [...RW_NODES, ...MATH_NODES].map((n) => n.id).sort();
    expect(LEGACY_SKILL_CROSSWALK.map((r) => r.legacyNodeId).sort()).toEqual(legacyIds);
    expect(new Set(LEGACY_SKILL_CROSSWALK.map((r) => r.legacyNodeId)).size).toBe(89);
    for (const row of LEGACY_SKILL_CROSSWALK) {
      expect(row.reason.length).toBeGreaterThan(15);
      if (row.status !== "covered") expect(row.targetSkillId).toBeNull();
      for (const id of [
        ...row.candidateSkillIds,
        ...(row.targetSkillId ? [row.targetSkillId] : []),
      ]) {
        const skill = CATALOG_SKILLS.find((s) => s.id === id);
        expect(skill).toBeDefined();
        expect(skill?.subject).toBe(row.legacyNodeId.startsWith("rw-") ? "reading" : "math");
      }
    }
    expect(getLegacySkillMapping("rw-51")?.status).toBe("review");
    expect(getLegacySkillMapping("rw-59")?.candidateSkillIds).toHaveLength(3);
    expect(getLegacySkillMapping("ma-49")?.status).toBe("outside_catalog");
    expect(
      CATALOG_SKILLS.flatMap((s) => getCoveredLegacyNodes(s.id)).some((n) => n.id === "rw-51")
    ).toBe(false);
    expect(getLegacySkillMapping("unknown")).toBeUndefined();
  });

  it("keeps both subjects in their existing equal lobe geometry without a mastery model", () => {
    for (const subject of ["reading", "math"] as const) {
      const positions = getCatalogPositions(subject);
      expect(positions.size).toBe(subject === "reading" ? 20 : 19);
      for (const position of positions.values()) {
        const dx = (position.x - LOBE_LAYOUT[subject].cx) / LOBE_LAYOUT.rx;
        const dy = (position.y - LOBE_LAYOUT.cy) / LOBE_LAYOUT.ry;
        expect(dx * dx + dy * dy).toBeLessThanOrEqual(1);
      }
      expect(getCatalogPositions(subject)).toEqual(positions);
    }
    expect(
      CATALOG_SKILLS.every((s) => !("weight" in s) && !("mastery" in s) && !("tier" in s))
    ).toBe(true);
  });
});

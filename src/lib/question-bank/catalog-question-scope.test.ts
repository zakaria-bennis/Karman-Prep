import { describe, expect, it } from "vitest";
import { approvedCatalogEvidence, catalogSkillId } from "../../../tests/fixtures/approved-catalog";
import { catalogPoolInputSchema, readCatalogQuestionScope } from "./catalog-question-scope";

describe("canonical skill evidence read contract", () => {
  it("reads both official and generated envelopes and retains the private-publication hold", () => {
    const evidence = approvedCatalogEvidence("held", false);
    for (const value of [evidence, { kind: "independently_confirmed_generated", evidence }]) {
      const scope = readCatalogQuestionScope(value);
      expect(scope.skill.id).toBe(catalogSkillId);
      expect(scope.publicationAllowed).toBe(false);
    }
    expect(readCatalogQuestionScope(approvedCatalogEvidence()).publicationAllowed).toBe(true);
  });

  it("rejects a different content version, question identity, domain or uncertain D review", () => {
    const evidence = approvedCatalogEvidence();
    for (const changed of [
      { ...evidence, B_student_sha256: "e".repeat(64) },
      { ...evidence, question_id: "other-question" },
      { ...evidence, approved_tags: { ...evidence.approved_tags, catalog_domain_id: "geometry" } },
      { ...evidence, D_original_record: { ...evidence.D_original_record, uncertain: true } },
    ])
      expect(() => readCatalogQuestionScope(changed)).toThrow(/differs/);
  });

  it("rejects ambiguous envelopes and never converts an old slug to a canonical skill", () => {
    const evidence = approvedCatalogEvidence();
    expect(() =>
      readCatalogQuestionScope({
        kind: "independently_confirmed_generated",
        evidence,
        approved_tags: evidence.approved_tags,
      })
    ).toThrow(/ambiguous/);
    expect(() =>
      readCatalogQuestionScope({ concept_slug: "linear-equations-one-variable" })
    ).toThrow(/unavailable/);
    expect(catalogPoolInputSchema.safeParse({ skillId: "ma-00" }).success).toBe(false);
    expect(
      catalogPoolInputSchema.safeParse({ skillId: `${catalogSkillId},is_live.eq.false` }).success
    ).toBe(false);
    expect(
      catalogPoolInputSchema.safeParse({
        skillId: catalogSkillId,
        minimumDifficulty: 6,
        maximumDifficulty: 2,
      }).success
    ).toBe(false);
  });
});

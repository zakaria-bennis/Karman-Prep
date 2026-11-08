/*
 * Server only. Reads the catalog pools for a set of skills and keeps only what passes the
 * shared eligibility check: `fetchCatalogQuestionPool`, then `admitCatalogPool`
 * (readCatalogQuestionScope plus the catalogQuestionPayloadHash seal). Nothing here writes to
 * the question bank or keeps a hard-coded list of questions.
 */
import { createHash } from "node:crypto";
import { CATALOG_SKILLS, type CatalogSkill } from "@/data/curriculum/skill-catalog";
import { admitCatalogPool } from "@/lib/catalog-practice/session";
import type { CatalogDeliverySnapshot } from "@/lib/catalog-practice/delivery-contract";
import { loadCatalogQuestionEvidence } from "@/lib/catalog-practice/supabase-store";
import { fetchCatalogQuestionPool } from "@/lib/supabase/queries/catalog-question-pool";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import type { BankItem, Section } from "./forms";

/** Known bad rows that must stay unserved (brief: bcdb21e4 fails to render). */
const HELD_BACK_PREFIXES = ["bcdb21e4"];

const normalise = (text: string | null | undefined) =>
  (text ?? "").toLowerCase().replace(/\s+/g, " ").trim();

/** comparison_key when the row has one, else a hash of the normalised passage and question. */
export function questionFamily(question: QuizQuestionWithChoices): string {
  const key = (question as QuizQuestionWithChoices & { comparison_key?: string | null })
    .comparison_key;
  if (key) return key;
  const text = [question.passage, question.question_text].map(normalise).join("\n");
  return `text:${createHash("sha256").update(text).digest("hex")}`;
}

export type AdmittedBank = {
  items: BankItem[];
  snapshots: Map<string, CatalogDeliverySnapshot>;
};

const sectionOf = (skill: CatalogSkill): Section => (skill.subject === "math" ? "math" : "reading");

/** Admitted questions for each skill, at most `maxDifficulty`. One bad skill never breaks the rest. */
export async function loadAdmittedBank(
  skillIds: readonly string[],
  maxDifficulty: number
): Promise<AdmittedBank> {
  const items: BankItem[] = [];
  const snapshots = new Map<string, CatalogDeliverySnapshot>();
  const skills = CATALOG_SKILLS.filter((skill) => skillIds.includes(skill.id));
  const loaded = await Promise.all(
    skills.map(async (skill) => {
      try {
        const pool = (
          await fetchCatalogQuestionPool({
            skillId: skill.id,
            minimumDifficulty: 1,
            maximumDifficulty: maxDifficulty,
          })
        ).filter((row) => !HELD_BACK_PREFIXES.some((prefix) => row.id.startsWith(prefix)));
        const admitted = admitCatalogPool(
          skill.id,
          pool,
          await loadCatalogQuestionEvidence(pool.map((row) => row.id))
        );
        const byId = new Map(pool.map((row) => [row.id, row]));
        return { skill, admitted, byId };
      } catch (error) {
        console.error(`[assembler] skill ${skill.id} could not be loaded`, error);
        return { skill, admitted: [], byId: new Map<string, QuizQuestionWithChoices>() };
      }
    })
  );
  for (const { skill, admitted, byId } of loaded) {
    for (const snapshot of admitted) {
      const row = byId.get(snapshot.binding.questionId);
      if (!row) continue;
      snapshots.set(snapshot.binding.questionId, snapshot);
      items.push({
        id: snapshot.binding.questionId,
        skillId: skill.id,
        domainId: skill.domainId,
        section: sectionOf(skill),
        difficulty: snapshot.student.difficulty_level,
        family: questionFamily(row),
      });
    }
  }
  return { items, snapshots };
}

export function skillsInSection(section: Section): string[] {
  return CATALOG_SKILLS.filter((skill) => sectionOf(skill) === section).map((skill) => skill.id);
}

export function skillsInDomain(domainId: string): string[] {
  return CATALOG_SKILLS.filter((skill) => skill.domainId === domainId).map((skill) => skill.id);
}

export function catalogSkill(skillId: string): CatalogSkill | undefined {
  return CATALOG_SKILLS.find((skill) => skill.id === skillId);
}

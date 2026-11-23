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
import { createAdminClient } from "@/lib/supabase/server";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import type { BankItem, Section } from "./forms";

/** Known bad rows that must stay unserved (brief: bcdb21e4 fails to render). */
const HELD_BACK_PREFIXES = ["bcdb21e4"];
const LOAD_AT_ONCE = 4;

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
  maxDifficulty: number,
  /** Core plans read only the Practice plan's fixed set (QuizAccess.practiceSet). */
  practiceSet = false,
  /** Only these questions of each skill (a sampled pool, src/lib/play/server/pool72.ts). */
  onlyIds?: ReadonlyMap<string, readonly string[]>
): Promise<AdmittedBank> {
  const items: BankItem[] = [];
  const snapshots = new Map<string, CatalogDeliverySnapshot>();
  const skills = CATALOG_SKILLS.filter((skill) => skillIds.includes(skill.id));
  const loadSkill = async (skill: CatalogSkill) => {
    const pool = (
      await fetchCatalogQuestionPool(
        { skillId: skill.id, minimumDifficulty: 1, maximumDifficulty: maxDifficulty },
        "practice",
        { practiceSet, onlyIds: onlyIds?.get(skill.id) ?? (onlyIds ? [] : undefined) }
      )
    ).filter((row) => !HELD_BACK_PREFIXES.some((prefix) => row.id.startsWith(prefix)));
    const admitted = admitCatalogPool(
      skill.id,
      pool,
      await loadCatalogQuestionEvidence(pool.map((row) => row.id))
    );
    return { skill, admitted, byId: new Map(pool.map((row) => [row.id, row])) };
  };
  // A few skills at a time, each retried once: a busy database must not empty a whole section.
  const loaded: Awaited<ReturnType<typeof loadSkill>>[] = [];
  for (let i = 0; i < skills.length; i += LOAD_AT_ONCE) {
    loaded.push(
      ...(await Promise.all(
        skills.slice(i, i + LOAD_AT_ONCE).map(async (skill) => {
          for (let attempt = 1; ; attempt++) {
            try {
              return await loadSkill(skill);
            } catch (error) {
              if (attempt < 2) continue;
              console.error(`[assembler] skill ${skill.id} could not be loaded`, error);
              return { skill, admitted: [], byId: new Map<string, QuizQuestionWithChoices>() };
            }
          }
        })
      ))
    );
  }
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

/** Up to `count` reviewed questions of one catalog skill, from a random place in question-id order,
 *  wrapping round: ids only, so no question text or evidence is read to choose them. */
async function sampleCatalogSkill(skill: CatalogSkill, count: number, from: string) {
  const filter = [
    `raw_model_response->approved_tags->>catalog_skill_id.eq.${skill.id}`,
    `raw_model_response->evidence->approved_tags->>catalog_skill_id.eq.${skill.id}`,
  ].join(",");
  const read = async (after: boolean, limit: number) => {
    const q = createAdminClient().from("answer_key_entries").select("question_id").or(filter);
    const { data, error } = await (after ? q.gte("question_id", from) : q.lt("question_id", from))
      .order("question_id", { ascending: true })
      .limit(limit);
    if (error) throw new Error("Reviewed skill questions could not be loaded");
    return ((data ?? []) as { question_id: string | null }[]).flatMap((r) =>
      r.question_id ? [r.question_id] : []
    );
  };
  const first = await read(true, count);
  return first.length < count ? [...first, ...(await read(false, count - first.length))] : first;
}

/** Like loadAdmittedBank, but only a sample of each skill (`perSkill`, drawn fresh each call): for
 *  a run that uses a few questions a skill, where reading every question of every skill took
 *  seconds (the Daily 10 read 20,000 to pick ten). */
export async function loadAdmittedSample(
  skillIds: readonly string[],
  maxDifficulty: number,
  practiceSet: boolean,
  perSkill: number
): Promise<AdmittedBank> {
  const from = crypto.randomUUID();
  const skills = CATALOG_SKILLS.filter((skill) => skillIds.includes(skill.id));
  const only = new Map<string, string[]>();
  for (let i = 0; i < skills.length; i += 8) {
    const batch = skills.slice(i, i + 8);
    const ids = await Promise.all(
      batch.map((skill) => sampleCatalogSkill(skill, perSkill, from).catch(() => [] as string[]))
    );
    batch.forEach((skill, k) => only.set(skill.id, ids[k]));
  }
  return loadAdmittedBank(
    skills.map((s) => s.id),
    maxDifficulty,
    practiceSet,
    only
  );
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

/*
 * Server only. The questions behind one or more of the 72 skills, each filed under one of them.
 *
 * When the Bank stream has tagged a skill (question_skills72, migration 20261122010000), its tagged
 * questions are its pool. Until then the bridge decides (src/lib/portal/skill-bridge.ts): a question
 * belongs to every 72-skill that reads its sub-skill. Either way the questions come through the same
 * admission check every practice pool uses (loadAdmittedBank), so held-back exam questions and broken
 * ones stay out exactly as they do elsewhere. Generated questions come in the same way once the
 * Generator stream admits them to practice.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { loadAdmittedBank } from "@/lib/assembler/bank";
import type { BankItem } from "@/lib/assembler/forms";
import type { CatalogDeliverySnapshot } from "@/lib/catalog-practice/delivery-contract";
import { stableHash } from "@/lib/catalog-practice/picker";
import { BRIDGE } from "@/lib/portal/skill-bridge";
import { SKILLS72, skill72, type Skill72 } from "@/lib/skills/ids72";
import { subSkillOfQuestion } from "@/lib/subskills/map";

const db = () => createAdminClient() as unknown as SupabaseClient;

export type Item72 = BankItem & { skill72: string; domain72: string };
export type Pool72 = { items: Item72[]; snapshots: Map<string, CatalogDeliverySnapshot> };

/** The catalog skill a bridge entry belongs to ("ma-skill-circles--measure" to "ma-skill-circles"). */
const catalogOf = (sub: string) => sub.split("--")[0];

/** A question's 72-skill by the bridge: the first of `among` that reads its sub-skill. */
export function bridged72(
  questionId: string,
  catalogSkillId: string,
  among: readonly Skill72[] = SKILLS72
): Skill72 | null {
  const sub = subSkillOfQuestion(questionId, catalogSkillId);
  const readers = among.filter((s) => {
    const subs = BRIDGE[s.name] ?? [];
    return subs.includes(sub) || subs.includes(catalogSkillId);
  });
  if (!readers.length) return null;
  // a sub-skill two of them share is split between them, the same way every time
  return readers[stableHash(`72:${questionId}`) % readers.length] ?? readers[0];
}

/** Tagged questions for these skills, or null while the Bank has tagged none of them. */
async function tagged(ids: readonly string[]): Promise<Map<string, string> | null> {
  const out = new Map<string, string>();
  const { data, error } = await db()
    .from("question_skills72")
    .select("question_id, skill_id")
    .in("skill_id", ids as string[])
    .limit(20000)
    .then(
      (r) => r,
      () => ({ data: null, error: true })
    );
  if (error || !data || !data.length) return null;
  for (const r of data as { question_id: string; skill_id: string }[])
    out.set(r.question_id, r.skill_id);
  return out;
}

/** The catalog skills the tagged questions were filed under, read in small batches. */
async function catalogSkillsOf(questionIds: readonly string[]): Promise<Set<string>> {
  const out = new Set<string>();
  for (let i = 0; i < questionIds.length; i += 150) {
    const { data } = await db()
      .from("answer_key_entries")
      .select(
        "a:raw_model_response->approved_tags->>catalog_skill_id, b:raw_model_response->evidence->approved_tags->>catalog_skill_id"
      )
      .in("question_id", questionIds.slice(i, i + 150) as string[])
      .then(
        (r) => r,
        () => ({ data: null })
      );
    for (const r of (data ?? []) as { a: string | null; b: string | null }[]) {
      if (r.a) out.add(r.a);
      if (r.b) out.add(r.b);
    }
  }
  return out;
}

/** Every admitted question behind `skillIds` (72-skill ids), filed under one of them. */
export async function pool72(skillIds: readonly string[], maxDifficulty: number): Promise<Pool72> {
  const skills = skillIds.map((id) => skill72(id)).filter((s): s is Skill72 => !!s);
  if (!skills.length) return { items: [], snapshots: new Map() };
  const tags = await tagged(skills.map((s) => s.id));
  const catalog = new Set(skills.flatMap((s) => (BRIDGE[s.name] ?? []).map(catalogOf)));
  if (tags) for (const id of await catalogSkillsOf([...tags.keys()])) catalog.add(id);
  const bank = await loadAdmittedBank([...catalog], maxDifficulty);
  const byId = new Map(skills.map((s) => [s.id, s]));
  const items: Item72[] = [];
  for (const item of bank.items) {
    const skill = tags
      ? byId.get(tags.get(item.id) ?? "")
      : bridged72(item.id, item.skillId, skills);
    if (!skill) continue;
    items.push({ ...item, skill72: skill.id, domain72: skill.domain });
  }
  return { items, snapshots: bank.snapshots };
}

/** A question's 72-skill for results (any of the 72), by its tag when there is one, else the bridge. */
export async function skills72Of(
  questions: readonly { questionId: string; catalogSkillId: string }[]
): Promise<Map<string, Skill72>> {
  const out = new Map<string, Skill72>();
  if (!questions.length) return out;
  const { data } = await db()
    .from("question_skills72")
    .select("question_id, skill_id")
    .in(
      "question_id",
      questions.map((q) => q.questionId)
    )
    .then(
      (r) => r,
      () => ({ data: null })
    );
  const tags = new Map(
    ((data ?? []) as { question_id: string; skill_id: string }[]).map((r) => [
      r.question_id,
      r.skill_id,
    ])
  );
  for (const q of questions) {
    const skill =
      skill72(tags.get(q.questionId) ?? "") ?? bridged72(q.questionId, q.catalogSkillId);
    if (skill) out.set(q.questionId, skill);
  }
  return out;
}

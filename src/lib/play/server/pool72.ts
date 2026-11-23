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

/** How many tagged questions of each skill a pool reads, unless its caller asks for more or fewer.
 *  A run uses a few dozen at most; reading and checking every tagged question of every skill took
 *  seconds (the whole Math section is about 30,000). */
export const POOL72_PER_SKILL = 40;
/** Never more than this many questions a pool, whatever is asked. */
export const POOL72_CAP = 1200;

/** Up to `count` tagged questions of one skill, starting at a random place in the tag table and
 *  wrapping round: two short reads along the primary key, however big the skill is. Null when the
 *  table cannot be read. */
async function sampleSkill(skillId: string, count: number, from: string): Promise<string[] | null> {
  const read = (after: boolean, limit: number) => {
    const q = db().from("question_skills72").select("question_id").eq("skill_id", skillId);
    return (after ? q.gte("question_id", from) : q.lt("question_id", from))
      .order("question_id", { ascending: true })
      .limit(limit)
      .then(
        (r) => (r.error ? null : ((r.data ?? []) as { question_id: string }[])),
        () => null
      );
  };
  const first = await read(true, count);
  if (!first) return null;
  const rest = first.length < count ? ((await read(false, count - first.length)) ?? []) : [];
  return [...first, ...rest].map((r) => r.question_id);
}

/** A sample of each skill's tagged questions (question id to 72-skill), or null while the Bank has
 *  tagged none of them. */
export async function sampleTagged(
  ids: readonly string[],
  perSkill: number,
  from: string = crypto.randomUUID()
): Promise<Map<string, string> | null> {
  const each = Math.max(1, Math.min(perSkill, Math.floor(POOL72_CAP / Math.max(1, ids.length))));
  const out = new Map<string, string>();
  let read = false;
  for (let i = 0; i < ids.length; i += 8) {
    const batch = ids.slice(i, i + 8);
    const got = await Promise.all(batch.map((id) => sampleSkill(id, each, from)));
    got.forEach((list, k) => {
      if (!list) return;
      read = true;
      for (const q of list) out.set(q, batch[k]);
    });
  }
  return read && out.size ? out : null;
}

/** The catalog skill each tagged question was filed under, read in small batches. */
async function catalogSkillsOf(questionIds: readonly string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < questionIds.length; i += 150) {
    const { data } = await db()
      .from("answer_key_entries")
      .select(
        "question_id, a:raw_model_response->approved_tags->>catalog_skill_id, b:raw_model_response->evidence->approved_tags->>catalog_skill_id"
      )
      .in("question_id", questionIds.slice(i, i + 150) as string[])
      .then(
        (r) => r,
        () => ({ data: null })
      );
    for (const r of (data ?? []) as { question_id: string; a: string | null; b: string | null }[]) {
      const skill = r.a ?? r.b;
      if (skill) out.set(r.question_id, skill);
    }
  }
  return out;
}

/** Admitted questions behind `skillIds` (72-skill ids), each filed under one of them: a sample of
 *  each skill's tagged questions (`perSkill`, never more than POOL72_CAP in all), checked the way
 *  every practice pool is. Until the Bank has tagged them, the bridge decides from whole catalog
 *  skills. */
export async function pool72(
  skillIds: readonly string[],
  maxDifficulty: number,
  /** From the student's plan: core plans read only the Practice plan's fixed set. */
  practiceSet = false,
  perSkill = POOL72_PER_SKILL
): Promise<Pool72> {
  const skills = skillIds.map((id) => skill72(id)).filter((s): s is Skill72 => !!s);
  if (!skills.length) return { items: [], snapshots: new Map() };
  const byId = new Map(skills.map((s) => [s.id, s]));
  const tags = await sampleTagged(
    skills.map((s) => s.id),
    perSkill
  );
  if (tags) {
    const filed = await catalogSkillsOf([...tags.keys()]);
    const only = new Map<string, string[]>();
    for (const [questionId, catalog] of filed)
      only.set(catalog, [...(only.get(catalog) ?? []), questionId]);
    const bank = await loadAdmittedBank([...only.keys()], maxDifficulty, practiceSet, only);
    const items: Item72[] = [];
    for (const item of bank.items) {
      const skill = byId.get(tags.get(item.id) ?? "");
      if (skill) items.push({ ...item, skill72: skill.id, domain72: skill.domain });
    }
    return { items, snapshots: bank.snapshots };
  }
  // no tags yet: the bridge, from whole catalog skills
  const catalog = new Set(skills.flatMap((s) => (BRIDGE[s.name] ?? []).map(catalogOf)));
  const bank = await loadAdmittedBank([...catalog], maxDifficulty, practiceSet);
  const items: Item72[] = [];
  for (const item of bank.items) {
    const skill = bridged72(item.id, item.skillId, skills);
    if (skill) items.push({ ...item, skill72: skill.id, domain72: skill.domain });
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

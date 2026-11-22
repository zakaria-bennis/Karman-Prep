/*
 * Shared by the exam scripts: the bank as practice checks it (whole bank, held questions included), each
 * question's key status, pool and origin, and the service-role client. Never run in the app.
 */
import { createClient } from "@supabase/supabase-js";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import { admitCatalogPool } from "@/lib/catalog-practice/session";
import { loadCatalogQuestionEvidence } from "@/lib/catalog-practice/supabase-store";
import { fetchCatalogQuestionPool } from "@/lib/supabase/queries/catalog-question-pool";
import { questionFamily } from "@/lib/assembler/bank";
import type { EngineItem } from "@/lib/sat-engine/params";

export type Meta = {
  id: string;
  answer_key_status: string | null;
  answer_verification_status: string | null;
  pool: string | null;
  origin?: string | null;
};
export type PoolItem = EngineItem & { confirmed: boolean; original: boolean };

export const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  }
);

/** A printed key used as printed, a corrected key that was verified, or a key verified by review. */
export function confirmedKey(meta: Meta | undefined): boolean {
  if (!meta) return false;
  const verification = meta.answer_verification_status ?? "";
  if (verification === "model_consensus_disagrees_with_key" || verification === "verifier_error")
    return false;
  if (
    meta.answer_key_status === "printed_key_used_no_correction" ||
    meta.answer_key_status === "corrected_key_verified"
  )
    return true;
  return verification.startsWith("verified");
}

export async function readMeta(ids: string[]): Promise<Map<string, Meta>> {
  const out = new Map<string, Meta>();
  // origin exists once the Generator stream's migration is live; fall back without it.
  let columns = "id, answer_key_status, answer_verification_status, pool, origin";
  for (let offset = 0; offset < ids.length; offset += 200) {
    let result = await db
      .from("quiz_questions")
      .select(columns)
      .in("id", ids.slice(offset, offset + 200));
    if (result.error && columns.includes("origin")) {
      columns = "id, answer_key_status, answer_verification_status, pool";
      result = await db
        .from("quiz_questions")
        .select(columns)
        .in("id", ids.slice(offset, offset + 200));
    }
    if (result.error)
      throw new Error(`question details could not be read: ${result.error.message}`);
    for (const row of (result.data ?? []) as unknown as Meta[]) out.set(row.id, row);
  }
  return out;
}

/** Every question that passes the practice checks, from the whole bank (held questions included). */
export async function loadPool(): Promise<Omit<PoolItem, "confirmed" | "original">[]> {
  const items: Omit<PoolItem, "confirmed" | "original">[] = [];
  for (const skill of CATALOG_SKILLS) {
    for (let attempt = 1; ; attempt++) {
      try {
        const rows = await fetchCatalogQuestionPool(
          { skillId: skill.id, minimumDifficulty: 1, maximumDifficulty: 7 },
          "whole-bank"
        );
        const admitted = admitCatalogPool(
          skill.id,
          rows,
          await loadCatalogQuestionEvidence(rows.map((row) => row.id))
        );
        const byId = new Map(rows.map((row) => [row.id, row]));
        for (const snapshot of admitted) {
          const row = byId.get(snapshot.binding.questionId)!;
          items.push({
            id: row.id,
            section: skill.subject === "math" ? "math" : "reading",
            domainId: skill.domainId,
            skillId: skill.id,
            difficulty: snapshot.student.difficulty_level,
            format: row.answer_format === "numeric_entry" ? "student-produced" : "multiple-choice",
            family: questionFamily(row),
          });
        }
        console.log(`  ${skill.id}: ${admitted.length}`);
        break;
      } catch (error) {
        if (attempt >= 5) throw error;
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      }
    }
  }
  return items;
}

/** The pool with each question's key status and origin attached. */
export async function poolWithMeta(raw: Omit<PoolItem, "confirmed" | "original">[]) {
  const meta = await readMeta(raw.map((item) => item.id));
  return {
    meta,
    pool: raw.map(
      (item): PoolItem => ({
        ...item,
        confirmed: confirmedKey(meta.get(item.id)),
        original: (meta.get(item.id)?.origin ?? "original") === "original",
      })
    ),
  };
}

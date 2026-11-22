/*
 * Writes generated questions into the question bank, shared by the loader (scripts/generator/load.ts)
 * and the serve-time path (serve.ts). Each question gets its quiz_questions and answer_choices rows,
 * is read back and sealed (catalogQuestionPayloadHash of the stored rows), then gets its evidence row
 * and its 72-skill binding, and goes through the same gate every student pool uses
 * (buildCatalogDeliverySnapshot). A question the gate refuses is hidden; a write that fails part way
 * is deleted again. Generated questions always go to the practice pool, never an exam pool.
 */
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildCatalogDeliverySnapshot } from "@/lib/catalog-practice/delivery-contract";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import { evidenceFor, rowsFor, sealOf, type StorableQuestion } from "./store";

/** is_live is computed by the database (import_status ok and not archived): hiding a question
 *  marks it for review and takes it out of the publish gate. */
export const HIDE = { import_status: "needs_review", publish_status: "needs_human_review" };

export type Pending = { q: StorableQuestion; ids: { question: string; choices: string[] } };

/** New ids for a question about to be written. */
export function withIds(q: StorableQuestion): Pending {
  return { q, ids: { question: randomUUID(), choices: q.choices.map(() => randomUUID()) } };
}

export interface Written {
  admitted: number;
  hidden: string[];
  /** The stored rows as read back, and each one's evidence, by question id. */
  rows: Map<string, QuizQuestionWithChoices>;
  evidence: Map<string, unknown>;
}

/** Writes a chunk of questions; all of it or none of it. */
export async function insertQuestions(
  db: SupabaseClient,
  chunk: readonly Pending[],
  batch: string,
  manifest: string
): Promise<Written> {
  const rows = chunk.map(({ q, ids }) => rowsFor(q, batch, ids));
  const questionIds = chunk.map((c) => c.ids.question);
  const undo = async () => {
    await db.from("quiz_questions").delete().in("id", questionIds);
  };
  try {
    let r = await db.from("quiz_questions").insert(rows.map((x) => x.question));
    if (r.error) throw new Error(`quiz_questions: ${r.error.message}`);
    const choices = rows.flatMap((x) => x.choices);
    if (choices.length) {
      r = await db.from("answer_choices").insert(choices);
      if (r.error) throw new Error(`answer_choices: ${r.error.message}`);
    }
    const back = await db
      .from("quiz_questions")
      .select("*, answer_choices(*)")
      .in("id", questionIds);
    if (back.error || !back.data) throw new Error(`read back: ${back.error?.message}`);
    const byId = new Map((back.data as QuizQuestionWithChoices[]).map((row) => [row.id, row]));
    const evidence = chunk.map(({ q, ids }) => {
      const row = byId.get(ids.question);
      if (!row) throw new Error(`question ${ids.question} did not read back`);
      return {
        id: randomUUID(),
        question_id: ids.question,
        raw_model_response: evidenceFor(q, batch, manifest, sealOf(row)),
        review_required: false,
        manual_correction_present: false,
      };
    });
    r = await db.from("answer_key_entries").insert(evidence);
    if (r.error) throw new Error(`answer_key_entries: ${r.error.message}`);
    r = await db.from("question_skills72").insert(rows.map((x) => x.binding));
    if (r.error) throw new Error(`question_skills72: ${r.error.message}`);
    // The same gate every student lane uses.
    const hidden: string[] = [];
    for (const e of evidence) {
      try {
        buildCatalogDeliverySnapshot(byId.get(e.question_id)!, e.raw_model_response);
      } catch {
        hidden.push(e.question_id);
      }
    }
    if (hidden.length) await db.from("quiz_questions").update(HIDE).in("id", hidden);
    return {
      admitted: chunk.length - hidden.length,
      hidden,
      rows: byId,
      evidence: new Map(evidence.map((e) => [e.question_id, e.raw_model_response])),
    };
  } catch (error) {
    await undo();
    throw error;
  }
}

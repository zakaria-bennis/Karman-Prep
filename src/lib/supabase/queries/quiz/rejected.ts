// ============================================================
// Selectors + mutations for the rejected_questions recovery bin.
//
// Reject = take a quiz_questions row + its answer_choices, copy
// them into rejected_questions as a JSONB snapshot, then delete
// the source rows. Restore reverses the move using the same
// original_id so external references stay stable.
//
// Hard-delete is a permanent drop from rejected_questions only —
// it never touches quiz_questions.
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";
import type { Json, Database } from "@/types/supabase";

export interface RejectedQuestionRow {
  id: string;
  original_id: string;
  question_snapshot: Record<string, unknown>;
  choices_snapshot: Array<{ letter: string; choice_text: string }>;
  rejected_at: string;
  rejected_by_user_id: string | null;
  rejected_reason: string | null;
  source_pdf: string | null;
  source_page: number | null;
  domain: string | null;
  subject: string | null;
  question_preview: string | null;
  created_at: string;
}

/** Recent rejections first. Used by /admin/questions/rejected. */
export async function selectRejectedQuestions(limit = 200): Promise<RejectedQuestionRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("rejected_questions")
    .select("*")
    .order("rejected_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as RejectedQuestionRow[];
}

export async function selectRejectedQuestionCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("rejected_questions")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

/** Move a quiz_questions row → rejected_questions. Idempotent
 *  in the sense that re-rejecting an already-deleted row is a
 *  no-op (returns false). */
export async function softRejectQuestion(
  questionId: string,
  opts: { rejectedByUserId?: string; reason?: string } = {}
): Promise<{ rejected: boolean; rejectedRowId?: string }> {
  const supabase = createAdminClient();

  // Fetch the full row + its choices.
  const { data: q, error: qErr } = await supabase
    .from("quiz_questions")
    .select("*, answer_choices(letter, choice_text)")
    .eq("id", questionId)
    .maybeSingle();
  if (qErr) throw qErr;
  if (!q) return { rejected: false };

  const { answer_choices: choices, ...questionRow } = q as Record<string, unknown> & {
    answer_choices?: Array<{ letter: string; choice_text: string }>;
  };

  // Insert into rejected_questions FIRST (so we never end up in a
  // state where the question is gone but the snapshot didn't land).
  // Cast the question row to Json — questionRow is typed `unknown`
  // after destructuring, but at runtime it's a plain object that
  // Postgres JSONB will accept.
  const questionRowAsJson = questionRow as unknown as Json;
  const choicesAsJson = (choices ?? []) as unknown as Json;
  const { data: rejected, error: insErr } = await supabase
    .from("rejected_questions")
    .insert({
      original_id: questionId,
      question_snapshot: questionRowAsJson,
      choices_snapshot: choicesAsJson,
      rejected_by_user_id: opts.rejectedByUserId ?? null,
      rejected_reason: opts.reason ?? null,
      source_pdf: (questionRow as Record<string, unknown>).source_pdf as string | null,
      source_page: (questionRow as Record<string, unknown>).source_page as number | null,
      domain: (questionRow as Record<string, unknown>).domain as string | null,
      subject: (questionRow as Record<string, unknown>).subject as string | null,
      question_preview: String(
        ((questionRow as Record<string, unknown>).question_text as string) ?? ""
      ).slice(0, 240),
    })
    .select("id")
    .single();
  if (insErr) throw insErr;

  // answer_choices CASCADE-deletes when the question row goes;
  // explicit clean-up not needed but kept for clarity.
  const { error: delErr } = await supabase.from("quiz_questions").delete().eq("id", questionId);
  if (delErr) {
    // If delete failed, roll back the snapshot insert so we don't
    // end up with the question in BOTH tables.
    await supabase.from("rejected_questions").delete().eq("id", rejected.id);
    throw delErr;
  }

  return { rejected: true, rejectedRowId: rejected.id };
}

/** Move a rejected_questions row → quiz_questions. Reuses the
 *  original_id so any external references to that question id
 *  still resolve. Fails if a quiz_questions row with that id
 *  already exists (manually re-imported in the meantime). */
export async function restoreRejectedQuestion(
  rejectedId: string
): Promise<{ restored: boolean; restoredQuestionId?: string }> {
  const supabase = createAdminClient();

  const { data: rejected, error: rErr } = await supabase
    .from("rejected_questions")
    .select("*")
    .eq("id", rejectedId)
    .maybeSingle();
  if (rErr) throw rErr;
  if (!rejected) return { restored: false };

  const snapshot = rejected.question_snapshot as Record<string, unknown>;
  const choicesSnapshot =
    (rejected.choices_snapshot as Array<{ letter: string; choice_text: string }>) ?? [];

  // Carry the original UUID back so external references survive.
  // The snapshot was a full quiz_questions row at reject time, so we
  // know it satisfies the Insert shape — but TypeScript can't see
  // that through the JSONB column, so we cast through the table's
  // generated Insert type.
  type QuizQuestionInsert = Database["public"]["Tables"]["quiz_questions"]["Insert"];
  const insertPayload = {
    ...snapshot,
    id: rejected.original_id,
  } as unknown as QuizQuestionInsert;

  const { error: insErr } = await supabase.from("quiz_questions").insert(insertPayload);
  if (insErr) {
    throw new Error(
      `Restore failed: ${insErr.message}. ` +
        `(Often this means a question with id ${rejected.original_id} already exists — ` +
        `perhaps re-imported from the PDF. Delete the duplicate first.)`
    );
  }

  // Re-insert the choices. answer_choices.letter is typed as
  // "A" | "B" | "C" | "D"; the snapshot stored it as a plain
  // string, so we narrow here.
  if (choicesSnapshot.length > 0) {
    const choiceRows = choicesSnapshot.map((c) => ({
      question_id: rejected.original_id,
      letter: c.letter as "A" | "B" | "C" | "D",
      choice_text: c.choice_text,
    }));
    const { error: cErr } = await supabase.from("answer_choices").insert(choiceRows);
    if (cErr) {
      // Best-effort cleanup of the question we just restored.
      await supabase.from("quiz_questions").delete().eq("id", rejected.original_id);
      throw new Error(`Restore failed inserting choices: ${cErr.message}`);
    }
  }

  // Remove from rejected pile.
  const { error: dErr } = await supabase.from("rejected_questions").delete().eq("id", rejectedId);
  if (dErr) {
    // The question IS restored at this point — log but don't throw.
    // The rejected row will linger; harmless.
    console.warn(`Restored question but failed to clean rejected row: ${dErr.message}`);
  }

  return { restored: true, restoredQuestionId: rejected.original_id };
}

/** Permanently delete a rejected_questions row. Does not touch
 *  quiz_questions (the original was already deleted at reject time). */
export async function hardDeleteRejectedQuestion(
  rejectedId: string
): Promise<{ deleted: boolean }> {
  const supabase = createAdminClient();
  const { error, count } = await supabase
    .from("rejected_questions")
    .delete({ count: "exact" })
    .eq("id", rejectedId);
  if (error) throw error;
  return { deleted: (count ?? 0) > 0 };
}

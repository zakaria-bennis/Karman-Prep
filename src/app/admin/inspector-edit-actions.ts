"use server";

// ============================================================
// Inspector edit + restore actions — the two Inspector verbs that
// touch question_history (so they cluster around a shared
// snapshot/diff machinery).
//
// Split out of inspector-actions.ts to keep that file under the
// 700-line repo cap. inspector-actions.ts re-exports these (which
// in turn is re-exported by actions.ts), so consumers can keep
// importing from `@/app/admin/actions`.
//
// Both actions:
//   1. snapshot current state into a typed payload
//   2. apply the mutation across quiz_questions + answer_choices
//   3. re-snapshot and write a question_history row capturing the diff
// ============================================================

import { safeAuth } from "@/lib/auth/dev-auth";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/queries/admin";
import type { Database } from "@/types/supabase";

async function guardAdmin(): Promise<string> {
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Not authenticated");
  const ok = await requireRole(userId, ["admin"]);
  if (!ok) throw new Error("Admin role required");
  return userId;
}

// ── Update — single row (the edit-mode save handler) ─────────

/** Persist edits made in the Inspector's edit mode. Covers every
 *  text field a typical OCR/transcription fix touches:
 *    question_text, hint, explanation_text, desmos_strategy,
 *    image_alt, passage(_intro/_a/_b), numeric_tolerance,
 *    correct_answer, choice_a/b/c/d.
 *
 *  Choices are stored in the answer_choices table, not on
 *  quiz_questions, so we have to update them separately and
 *  re-derive `is_correct` from the new `correct_answer`.
 *
 *  v1 deferred:
 *    · figure_table_data (needs a richer editor)
 *    · image_url (needs an upload UI)
 *    · domain / difficulty_level (need pickers)
 */
export interface InspectedQuestionEdit {
  questionId: string;
  question_text?: string;
  hint?: string | null;
  explanation_text?: string;
  desmos_strategy?: string | null;
  image_alt?: string | null;
  passage_intro?: string | null;
  passage?: string | null;
  passage_a?: string | null;
  passage_b?: string | null;
  numeric_tolerance?: number | null;
  correct_answer?: string;
  /** Only for MC questions — text per letter. */
  choices?: { A?: string; B?: string; C?: string; D?: string };
  /** Per-choice explanations — packed into the explanation_per_choice
   *  JSONB column. Each letter optional; pass an explicit "" to clear. */
  explanations_per_choice?: { A?: string; B?: string; C?: string; D?: string };
  /** Curriculum concept slug (one of the 89 in src/data/curriculum). */
  concept_slug?: string;
}

export async function actionUpdateInspectedQuestion(input: InspectedQuestionEdit): Promise<void> {
  const userId = await guardAdmin();
  const { createAdminClient } = await import("@/lib/supabase/server");
  const { buildSnapshot, insertHistoryRow } = await import("@/lib/supabase/queries/quiz/history");
  const supabase = createAdminClient();

  // Snapshot BEFORE so we can write to question_history at the end.
  const { data: beforeRow, error: beforeErr } = await supabase
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .eq("id", input.questionId)
    .maybeSingle();
  if (beforeErr) throw beforeErr;
  if (!beforeRow) throw new Error(`Question ${input.questionId} not found`);
  const beforeSnapshot = buildSnapshot(beforeRow as unknown as Parameters<typeof buildSnapshot>[0]);

  // ── 1. quiz_questions row update ───────────────────────────
  type QQUpdate = Database["public"]["Tables"]["quiz_questions"]["Update"];
  const patch: QQUpdate = { updated_at: new Date().toISOString() };
  if (input.question_text !== undefined) patch.question_text = input.question_text;
  if (input.hint !== undefined) patch.hint = input.hint || null;
  if (input.explanation_text !== undefined) patch.explanation_text = input.explanation_text;
  if (input.desmos_strategy !== undefined) patch.desmos_strategy = input.desmos_strategy || null;
  if (input.image_alt !== undefined) patch.image_alt = input.image_alt || null;
  if (input.passage_intro !== undefined) patch.passage_intro = input.passage_intro || null;
  if (input.passage !== undefined) patch.passage = input.passage || null;
  if (input.passage_a !== undefined) patch.passage_a = input.passage_a || null;
  if (input.passage_b !== undefined) patch.passage_b = input.passage_b || null;
  if (input.numeric_tolerance !== undefined) patch.numeric_tolerance = input.numeric_tolerance;
  if (input.correct_answer !== undefined) patch.correct_answer = input.correct_answer;
  if (input.concept_slug !== undefined) patch.concept_slug = input.concept_slug;
  if (input.explanations_per_choice !== undefined) {
    // Drop empty strings so the JSONB stores null per-letter rather
    // than empty entries (the existing data convention).
    const epc: Record<string, string> = {};
    (["A", "B", "C", "D"] as const).forEach((letter) => {
      const v = input.explanations_per_choice?.[letter];
      if (v) epc[letter] = v;
    });
    patch.explanation_per_choice = Object.keys(epc).length > 0 ? epc : null;
  }

  const { error: qErr } = await supabase
    .from("quiz_questions")
    .update(patch)
    .eq("id", input.questionId);
  if (qErr) throw qErr;

  // ── 2. answer_choices updates (MC choice text + is_correct) ─
  type AnswerLetter = "A" | "B" | "C" | "D";
  const isAnswerLetter = (s: string | undefined): s is AnswerLetter =>
    s === "A" || s === "B" || s === "C" || s === "D";

  if (input.choices) {
    for (const letter of ["A", "B", "C", "D"] as const) {
      const text = input.choices[letter];
      if (text === undefined) continue;
      const { error: cErr } = await supabase
        .from("answer_choices")
        .update({
          choice_text: text,
          is_correct: input.correct_answer === letter,
        })
        .eq("question_id", input.questionId)
        .eq("letter", letter);
      if (cErr) throw cErr;
    }
  } else if (isAnswerLetter(input.correct_answer)) {
    // correct_answer changed but choices didn't — still need to flip
    // is_correct on the matching answer_choice row.
    const { error: r1 } = await supabase
      .from("answer_choices")
      .update({ is_correct: false })
      .eq("question_id", input.questionId);
    if (r1) throw r1;
    const { error: r2 } = await supabase
      .from("answer_choices")
      .update({ is_correct: true })
      .eq("question_id", input.questionId)
      .eq("letter", input.correct_answer);
    if (r2) throw r2;
  }

  // Snapshot AFTER state and record the history row.
  const { data: afterRow, error: afterErr } = await supabase
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .eq("id", input.questionId)
    .maybeSingle();
  if (afterErr) throw afterErr;
  if (afterRow) {
    const afterSnapshot = buildSnapshot(afterRow as unknown as Parameters<typeof buildSnapshot>[0]);
    await insertHistoryRow({
      questionId: input.questionId,
      beforeState: beforeSnapshot,
      afterState: afterSnapshot,
      editedBy: userId,
      source: "inspector",
    });
  }

  revalidatePath("/admin/questions/inspect");
  revalidatePath(`/admin/questions/inspect/${input.questionId}`);
  revalidatePath("/admin/questions/review");
}

// ── Restore — revert a row to a previous history snapshot ────

/** Restore a question to a previous snapshot from question_history.
 *  Writes a new history row capturing the restore as an edit (so the
 *  restore action itself is auditable + further reversible).
 *
 *  Restores quiz_questions row fields AND answer_choices in lockstep
 *  with the snapshot's `choices` array. */
export async function actionRestoreQuestionVersion(input: {
  questionId: string;
  historyId: string;
}): Promise<void> {
  const userId = await guardAdmin();
  const { createAdminClient } = await import("@/lib/supabase/server");
  const { buildSnapshot, insertHistoryRow } = await import("@/lib/supabase/queries/quiz/history");
  const supabase = createAdminClient();

  // 1. Look up the target history row to read its before_state.
  const { data: hist, error: histErr } = await supabase
    .from("question_history")
    .select("*")
    .eq("id", input.historyId)
    .eq("question_id", input.questionId)
    .maybeSingle();
  if (histErr) throw histErr;
  if (!hist) throw new Error("History entry not found");
  const target = hist.before_state as unknown as ReturnType<typeof buildSnapshot>;

  // 2. Snapshot current BEFORE state (so the restore is reversible).
  const { data: currentRow, error: currentErr } = await supabase
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .eq("id", input.questionId)
    .maybeSingle();
  if (currentErr) throw currentErr;
  if (!currentRow) throw new Error("Question not found");
  const currentSnapshot = buildSnapshot(
    currentRow as unknown as Parameters<typeof buildSnapshot>[0]
  );

  // 3. Apply the target snapshot to quiz_questions.
  type QQUpdate = Database["public"]["Tables"]["quiz_questions"]["Update"];
  const restore = {
    question_text: target.question_text,
    correct_answer: target.correct_answer,
    difficulty_level: target.difficulty_level ?? undefined,
    explanation_text: target.explanation_text,
    explanation_per_choice: target.explanation_per_choice,
    hint: target.hint,
    desmos_strategy: target.desmos_strategy,
    image_alt: target.image_alt,
    image_url: target.image_url,
    figure_kind: target.figure_kind,
    figure_table_data: target.figure_table_data,
    passage_intro: target.passage_intro,
    passage: target.passage,
    passage_a: target.passage_a,
    passage_b: target.passage_b,
    numeric_tolerance: target.numeric_tolerance,
    concept_slug: target.concept_slug,
    domain: target.domain,
    topic_cluster: target.topic_cluster ?? undefined,
    import_status: target.import_status,
    updated_at: new Date().toISOString(),
  } as unknown as QQUpdate;
  const { error: qErr } = await supabase
    .from("quiz_questions")
    .update(restore)
    .eq("id", input.questionId);
  if (qErr) throw qErr;

  // 4. Restore answer_choices in lockstep — set each row's text +
  //    is_correct from the snapshot.
  for (const ch of target.choices) {
    const { error: cErr } = await supabase
      .from("answer_choices")
      .update({ choice_text: ch.choice_text, is_correct: ch.is_correct })
      .eq("question_id", input.questionId)
      .eq("letter", ch.letter as "A" | "B" | "C" | "D");
    if (cErr) throw cErr;
  }

  // 5. Record the restore as its own history entry.
  await insertHistoryRow({
    questionId: input.questionId,
    beforeState: currentSnapshot,
    afterState: target,
    editedBy: userId,
    source: "inspector",
    note: `Restored to snapshot ${input.historyId}`,
  });

  revalidatePath(`/admin/questions/inspect/${input.questionId}`);
  revalidatePath("/admin/questions/inspect");
}

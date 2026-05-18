"use server";

// ============================================================
// Inspector-specific server actions.
//
// Split out of `src/app/admin/actions.ts` to stay under the
// 700-line file-size cap. All actions here power
// /admin/questions/inspect — the per-question triage UI.
// ============================================================

import { revalidatePath } from "next/cache";
import { uploadQuestionImage } from "@/lib/supabase/queries/quiz";
import { safeAuth } from "@/lib/auth/dev-auth";
import { requireRole } from "@/lib/supabase/queries/admin";
import type { Database } from "@/types/supabase";

async function guardAdmin(): Promise<string> {
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Not authenticated");
  const ok = await requireRole(userId, ["admin"]);
  if (!ok) throw new Error("Admin role required");
  return userId;
}

// ── Inspector UI actions ──────────────────────────────────────
// Powers /admin/questions/inspect (Phase 3).

/** Mark a single audit-or-grader finding as resolved (admin reviewed
 *  and decided it's either fixed, dismissed, or not a real issue). */
export async function actionResolveFinding(input: {
  findingId: string;
  note?: string;
}): Promise<void> {
  const userId = await guardAdmin();
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("question_findings")
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
      resolved_note: input.note ?? null,
    })
    .eq("id", input.findingId);
  if (error) throw error;
  revalidatePath("/admin/questions/inspect");
}

/** Flip a question to live (is_live=true via the import_status='ok'
 *  trigger) AND auto-resolve every open finding on it. The admin
 *  has decided the question is good as-is, so the findings shouldn't
 *  keep haunting the worklist. Resolved findings stay in the DB for
 *  audit-trail purposes (filterable via "Include resolved"). */
export async function actionAcceptInspectedQuestion(input: { questionId: string }): Promise<void> {
  const userId = await guardAdmin();
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();

  // 1. Flip the question to live.
  const { error: qErr } = await supabase
    .from("quiz_questions")
    .update({
      import_status: "ok",
      import_flag_type: null,
      import_flag_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.questionId);
  if (qErr) throw qErr;

  // 2. Auto-resolve every open finding for this question. Without
  //    this step, the worklist still shows the row even after the
  //    admin accepted it.
  const { error: fErr } = await supabase
    .from("question_findings")
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
      resolved_note: "Auto-resolved on Accept Live",
    })
    .eq("question_id", input.questionId)
    .is("resolved_at", null);
  if (fErr) throw fErr;

  revalidatePath("/admin/questions/inspect");
  revalidatePath(`/admin/questions/inspect/${input.questionId}`);
  revalidatePath("/admin/questions/review");
}

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
 *    · concept_slug / domain / difficulty_level (need pickers)
 *    · per-choice explanations (explanation_per_choice JSONB)
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
  // Cast through unknown — the joined shape isn't statically typed by
  // Supabase's generated types but matches QuizQuestionWithChoices.
  const beforeSnapshot = buildSnapshot(beforeRow as unknown as Parameters<typeof buildSnapshot>[0]);

  // ── 1. quiz_questions row update ───────────────────────────
  // Use the generated Update row type so Supabase TS narrows correctly.
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
    // Set all to false, then the correct one to true.
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

// ── Bulk Inspector actions ───────────────────────────────────
// Worklist multi-select wires into these. Each does ONE bulk UPDATE
// per call so triaging 50 rows is one round-trip, not 50.

/** Resolve every open finding on each of the given questions. Does
 *  NOT change question.import_status — use the bulk-accept action if
 *  you also want to flip those questions live. */
export async function actionBulkResolveFindings(input: {
  questionIds: string[];
  note?: string;
}): Promise<{ resolved: number }> {
  const userId = await guardAdmin();
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();
  if (input.questionIds.length === 0) return { resolved: 0 };
  const { data, error } = await supabase
    .from("question_findings")
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
      resolved_note: input.note ?? "Bulk-resolved via Inspector",
    })
    .in("question_id", input.questionIds)
    .is("resolved_at", null)
    .select("id");
  if (error) throw error;
  revalidatePath("/admin/questions/inspect");
  return { resolved: data?.length ?? 0 };
}

/** Bulk-accept N questions: flip each to import_status='ok' (live)
 *  + auto-resolve every open finding on each of them (same pattern
 *  as actionAcceptInspectedQuestion, batched). */
export async function actionBulkAcceptQuestions(input: {
  questionIds: string[];
}): Promise<{ accepted: number; resolvedFindings: number }> {
  const userId = await guardAdmin();
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();
  if (input.questionIds.length === 0) return { accepted: 0, resolvedFindings: 0 };
  const nowIso = new Date().toISOString();
  // 1. Flip questions to live
  const { data: qd, error: qErr } = await supabase
    .from("quiz_questions")
    .update({
      import_status: "ok",
      import_flag_type: null,
      import_flag_reason: null,
      updated_at: nowIso,
    })
    .in("id", input.questionIds)
    .select("id");
  if (qErr) throw qErr;
  // 2. Auto-resolve all open findings on those rows
  const { data: fd, error: fErr } = await supabase
    .from("question_findings")
    .update({
      resolved_at: nowIso,
      resolved_by: userId,
      resolved_note: "Auto-resolved on bulk Accept Live",
    })
    .in("question_id", input.questionIds)
    .is("resolved_at", null)
    .select("id");
  if (fErr) throw fErr;
  revalidatePath("/admin/questions/inspect");
  revalidatePath("/admin/questions/review");
  return { accepted: qd?.length ?? 0, resolvedFindings: fd?.length ?? 0 };
}

/** Bulk-flag N questions for review. Does NOT touch findings — those
 *  stay open since the admin is signalling "this row still needs
 *  attention." */
export async function actionBulkFlagQuestions(input: {
  questionIds: string[];
  reason?: string;
}): Promise<{ flagged: number }> {
  await guardAdmin();
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();
  if (input.questionIds.length === 0) return { flagged: 0 };
  const { data, error } = await supabase
    .from("quiz_questions")
    .update({
      import_status: "needs_review",
      import_flag_type: "partial_emit",
      import_flag_reason: input.reason ?? "Bulk-flagged via Inspector",
      updated_at: new Date().toISOString(),
    })
    .in("id", input.questionIds)
    .select("id");
  if (error) throw error;
  revalidatePath("/admin/questions/inspect");
  revalidatePath("/admin/questions/review");
  return { flagged: data?.length ?? 0 };
}
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
  // The generated Update type has some columns as `T | undefined` (no
  // null) — cast through unknown since our snapshot stores nulls for
  // those (semantically equivalent for our purposes).
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

  // 5. Record the restore as its own history entry (auditable + still
  //    reversible — admin can restore the pre-restore state from the
  //    new row).
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

/** Replace (or attach) a figure on an Inspector question. Uploads
 *  the new image to R2 via uploadQuestionImage(), then updates the
 *  quiz_questions row's image_url + image_alt + figure_kind='image'.
 *
 *  Also clears any figure_table_data — replacing the figure implies
 *  the table extraction is stale. Admin can re-run the table
 *  extractor afterward if the new image is itself a table.
 *
 *  Snapshots before/after so the change is auditable in the
 *  question_history table like every other Inspector edit. */
export async function actionReplaceInspectedQuestionImage(
  questionId: string,
  formData: FormData,
  alt: string | null
): Promise<{ publicUrl: string }> {
  const userId = await guardAdmin();
  const file = formData.get("image") as File | null;
  if (!file) throw new Error("No image file in form data");

  const { createAdminClient } = await import("@/lib/supabase/server");
  const { buildSnapshot, insertHistoryRow } = await import("@/lib/supabase/queries/quiz/history");
  const supabase = createAdminClient();

  // BEFORE snapshot (history)
  const { data: beforeRow, error: beforeErr } = await supabase
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .eq("id", questionId)
    .maybeSingle();
  if (beforeErr) throw beforeErr;
  if (!beforeRow) throw new Error(`Question ${questionId} not found`);
  const beforeSnapshot = buildSnapshot(beforeRow as unknown as Parameters<typeof buildSnapshot>[0]);

  // Upload to R2 (existing helper). Returns public URL + sets
  // image_url/image_storage_path/image_alt on the row.
  const bytes = await file.arrayBuffer();
  const { publicUrl } = await uploadQuestionImage(
    questionId,
    file.name,
    bytes,
    file.type || "image/png",
    alt
  );

  // Clear stale table data + reset figure_kind to 'image'. The table
  // extractor will re-classify if asked.
  type QQUpdate = Database["public"]["Tables"]["quiz_questions"]["Update"];
  const patch: QQUpdate = {
    figure_kind: "image",
    figure_table_data: null,
    updated_at: new Date().toISOString(),
  };
  const { error: patchErr } = await supabase
    .from("quiz_questions")
    .update(patch)
    .eq("id", questionId);
  if (patchErr) throw patchErr;

  // AFTER snapshot
  const { data: afterRow } = await supabase
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .eq("id", questionId)
    .maybeSingle();
  if (afterRow) {
    await insertHistoryRow({
      questionId,
      beforeState: beforeSnapshot,
      afterState: buildSnapshot(afterRow as unknown as Parameters<typeof buildSnapshot>[0]),
      editedBy: userId,
      source: "inspector",
      note: `Figure replaced with ${file.name}`,
    });
  }

  revalidatePath(`/admin/questions/inspect/${questionId}`);
  revalidatePath("/admin/questions/inspect");
  return { publicUrl };
}

/** Remove the figure from an Inspector question — sets image_url +
 *  image_alt to null and clears figure_kind. Useful when a figure
 *  was attached in error or its source PDF actually had no figure. */
export async function actionRemoveInspectedQuestionImage(questionId: string): Promise<void> {
  const userId = await guardAdmin();
  const { createAdminClient } = await import("@/lib/supabase/server");
  const { buildSnapshot, insertHistoryRow } = await import("@/lib/supabase/queries/quiz/history");
  const supabase = createAdminClient();

  const { data: beforeRow, error: beforeErr } = await supabase
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .eq("id", questionId)
    .maybeSingle();
  if (beforeErr) throw beforeErr;
  if (!beforeRow) throw new Error(`Question ${questionId} not found`);
  const beforeSnapshot = buildSnapshot(beforeRow as unknown as Parameters<typeof buildSnapshot>[0]);

  type QQUpdate = Database["public"]["Tables"]["quiz_questions"]["Update"];
  const patch: QQUpdate = {
    image_url: null,
    image_alt: null,
    image_storage_path: null,
    figure_kind: null,
    figure_table_data: null,
    updated_at: new Date().toISOString(),
  };
  const { error: patchErr } = await supabase
    .from("quiz_questions")
    .update(patch)
    .eq("id", questionId);
  if (patchErr) throw patchErr;

  const { data: afterRow } = await supabase
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .eq("id", questionId)
    .maybeSingle();
  if (afterRow) {
    await insertHistoryRow({
      questionId,
      beforeState: beforeSnapshot,
      afterState: buildSnapshot(afterRow as unknown as Parameters<typeof buildSnapshot>[0]),
      editedBy: userId,
      source: "inspector",
      note: "Figure removed",
    });
  }

  revalidatePath(`/admin/questions/inspect/${questionId}`);
  revalidatePath("/admin/questions/inspect");
}

/** Reverse of accept — flag a previously-live question for review
 *  (e.g. the admin saw it in the Inspector with WARNING findings and
 *  decided it shouldn't stay live until fixed). */
export async function actionFlagInspectedQuestion(input: {
  questionId: string;
  reason?: string;
}): Promise<void> {
  await guardAdmin();
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("quiz_questions")
    .update({
      import_status: "needs_review",
      import_flag_type: "partial_emit",
      import_flag_reason: input.reason ?? "Flagged via Inspector",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.questionId);
  if (error) throw error;
  revalidatePath("/admin/questions/inspect");
  revalidatePath(`/admin/questions/inspect/${input.questionId}`);
  revalidatePath("/admin/questions/review");
}

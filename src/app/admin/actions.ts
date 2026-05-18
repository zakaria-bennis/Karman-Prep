"use server";

// ============================================================
// Server Actions — Admin curriculum UI
// Role-gated: admin only.
//
// Every action runs its input through a Zod schema before doing
// any DB writes. Server actions are typed at compile time, but a
// buggy client or future change that bypasses TS narrowing can
// post garbage at runtime — these guards keep it from reaching
// the question bank or curriculum content tables.
// ============================================================

import { safeAuth } from "@/lib/auth/dev-auth";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/queries/admin";
import {
  insertQuestion,
  updateQuestion,
  updateQuestionDifficulty,
  updateQuestionDifficultyLevel,
  reorderQuestions,
  deleteQuestion,
  deleteQuestions,
  resolveFlaggedQuestion,
  uploadQuestionImage,
  removeQuestionImage,
  acceptFlaggedQuestion,
  type NewQuestionInput,
} from "@/lib/supabase/queries/quiz";
import {
  upsertTextbook,
  upsertVideoURL,
  uploadVideoFile,
  deleteVideo,
} from "@/lib/supabase/queries/content";
import type { QuizDifficulty, QuizQuestion } from "@/types/quiz";
import {
  acceptFlaggedQuestionInputSchema,
  bulkImportInputSchema,
  bulkRejectQuestionsInputSchema,
  deleteQuestionInputSchema,
  deleteVideoInputSchema,
  newQuestionInputSchema,
  rejectFlaggedQuestionInputSchema,
  removeQuestionImageInputSchema,
  reorderQuestionsInputSchema,
  resolveFlaggedQuestionInputSchema,
  saveTextbookInputSchema,
  saveVideoURLInputSchema,
  updateQuestionDifficultyInputSchema,
  updateQuestionDifficultyLevelInputSchema,
  updateQuestionInputSchema,
  uploadQuestionImageArgsSchema,
  uploadVideoArgsSchema,
} from "./schemas";

async function guardAdmin(): Promise<string> {
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Not authenticated");
  const ok = await requireRole(userId, ["admin"]);
  if (!ok) throw new Error("Admin role required");
  return userId;
}

export async function actionAddQuestion(input: NewQuestionInput) {
  const v = newQuestionInputSchema.parse(input);
  await guardAdmin();
  const { question } = await insertQuestion(v as NewQuestionInput);
  if (v.node_id) revalidatePath(`/admin/curriculum/${v.node_id}`);
  return question;
}

export async function actionUpdateQuestionDifficulty(
  questionId: string,
  difficulty: QuizDifficulty,
  nodeId: string
) {
  updateQuestionDifficultyInputSchema.parse({ questionId, difficulty, nodeId });
  await guardAdmin();
  await updateQuestionDifficulty(questionId, difficulty);
  revalidatePath(`/admin/curriculum/${nodeId}`);
}

export async function actionUpdateQuestionDifficultyLevel(
  questionId: string,
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7
) {
  updateQuestionDifficultyLevelInputSchema.parse({ questionId, level });
  await guardAdmin();
  await updateQuestionDifficultyLevel(questionId, level);
}

export async function actionUpdateQuestion(
  questionId: string,
  patch: Partial<
    Pick<
      QuizQuestion,
      | "question_text"
      | "difficulty"
      | "correct_answer"
      | "explanation_text"
      | "explanation_per_choice"
      | "hint"
      | "topic_cluster"
      | "desmos_strategy"
    >
  >,
  nodeId: string
) {
  updateQuestionInputSchema.parse({ questionId, patch, nodeId });
  await guardAdmin();
  await updateQuestion(questionId, patch);
  revalidatePath(`/admin/curriculum/${nodeId}`);
}

// ── Content (textbook + video) actions ────────────────────

export async function actionSaveTextbook(nodeId: string, textbook: string) {
  saveTextbookInputSchema.parse({ nodeId, textbook });
  const userId = await guardAdmin();
  await upsertTextbook(nodeId, textbook, userId);
  revalidatePath(`/admin/curriculum/${nodeId}`);
}

export async function actionSaveVideoURL(
  nodeId: string,
  videoUrl: string | null,
  durationSeconds: number | null
) {
  saveVideoURLInputSchema.parse({ nodeId, videoUrl, durationSeconds });
  const userId = await guardAdmin();
  await upsertVideoURL(nodeId, videoUrl, durationSeconds, userId);
  revalidatePath(`/admin/curriculum/${nodeId}`);
}

export async function actionUploadVideo(
  nodeId: string,
  formData: FormData
): Promise<{ publicUrl: string }> {
  uploadVideoArgsSchema.parse({ nodeId });
  const userId = await guardAdmin();
  const file = formData.get("video") as File | null;
  if (!file) throw new Error("No video file in form data");

  const bytes = await file.arrayBuffer();
  const { publicUrl } = await uploadVideoFile(
    nodeId,
    file.name,
    bytes,
    file.type || "video/mp4",
    userId
  );
  revalidatePath(`/admin/curriculum/${nodeId}`);
  return { publicUrl };
}

export async function actionDeleteVideo(nodeId: string, storagePath: string | null) {
  deleteVideoInputSchema.parse({ nodeId, storagePath });
  const userId = await guardAdmin();
  await deleteVideo(nodeId, storagePath, userId);
  revalidatePath(`/admin/curriculum/${nodeId}`);
}

export async function actionReorderQuestions(orderedIds: string[], nodeId: string) {
  reorderQuestionsInputSchema.parse({ orderedIds, nodeId });
  await guardAdmin();
  await reorderQuestions(orderedIds);
  revalidatePath(`/admin/curriculum/${nodeId}`);
}

export async function actionDeleteQuestion(questionId: string, nodeId: string) {
  deleteQuestionInputSchema.parse({ questionId, nodeId });
  await guardAdmin();
  await deleteQuestion(questionId);
  revalidatePath(`/admin/curriculum/${nodeId}`);
}

export async function actionUploadQuestionImage(
  questionId: string,
  nodeId: string,
  formData: FormData,
  alt: string | null
): Promise<{ publicUrl: string }> {
  uploadQuestionImageArgsSchema.parse({ questionId, nodeId, alt });
  await guardAdmin();
  const file = formData.get("image") as File | null;
  if (!file) throw new Error("No image file in form data");
  const bytes = await file.arrayBuffer();
  const { publicUrl } = await uploadQuestionImage(
    questionId,
    file.name,
    bytes,
    file.type || "image/png",
    alt
  );
  revalidatePath(`/admin/curriculum/${nodeId}`);
  return { publicUrl };
}

export async function actionRemoveQuestionImage(
  questionId: string,
  nodeId: string,
  storagePath: string | null
) {
  removeQuestionImageInputSchema.parse({ questionId, nodeId, storagePath });
  await guardAdmin();
  await removeQuestionImage(questionId, storagePath);
  revalidatePath(`/admin/curriculum/${nodeId}`);
}

export async function actionResolveFlaggedQuestion(flagId: string) {
  resolveFlaggedQuestionInputSchema.parse({ flagId });
  const userId = await guardAdmin();
  await resolveFlaggedQuestion(flagId, userId);
  revalidatePath(`/admin/curriculum`);
}

// Bulk-import row + result types now live in lib/question-bank/bulk-import.ts
// alongside the core import logic, so non-Clerk callers (e.g. the
// CRON_SECRET-authed CSV-inbox route) can use them without importing
// a server-action module.
export type { BulkImportRow, BulkImportResult } from "@/lib/question-bank/bulk-import";
import { bulkImportRows } from "@/lib/question-bank/bulk-import";
import type { BulkImportRow, BulkImportResult } from "@/lib/question-bank/bulk-import";

/** Bulk-import questions from a parsed CSV/JSON array.
 *
 *  - When `nodeId` is a string, every imported row is tied to that
 *    curriculum node (existing per-node panel flow).
 *  - When `nodeId` is null, rows land in the bank with node_id = NULL
 *    (new PDF-routine flow). Subject is derived from the row's
 *    `domain` field; rows without a domain are errored.
 *  - On duplicate (source_pdf + content_hash already present):
 *    silently skip, count toward `skipped_duplicates`.
 *  - On `import_status = 'needs_review'`: count toward
 *    `flagged_for_review` and require a non-empty flag_reason. */
export async function actionBulkImport(
  nodeId: string | null,
  subject: "reading" | "math" | null,
  rows: BulkImportRow[]
): Promise<BulkImportResult> {
  bulkImportInputSchema.parse({ nodeId, subject, rows });
  await guardAdmin();
  const result = await bulkImportRows(nodeId, subject, rows);
  if (nodeId) revalidatePath(`/admin/curriculum/${nodeId}`);
  revalidatePath("/admin/questions/review");
  return result;
}

// ── Question Review (acceptance / rejection of flagged rows) ─

export async function actionAcceptFlaggedQuestion(
  questionId: string,
  opts: { nodeId?: string | null } = {}
): Promise<void> {
  acceptFlaggedQuestionInputSchema.parse({ questionId, opts });
  await guardAdmin();
  await acceptFlaggedQuestion(questionId, opts);
  revalidatePath("/admin/questions/review");
  if (opts.nodeId) revalidatePath(`/admin/curriculum/${opts.nodeId}`);
}

export async function actionRejectFlaggedQuestion(questionId: string): Promise<void> {
  rejectFlaggedQuestionInputSchema.parse({ questionId });
  await guardAdmin();
  await deleteQuestion(questionId);
  revalidatePath("/admin/questions/review");
}

/** Reject (DELETE) every question in `questionIds` in one round trip.
 *  Used by /admin/questions/review's "Reject N selected" control.
 *  A bad PDF can spray dozens of flagged rows; click-by-click reject
 *  is what audit issue #15 calls out. */
export async function actionBulkRejectQuestions(questionIds: string[]): Promise<{
  rejected: number;
  requested: number;
}> {
  bulkRejectQuestionsInputSchema.parse({ questionIds });
  await guardAdmin();
  const rejected = await deleteQuestions(questionIds);
  revalidatePath("/admin/questions/review");
  return { rejected, requested: questionIds.length };
}

/** Bulk-accept every question in the BANK tab — flips each to live
 *  and assigns the curriculum node implied by its concept_slug. Skips
 *  rows whose slug doesn't map to a node (rare; logs the count).
 *  Does NOT touch flagged (needs_review) questions — those still need
 *  human review by definition.
 *
 *  Returns counts so the UI can show "accepted N, skipped M".
 */
export async function actionAcceptAllBank(): Promise<{
  accepted: number;
  skipped_no_slug_match: number;
  errored: number;
  errors: Array<{ questionId: string; message: string }>;
}> {
  await guardAdmin();

  const { nodeIdFromSlug } = await import("@/lib/question-bank/taxonomy");
  const { classifyBankRowsForAccept } = await import("@/lib/question-bank/classify-bank-accept");
  const supabase = (await import("@/lib/supabase/server")).createAdminClient();

  // Fetch every bank row: status=ok AND node_id IS NULL. We pull the
  // full id+slug list (cheap — just two columns) and process locally.
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("id, concept_slug")
    .is("node_id", null)
    .eq("is_live", true);
  if (error) throw new Error(`Bank query failed: ${error.message}`);

  // ── Classification (pure, unit-tested) ────────────────────
  const { toAccept, skippedIds } = classifyBankRowsForAccept(
    (data ?? []) as Array<{ id: string; concept_slug: string | null }>,
    nodeIdFromSlug
  );

  // ── Accept the matched rows in parallel ───────────────────
  // Was a sequential for-await loop — for a 50-row bank that's 50
  // sequential round-trips. Promise.all collapses the wall-clock
  // to ~max(individual round-trips). Per-row errors are still
  // recorded individually via the catch handler in each promise.
  const errors: Array<{ questionId: string; message: string }> = [];
  let accepted = 0;
  await Promise.all(
    toAccept.map(async ({ questionId, nodeId }) => {
      try {
        await acceptFlaggedQuestion(questionId, { nodeId });
        accepted++;
      } catch (err) {
        errors.push({
          questionId,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    })
  );

  revalidatePath("/admin/questions/review");
  revalidatePath("/admin/curriculum");
  return {
    accepted,
    skipped_no_slug_match: skippedIds.length,
    errored: errors.length,
    errors,
  };
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

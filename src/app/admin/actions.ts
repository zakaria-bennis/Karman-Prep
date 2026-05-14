"use server";

// ============================================================
// Server Actions — Admin curriculum UI
// Role-gated: admin only.
// ============================================================

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/queries/admin";
import {
  insertQuestion,
  updateQuestion,
  updateQuestionDifficulty,
  updateQuestionDifficultyLevel,
  reorderQuestions,
  deleteQuestion,
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
import type {
  AnswerLetter,
  AnswerSource,
  ImportFlagType,
  ImportStatus,
  QuizDifficulty,
  QuizQuestion,
  QuizDifficultyLevel,
} from "@/types/quiz";
import {
  isValidSlug,
  isValidDomain,
  clusterFromSlug,
  CLUSTER_BY_DOMAIN,
  type SATDomain,
} from "@/lib/question-bank/taxonomy";
import { levelToLegacyDifficulty } from "@/types/quiz";

async function guardAdmin(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  const ok = await requireRole(userId, ["admin"]);
  if (!ok) throw new Error("Admin role required");
  return userId;
}

export async function actionAddQuestion(input: NewQuestionInput) {
  await guardAdmin();
  const { question } = await insertQuestion(input);
  if (input.node_id) revalidatePath(`/admin/curriculum/${input.node_id}`);
  return question;
}

export async function actionUpdateQuestionDifficulty(
  questionId: string,
  difficulty: QuizDifficulty,
  nodeId: string
) {
  await guardAdmin();
  await updateQuestionDifficulty(questionId, difficulty);
  revalidatePath(`/admin/curriculum/${nodeId}`);
}

export async function actionUpdateQuestionDifficultyLevel(
  questionId: string,
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7
) {
  await guardAdmin();
  await updateQuestionDifficultyLevel(questionId, level);
}

export async function actionUpdateQuestion(
  questionId: string,
  patch: Partial<Pick<QuizQuestion, "question_text" | "difficulty" | "correct_answer" | "explanation_text" | "explanation_per_choice" | "hint" | "topic_cluster" | "desmos_strategy">>,
  nodeId: string
) {
  await guardAdmin();
  await updateQuestion(questionId, patch);
  revalidatePath(`/admin/curriculum/${nodeId}`);
}

// ── Content (textbook + video) actions ────────────────────

export async function actionSaveTextbook(nodeId: string, textbook: string) {
  const userId = await guardAdmin();
  await upsertTextbook(nodeId, textbook, userId);
  revalidatePath(`/admin/curriculum/${nodeId}`);
}

export async function actionSaveVideoURL(
  nodeId: string,
  videoUrl: string | null,
  durationSeconds: number | null
) {
  const userId = await guardAdmin();
  await upsertVideoURL(nodeId, videoUrl, durationSeconds, userId);
  revalidatePath(`/admin/curriculum/${nodeId}`);
}

export async function actionUploadVideo(
  nodeId: string,
  formData: FormData
): Promise<{ publicUrl: string }> {
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
  const userId = await guardAdmin();
  await deleteVideo(nodeId, storagePath, userId);
  revalidatePath(`/admin/curriculum/${nodeId}`);
}

export async function actionReorderQuestions(orderedIds: string[], nodeId: string) {
  await guardAdmin();
  await reorderQuestions(orderedIds);
  revalidatePath(`/admin/curriculum/${nodeId}`);
}

export async function actionDeleteQuestion(questionId: string, nodeId: string) {
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
  await guardAdmin();
  await removeQuestionImage(questionId, storagePath);
  revalidatePath(`/admin/curriculum/${nodeId}`);
}

export async function actionResolveFlaggedQuestion(flagId: string) {
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
  await guardAdmin();
  await acceptFlaggedQuestion(questionId, opts);
  revalidatePath("/admin/questions/review");
  if (opts.nodeId) revalidatePath(`/admin/curriculum/${opts.nodeId}`);
}

export async function actionRejectFlaggedQuestion(questionId: string): Promise<void> {
  await guardAdmin();
  await deleteQuestion(questionId);
  revalidatePath("/admin/questions/review");
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

  const { nodeIdFromSlug: nodeFromSlug } = await import("@/lib/question-bank/taxonomy");
  const supabase = (await import("@/lib/supabase/server")).createAdminClient();

  // Fetch every bank row: status=ok AND node_id IS NULL. We pull the
  // full id+slug list (cheap — just two columns) and process locally.
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("id, concept_slug")
    .is("node_id", null)
    .or("import_status.is.null,import_status.eq.ok");
  if (error) throw new Error(`Bank query failed: ${error.message}`);

  const result = { accepted: 0, skipped_no_slug_match: 0, errored: 0, errors: [] as Array<{ questionId: string; message: string }> };

  for (const row of data ?? []) {
    const qid = row.id as string;
    const slug = row.concept_slug as string | null;
    const nodeId = slug ? nodeFromSlug(slug) ?? null : null;
    if (!nodeId) {
      result.skipped_no_slug_match++;
      continue;
    }
    try {
      await acceptFlaggedQuestion(qid, { nodeId });
      result.accepted++;
    } catch (err) {
      result.errored++;
      result.errors.push({
        questionId: qid,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  revalidatePath("/admin/questions/review");
  revalidatePath("/admin/curriculum");
  return result;
}

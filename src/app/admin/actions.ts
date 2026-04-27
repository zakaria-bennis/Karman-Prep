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

/** Row shape accepted by the bulk importer. Supports both the legacy
 *  15-column template and the 30-column routine output. Every new
 *  field is optional; the importer derives sensible defaults when
 *  not provided and validates slugs/domains against the locked
 *  taxonomy in `lib/question-bank/taxonomy.ts`. */
export interface BulkImportRow {
  // Core (legacy + routine)
  question_text: string;
  choice_a?: string;
  choice_b?: string;
  choice_c?: string;
  choice_d?: string;
  /** Letter A/B/C/D for MC; numeric/expression string for SPR. */
  correct_answer: string;
  /** Either the legacy enum ("foundational"/"intermediate"/...)
   *  OR a numeric string "1"–"7" (the routine's source of truth). */
  difficulty: string;
  topic_cluster?: string;
  hint?: string;
  explanation_text: string;
  explanation_a?: string;
  explanation_b?: string;
  explanation_c?: string;
  explanation_d?: string;
  desmos_strategy?: string;

  // Ingestion-only fields (30-column routine output)
  passage_intro?: string;
  passage?: string;
  passage_a?: string;
  passage_b?: string;
  question_format?: "multiple_choice" | "numeric_entry";
  numeric_tolerance?: string;
  domain?: string;
  concept_slug?: string;
  answer_source?: AnswerSource;
  source_pdf?: string;
  source_page?: string | number;
  content_hash?: string;
  import_status?: ImportStatus;
  import_flag_type?: ImportFlagType;
  import_flag_reason?: string;
}

export interface BulkImportResult {
  inserted: number;
  skipped_duplicates: number;
  flagged_for_review: number;
  errored: number;
  errors: Array<{ row: number; message: string }>;
}

const LEGACY_LEVEL_MAP = {
  foundational: 2,
  intermediate: 4,
  advanced: 5,
  mastery: 6,
} as const;

/** Math domains live in the math lobe; everything else is reading. */
const MATH_DOMAINS = new Set<SATDomain>([
  "algebra",
  "advanced_math",
  "geometry",
  "data_analysis",
]);

function subjectFromDomain(domain: SATDomain): "reading" | "math" {
  return MATH_DOMAINS.has(domain) ? "math" : "reading";
}

function parseDifficulty(value: string | undefined): {
  level: QuizDifficultyLevel;
  legacy: QuizDifficulty;
} {
  if (!value) {
    return { level: 4, legacy: levelToLegacyDifficulty(4) };
  }
  const trimmed = value.trim();
  const asInt = Number.parseInt(trimmed, 10);
  if (!Number.isNaN(asInt) && asInt >= 1 && asInt <= 7) {
    const lvl = asInt as QuizDifficultyLevel;
    return { level: lvl, legacy: levelToLegacyDifficulty(lvl) };
  }
  if (trimmed in LEGACY_LEVEL_MAP) {
    const legacy = trimmed as QuizDifficulty;
    return { level: LEGACY_LEVEL_MAP[legacy] as QuizDifficultyLevel, legacy };
  }
  // Fall back to medium rather than throwing — a junk difficulty
  // value shouldn't block a row whose other fields are fine.
  return { level: 4, legacy: levelToLegacyDifficulty(4) };
}

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

  const result: BulkImportResult = {
    inserted: 0,
    skipped_duplicates: 0,
    flagged_for_review: 0,
    errored: 0,
    errors: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      // ── Validation ───────────────────────────────────────
      if (r.domain && !isValidDomain(r.domain)) {
        throw new Error(`unknown domain "${r.domain}"`);
      }
      if (r.concept_slug && !isValidSlug(r.concept_slug)) {
        throw new Error(`unknown concept_slug "${r.concept_slug}"`);
      }
      if (r.import_status === "needs_review" && !r.import_flag_reason?.trim()) {
        throw new Error("needs_review row missing import_flag_reason");
      }

      // ── Derive subject ───────────────────────────────────
      let rowSubject: "reading" | "math";
      if (subject) {
        rowSubject = subject;
      } else if (r.domain) {
        rowSubject = subjectFromDomain(r.domain as SATDomain);
      } else {
        throw new Error("row has no domain and no panel-level subject — cannot derive subject");
      }

      // ── Difficulty + format + question_type ──────────────
      const { level, legacy } = parseDifficulty(r.difficulty);
      const format = r.question_format ?? "multiple_choice";
      const question_type =
        rowSubject === "reading" ? "evidence_based" : "math_computation";

      // ── topic_cluster: prefer concept_slug → cluster map,
      //    fall back to CSV column, fall back to domain map. ──
      const cluster =
        (r.concept_slug && clusterFromSlug(r.concept_slug)) ||
        r.topic_cluster ||
        (r.domain && CLUSTER_BY_DOMAIN[r.domain as SATDomain]) ||
        "";

      // ── Per-choice explanations: drop the old reading-only
      //    gate; both math and R&W rows get them when present. ──
      const hasAnyChoiceExpl =
        r.explanation_a || r.explanation_b || r.explanation_c || r.explanation_d;
      const explanation_per_choice = hasAnyChoiceExpl
        ? {
            A: r.explanation_a,
            B: r.explanation_b,
            C: r.explanation_c,
            D: r.explanation_d,
          }
        : null;

      // ── Choices: only emit for MC rows. SPR rows leave them
      //    blank in the routine; insertQuestion will skip the
      //    answer_choices insert when format = numeric_entry. ──
      const choices =
        format === "multiple_choice"
          ? [
              { letter: "A" as AnswerLetter, choice_text: r.choice_a ?? "" },
              { letter: "B" as AnswerLetter, choice_text: r.choice_b ?? "" },
              { letter: "C" as AnswerLetter, choice_text: r.choice_c ?? "" },
              { letter: "D" as AnswerLetter, choice_text: r.choice_d ?? "" },
            ]
          : [];

      const numericTol =
        r.numeric_tolerance && r.numeric_tolerance.trim() !== ""
          ? Number.parseFloat(r.numeric_tolerance)
          : null;
      const sourcePage =
        r.source_page === undefined || r.source_page === ""
          ? null
          : typeof r.source_page === "number"
            ? r.source_page
            : Number.parseInt(r.source_page, 10);

      const { duplicateSkipped } = await insertQuestion({
        node_id: nodeId,
        question_text: r.question_text,
        question_type,
        difficulty: legacy,
        difficulty_level: level,
        answer_format: format,
        correct_answer: r.correct_answer,
        numeric_tolerance: numericTol,
        explanation_text: r.explanation_text,
        explanation_per_choice,
        hint: r.hint?.trim() || null,
        subject: rowSubject,
        topic_cluster: cluster,
        desmos_strategy: r.desmos_strategy?.trim() || null,
        choices,
        passage_intro: r.passage_intro || null,
        passage: r.passage || null,
        passage_a: r.passage_a || null,
        passage_b: r.passage_b || null,
        domain: r.domain || null,
        concept_slug: r.concept_slug || null,
        answer_source: r.answer_source ?? null,
        source_pdf: r.source_pdf || null,
        source_page: Number.isFinite(sourcePage as number) ? (sourcePage as number) : null,
        content_hash: r.content_hash || null,
        import_status: r.import_status ?? null,
        import_flag_type: r.import_flag_type ?? null,
        import_flag_reason: r.import_flag_reason || null,
      });

      if (duplicateSkipped) {
        result.skipped_duplicates++;
      } else if (r.import_status === "needs_review") {
        result.flagged_for_review++;
      } else {
        result.inserted++;
      }
    } catch (err) {
      result.errored++;
      result.errors.push({
        row: i + 2, // +2 = 1 for header row, 1 for 1-indexing in spreadsheets
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

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

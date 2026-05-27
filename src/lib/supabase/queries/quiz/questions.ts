// ============================================================
// Quiz CRUD — `quiz_questions` + `answer_choices` rows.
// Carved out of the old quiz.ts catch-all (audit M1).
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";
import { uploadToR2, deleteFromR2, safeFilename } from "@/lib/storage/r2";
import type {
  QuizQuestion,
  QuizQuestionWithChoices,
  AnswerChoice,
  AnswerLetter,
  AnswerSource,
  ImportFlagType,
  ImportStatus,
  QuizDifficulty,
} from "@/types/quiz";

// ── Live-question filter ─────────────────────────────────────
// PDF-imported questions land with import_status = 'needs_review'
// and must be hidden from students until an admin accepts them in
// /admin/questions/review. Existing rows pre-migration-020 have
// import_status = NULL, which also counts as live.
//
// As of migration 20260518004500 the database carries an `is_live`
// generated column equivalent to `import_status IS NULL OR
// import_status = 'ok'`, plus a partial index. New code should
// filter `.eq("is_live", true)` instead of the LIVE_FILTER string
// below — one column, one predicate, robust to future status
// values (audit findings CRIT-2 + HIGH-14). The string filter
// stays exported for back-compat with consumers that haven't
// migrated yet.
//
// supabase-js .or() syntax: comma-separated PostgREST clauses.
/** @deprecated Use `.eq("is_live", true)` instead. Same semantics,
 *  works through the new generated column + index, and stays
 *  correct when new import_status values are introduced. */
export const LIVE_FILTER = "import_status.is.null,import_status.eq.ok";

// ── Question catalog ──────────────────────────────────────────

/** Fetch questions for a curriculum node.
 *  Defaults to live-only (hides `needs_review` flagged questions).
 *  Pass `{ includeFlagged: true }` from admin contexts that need
 *  to see everything. */
export async function fetchQuestionsForNode(
  nodeId: string,
  opts: { includeFlagged?: boolean } = {}
): Promise<QuizQuestionWithChoices[]> {
  const supabase = createAdminClient();
  let query = supabase.from("quiz_questions").select("*, answer_choices(*)").eq("node_id", nodeId);
  if (!opts.includeFlagged) query = query.eq("is_live", true);
  const { data, error } = await query
    .order("display_order", { ascending: true })
    .order("difficulty", { ascending: true });
  if (error) throw error;
  return (data ?? []) as QuizQuestionWithChoices[];
}

export async function fetchAllQuestionsForAdmin(): Promise<QuizQuestionWithChoices[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .order("node_id", { ascending: true })
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as QuizQuestionWithChoices[];
}

export interface NewQuestionInput {
  /** Null for PDF-imported questions that live in the bank
   *  until an admin assigns a node in /admin/questions/review. */
  node_id: string | null;
  question_text: string;
  question_type: QuizQuestion["question_type"];
  difficulty: QuizDifficulty;
  difficulty_level: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  answer_format: "multiple_choice" | "numeric_entry";
  correct_answer: string; // letter for MC, numeric string for numeric_entry
  numeric_tolerance: number | null;
  explanation_text: string;
  explanation_per_choice: Partial<Record<AnswerLetter, string>> | null;
  hint: string | null;
  subject: QuizQuestion["subject"];
  topic_cluster: string;
  desmos_strategy: string | null;
  choices: { letter: AnswerLetter; choice_text: string }[]; // ignored when answer_format = 'numeric_entry'
  display_order?: number;

  // ── Ingestion fields (migration 020) ───────────────────────
  passage_intro?: string | null;
  passage?: string | null;
  passage_a?: string | null;
  passage_b?: string | null;
  domain?: string | null;
  concept_slug?: string | null;
  answer_source?: AnswerSource | null;
  source_pdf?: string | null;
  source_page?: number | null;
  content_hash?: string | null;
  import_status?: ImportStatus | null;
  import_flag_type?: ImportFlagType | null;
  import_flag_reason?: string | null;

  // ── Question figure (migration 004) ───────────────────────
  image_url?: string | null;
  image_storage_path?: string | null;
  image_alt?: string | null;
}

export interface InsertQuestionResult {
  question: QuizQuestionWithChoices;
  /** True when (source_pdf, content_hash) already existed and the
   *  insert was skipped per the spec's "silently skip on conflict"
   *  decision. The returned `question` is the existing row. */
  duplicateSkipped: boolean;
}

export async function insertQuestion(input: NewQuestionInput): Promise<InsertQuestionResult> {
  const supabase = createAdminClient();

  // ── Idempotent re-import: when both source_pdf and content_hash
  //    are set, look up an existing row first and bail silently
  //    if found. The unique index in migration 020 also enforces
  //    this at the DB level — this lookup just lets us return the
  //    existing row instead of catching a duplicate-key error.
  if (input.source_pdf && input.content_hash) {
    const { data: existing, error: dupErr } = await supabase
      .from("quiz_questions")
      .select("*, answer_choices(*)")
      .eq("source_pdf", input.source_pdf)
      .eq("content_hash", input.content_hash)
      .maybeSingle();
    if (dupErr) throw dupErr;
    if (existing) {
      return { question: existing as QuizQuestionWithChoices, duplicateSkipped: true };
    }
  }

  const { data: question, error: qErr } = await supabase
    .from("quiz_questions")
    .insert({
      node_id: input.node_id,
      question_text: input.question_text,
      question_type: input.question_type,
      difficulty: input.difficulty,
      difficulty_level: input.difficulty_level,
      answer_format: input.answer_format,
      correct_answer: input.correct_answer,
      numeric_tolerance: input.numeric_tolerance,
      explanation_text: input.explanation_text,
      explanation_per_choice: input.explanation_per_choice,
      hint: input.hint,
      subject: input.subject,
      topic_cluster: input.topic_cluster,
      desmos_strategy: input.desmos_strategy,
      display_order: input.display_order ?? 0,
      passage_intro: input.passage_intro ?? null,
      passage: input.passage ?? null,
      passage_a: input.passage_a ?? null,
      passage_b: input.passage_b ?? null,
      domain: input.domain ?? null,
      concept_slug: input.concept_slug ?? null,
      answer_source: input.answer_source ?? null,
      source_pdf: input.source_pdf ?? null,
      source_page: input.source_page ?? null,
      content_hash: input.content_hash ?? null,
      import_status: input.import_status ?? null,
      import_flag_type: input.import_flag_type ?? null,
      import_flag_reason: input.import_flag_reason ?? null,
      image_url: input.image_url ?? null,
      image_storage_path: input.image_storage_path ?? null,
      image_alt: input.image_alt ?? null,
    })
    .select()
    .single();

  if (qErr || !question) throw qErr ?? new Error("Failed to insert question");

  // Only MC questions have 4 choices
  let choices: AnswerChoice[] = [];
  if (input.answer_format === "multiple_choice") {
    const choicesToInsert = input.choices.map((c) => ({
      question_id: question.id,
      letter: c.letter,
      choice_text: c.choice_text,
      // v2 phase 5: at creation time the user-entered text IS the raw
      // text. Phase 5 may later diverge choice_text from raw_choice_text
      // for verified auto-repairs.
      raw_choice_text: c.choice_text,
      is_correct: c.letter === input.correct_answer,
    }));

    const { data: chData, error: cErr } = await supabase
      .from("answer_choices")
      .insert(choicesToInsert)
      .select();

    if (cErr) throw cErr;
    choices = (chData ?? []) as AnswerChoice[];
  }

  return {
    question: { ...(question as QuizQuestion), answer_choices: choices },
    duplicateSkipped: false,
  };
}

export async function updateQuestionDifficulty(
  questionId: string,
  difficulty: QuizDifficulty
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("quiz_questions")
    .update({ difficulty, updated_at: new Date().toISOString() })
    .eq("id", questionId);
  if (error) throw error;
}

/** Set a question's 1-7 difficulty level. Also updates the legacy enum so old readers stay in sync. */
export async function updateQuestionDifficultyLevel(
  questionId: string,
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7
): Promise<void> {
  const supabase = createAdminClient();
  const legacy: QuizDifficulty =
    level <= 2 ? "foundational" : level <= 4 ? "intermediate" : level <= 6 ? "advanced" : "mastery";
  const { error } = await supabase
    .from("quiz_questions")
    .update({ difficulty_level: level, difficulty: legacy, updated_at: new Date().toISOString() })
    .eq("id", questionId);
  if (error) throw error;
}

export async function updateQuestion(
  questionId: string,
  patch: Partial<
    Pick<
      QuizQuestion,
      | "question_text"
      | "difficulty"
      | "difficulty_level"
      | "answer_format"
      | "correct_answer"
      | "numeric_tolerance"
      | "explanation_text"
      | "explanation_per_choice"
      | "hint"
      | "topic_cluster"
      | "desmos_strategy"
      | "display_order"
      | "image_url"
      | "image_storage_path"
      | "image_alt"
    >
  >
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("quiz_questions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", questionId);
  if (error) throw error;
}

export async function reorderQuestions(orderedIds: string[]): Promise<void> {
  const supabase = createAdminClient();
  const updates = orderedIds.map((id, idx) =>
    supabase.from("quiz_questions").update({ display_order: idx }).eq("id", id)
  );
  await Promise.all(updates);
}

export async function deleteQuestion(questionId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("quiz_questions").delete().eq("id", questionId);
  if (error) throw error;
}

/** Bulk-delete a set of questions in a single round trip. Used by
 *  /admin/questions/review's "Reject N selected" action.
 *  Returns the number of rows that actually existed and were
 *  removed; callers compare this against the requested count to
 *  surface "X of Y already gone" warnings if needed. */
export async function deleteQuestions(questionIds: string[]): Promise<number> {
  if (questionIds.length === 0) return 0;
  const supabase = createAdminClient();
  const { error, count } = await supabase
    .from("quiz_questions")
    .delete({ count: "exact" })
    .in("id", questionIds);
  if (error) throw error;
  return count ?? 0;
}

// ── Question image upload / remove (R2-backed) ──────────────
// Storage moved from Supabase Storage to Cloudflare R2 — same
// table fields (image_url, image_storage_path, image_alt) so
// existing rows that still point at Supabase URLs keep working
// during the migration window. New uploads land in R2.

export async function uploadQuestionImage(
  questionId: string,
  fileName: string,
  fileBytes: ArrayBuffer,
  contentType: string,
  alt: string | null
): Promise<{ publicUrl: string; storagePath: string }> {
  const supabase = createAdminClient();
  const key = `question-images/${questionId}/${Date.now()}-${safeFilename(fileName)}`;

  const { publicUrl, storagePath } = await uploadToR2({
    key,
    body: fileBytes,
    contentType,
  });

  await supabase
    .from("quiz_questions")
    .update({
      image_url: publicUrl,
      image_storage_path: storagePath,
      image_alt: alt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", questionId);

  return { publicUrl, storagePath };
}

export async function removeQuestionImage(
  questionId: string,
  storagePath: string | null
): Promise<void> {
  const supabase = createAdminClient();

  if (storagePath) {
    // R2 keys start with "question-images/"; legacy Supabase Storage
    // paths look like "<questionId>/<timestamp>-<filename>" with no
    // bucket prefix. Detect which provider hosts the file.
    if (storagePath.startsWith("question-images/")) {
      await deleteFromR2(storagePath).catch(() => {
        // Don't fail the row update if the object was already gone.
      });
    } else {
      await supabase.storage
        .from("question-images")
        .remove([storagePath])
        .catch(() => {});
    }
  }

  await supabase
    .from("quiz_questions")
    .update({
      image_url: null,
      image_storage_path: null,
      image_alt: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", questionId);
}

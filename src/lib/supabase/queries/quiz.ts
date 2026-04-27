// ============================================================
// Supabase queries — Quiz & Lesson system
// Named, typed query functions. No inline Supabase calls in components.
// All queries use the admin (service-role) client; invoked only from
// Server Components, Server Actions, or API routes.
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";
import type {
  QuizQuestion,
  QuizQuestionWithChoices,
  AnswerChoice,
  QuizAttempt,
  QuestionResponse,
  AdaptiveStep,
  AnswerLetter,
  AnswerSource,
  ImportFlagType,
  ImportStatus,
  QuizDifficulty,
  ConfidenceBand,
  FlaggedQuestion,
} from "@/types/quiz";

// ── Live-question filter ─────────────────────────────────────
// PDF-imported questions land with import_status = 'needs_review'
// and must be hidden from students until an admin accepts them
// in /admin/questions/review. Existing rows pre-migration-020 have
// import_status = NULL, which also counts as live.
//
// supabase-js .or() syntax: comma-separated PostgREST clauses.
const LIVE_FILTER = "import_status.is.null,import_status.eq.ok";

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
  let query = supabase
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .eq("node_id", nodeId);
  if (!opts.includeFlagged) query = query.or(LIVE_FILTER);
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
  correct_answer: string;             // letter for MC, numeric string for numeric_entry
  numeric_tolerance: number | null;
  explanation_text: string;
  explanation_per_choice: Partial<Record<AnswerLetter, string>> | null;
  hint: string | null;
  subject: QuizQuestion["subject"];
  topic_cluster: string;
  desmos_strategy: string | null;
  choices: { letter: AnswerLetter; choice_text: string }[];  // ignored when answer_format = 'numeric_entry'
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
    level <= 2 ? "foundational" :
    level <= 4 ? "intermediate" :
    level <= 6 ? "advanced" :
                 "mastery";
  const { error } = await supabase
    .from("quiz_questions")
    .update({ difficulty_level: level, difficulty: legacy, updated_at: new Date().toISOString() })
    .eq("id", questionId);
  if (error) throw error;
}

export async function updateQuestion(
  questionId: string,
  patch: Partial<Pick<QuizQuestion, "question_text" | "difficulty" | "difficulty_level" | "answer_format" | "correct_answer" | "numeric_tolerance" | "explanation_text" | "explanation_per_choice" | "hint" | "topic_cluster" | "desmos_strategy" | "display_order" | "image_url" | "image_storage_path" | "image_alt">>
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

// ── Ingestion-flow selectors (for /admin/questions/review) ──

export interface QuestionReviewFilter {
  flag_type?: ImportFlagType;
  domain?: string;
  source_pdf?: string;
}

/** All questions whose import_status = 'needs_review', filterable by
 *  flag_type / domain / source_pdf. Powers /admin/questions/review. */
export async function selectQuestionsNeedingReview(
  filter: QuestionReviewFilter = {}
): Promise<QuizQuestionWithChoices[]> {
  const supabase = createAdminClient();
  let q = supabase
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .eq("import_status", "needs_review");
  if (filter.flag_type)  q = q.eq("import_flag_type", filter.flag_type);
  if (filter.domain)     q = q.eq("domain", filter.domain);
  if (filter.source_pdf) q = q.eq("source_pdf", filter.source_pdf);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as QuizQuestionWithChoices[];
}

/** Distinct list of source_pdf values currently in needs_review.
 *  Powers the PDF dropdown in /admin/questions/review. */
export async function selectNeedsReviewSourcePdfs(): Promise<string[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("source_pdf")
    .eq("import_status", "needs_review")
    .not("source_pdf", "is", null);
  if (error) throw error;
  const set = new Set<string>();
  for (const r of (data ?? []) as { source_pdf: string }[]) set.add(r.source_pdf);
  return [...set].sort();
}

/** Live bank questions with no node_id assigned. Admin uses these
 *  in the Review UI to pick a node before sending the question live
 *  in a specific Learn quiz pool. */
export async function selectBankQuestions(): Promise<QuizQuestionWithChoices[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .is("node_id", null)
    .or(LIVE_FILTER)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as QuizQuestionWithChoices[];
}

/** Accept a flagged question — flips it to live and clears flag fields.
 *  Optionally assigns a node_id at the same time. */
export async function acceptFlaggedQuestion(
  questionId: string,
  opts: { nodeId?: string | null } = {}
): Promise<void> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {
    import_status: "ok",
    import_flag_type: null,
    import_flag_reason: null,
    updated_at: new Date().toISOString(),
  };
  if (opts.nodeId !== undefined) patch.node_id = opts.nodeId;
  const { error } = await supabase
    .from("quiz_questions")
    .update(patch)
    .eq("id", questionId);
  if (error) throw error;
}

// ── Question image upload / remove (R2-backed) ──────────────
// Storage moved from Supabase Storage to Cloudflare R2 — same
// table fields (image_url, image_storage_path, image_alt) so
// existing rows that still point at Supabase URLs keep working
// during the migration window. New uploads land in R2.

import { uploadToR2, deleteFromR2, safeFilename } from "@/lib/storage/r2";

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
      await supabase.storage.from("question-images").remove([storagePath]).catch(() => {});
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

// ── Quiz attempts ──────────────────────────────────────────────

export async function createQuizAttempt(
  studentId: string,
  nodeId: string
): Promise<QuizAttempt> {
  const supabase = createAdminClient();

  const { count } = await supabase
    .from("quiz_attempts")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("node_id", nodeId);

  const { data, error } = await supabase
    .from("quiz_attempts")
    .insert({
      student_id: studentId,
      node_id: nodeId,
      attempt_number: (count ?? 0) + 1,
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error("Failed to create quiz attempt");
  return data as QuizAttempt;
}

export async function finalizeQuizAttempt(
  attemptId: string,
  input: {
    score: number;
    questions_answered: number;
    questions_correct: number;
    confidence_band: ConfidenceBand;
    adaptive_path: AdaptiveStep[];
  }
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("quiz_attempts")
    .update({
      score: input.score,
      questions_answered: input.questions_answered,
      questions_correct: input.questions_correct,
      confidence_band: input.confidence_band,
      adaptive_path: input.adaptive_path,
      completed_at: new Date().toISOString(),
    })
    .eq("id", attemptId);
  if (error) throw error;
}

export async function recordQuestionResponse(input: {
  attempt_id: string;
  question_id: string;
  student_answer: AnswerLetter;
  is_correct: boolean;
  difficulty_at_time: QuizDifficulty;
  response_time_seconds: number;
}): Promise<QuestionResponse> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("question_responses")
    .insert(input)
    .select()
    .single();
  if (error || !data) throw error ?? new Error("Failed to record response");
  return data as QuestionResponse;
}

export async function fetchAttemptsForNode(
  studentId: string,
  nodeId: string
): Promise<QuizAttempt[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("student_id", studentId)
    .eq("node_id", nodeId)
    .order("attempt_number", { ascending: false });
  if (error) throw error;
  return (data ?? []) as QuizAttempt[];
}

export async function fetchAllAttemptsForStudent(studentId: string): Promise<QuizAttempt[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("student_id", studentId)
    .order("started_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as QuizAttempt[];
}

export async function fetchResponsesForAttempt(
  attemptId: string
): Promise<QuestionResponse[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("question_responses")
    .select("*")
    .eq("attempt_id", attemptId)
    .order("answered_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as QuestionResponse[];
}

// ── Flagging ──────────────────────────────────────────────────

export async function flagQuestion(input: {
  question_id: string;
  student_id: string;
  node_id: string;
  flag_note: string | null;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("flagged_questions").insert(input);
  if (error) throw error;
}

export async function fetchFlaggedQuestions(): Promise<
  Array<FlaggedQuestion & { question: QuizQuestionWithChoices | null }>
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("flagged_questions")
    .select("*, question:quiz_questions(*, answer_choices(*))")
    .eq("resolved", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Array<FlaggedQuestion & { question: QuizQuestionWithChoices | null }>;
}

export async function fetchFlaggedQuestionsForStudent(
  studentId: string
): Promise<Array<FlaggedQuestion & { question: QuizQuestionWithChoices | null }>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("flagged_questions")
    .select("*, question:quiz_questions(*, answer_choices(*))")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Array<FlaggedQuestion & { question: QuizQuestionWithChoices | null }>;
}

export async function resolveFlaggedQuestion(
  flagId: string,
  resolvedBy: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("flagged_questions")
    .update({
      resolved: true,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", flagId);
  if (error) throw error;
}

// ── Node status helpers ──────────────────────────────────────

export async function updateNodeAfterQuiz(
  studentId: string,
  nodeId: string,
  score: number,
  band: ConfidenceBand
): Promise<{ newStatus: "in_progress" | "partially_complete" | "mastered" }> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("learn_node_status")
    .select("status, best_quiz_score, consecutive_passes")
    .eq("user_id", studentId)
    .eq("node_id", nodeId)
    .single();

  const bestBefore: number = existing?.best_quiz_score ?? 0;
  const consecutiveBefore: number = existing?.consecutive_passes ?? 0;
  const passed = score >= 80;

  let newStatus: "in_progress" | "partially_complete" | "mastered";
  let consecutive = consecutiveBefore;

  if (passed) {
    consecutive = consecutiveBefore + 1;
    if (consecutive >= 2) newStatus = "mastered";
    else newStatus = "partially_complete";
  } else {
    consecutive = 0;
    newStatus = "in_progress";
  }

  await supabase.from("learn_node_status").upsert({
    user_id: studentId,
    node_id: nodeId,
    status: newStatus,
    last_quiz_score: score,
    best_quiz_score: Math.max(bestBefore, score),
    consecutive_passes: consecutive,
    confidence_band: band,
    attempts: ((existing as { attempts?: number } | null)?.attempts ?? 0) + 1,
    updated_at: new Date().toISOString(),
    completed_at: newStatus === "mastered" ? new Date().toISOString() : null,
  });

  // Placeholder hook for Prompt 3 (spaced repetition decay reset)
  await maybeResetNodeDecay(studentId, nodeId, newStatus);

  return { newStatus };
}

/**
 * Spaced-repetition decay reset — placeholder for Prompt 3.
 * Will schedule the next review interval once spaced-rep logic lands.
 */
export async function maybeResetNodeDecay(
  _studentId: string,
  _nodeId: string,
  _status: string
): Promise<void> {
  // Intentionally empty. Prompt 3 will implement the SR algorithm.
}

export async function updateWatchPercentage(
  studentId: string,
  nodeId: string,
  percentage: number
): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("learn_node_status").upsert({
    user_id: studentId,
    node_id: nodeId,
    watch_percentage: Math.max(0, Math.min(100, Math.round(percentage))),
    updated_at: new Date().toISOString(),
  });
}

export async function fetchNodeStatusBundle(
  studentId: string,
  nodeId: string
): Promise<{
  status: string | null;
  best_quiz_score: number | null;
  watch_percentage: number | null;
  confidence_band: ConfidenceBand | null;
  attempts: QuizAttempt[];
}> {
  const supabase = createAdminClient();

  const [statusRes, attempts] = await Promise.all([
    supabase
      .from("learn_node_status")
      .select("status, best_quiz_score, watch_percentage, confidence_band")
      .eq("user_id", studentId)
      .eq("node_id", nodeId)
      .maybeSingle(),
    fetchAttemptsForNode(studentId, nodeId),
  ]);

  return {
    status: statusRes.data?.status ?? null,
    best_quiz_score: statusRes.data?.best_quiz_score ?? null,
    watch_percentage: statusRes.data?.watch_percentage ?? null,
    confidence_band: (statusRes.data?.confidence_band as ConfidenceBand | null) ?? null,
    attempts,
  };
}

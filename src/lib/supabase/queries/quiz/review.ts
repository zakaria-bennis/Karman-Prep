// ============================================================
// Ingestion-flow selectors for /admin/questions/review.
// Carved out of the old quiz.ts catch-all (audit M1).
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";
import type { QuizQuestionWithChoices, ImportFlagType } from "@/types/quiz";
import { isValidNodeId } from "@/lib/question-bank/taxonomy";
import { LIVE_FILTER } from "./questions";

type QuizQuestionUpdate = Database["public"]["Tables"]["quiz_questions"]["Update"];

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
  if (filter.flag_type) q = q.eq("import_flag_type", filter.flag_type);
  if (filter.domain) q = q.eq("domain", filter.domain);
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
 *  Optionally assigns a node_id at the same time.
 *
 *  When nodeId is a string, it MUST match a real curriculum node
 *  (CRIT-6). Otherwise the question gets written tied to a topic
 *  that doesn't exist — orphan, invisible to students AND admins.
 *  Passing `null` explicitly clears the node_id (separate intent
 *  from "skip the assignment"); we let null through. `undefined`
 *  means "don't touch node_id," same as before. */
export async function acceptFlaggedQuestion(
  questionId: string,
  opts: { nodeId?: string | null } = {}
): Promise<void> {
  if (typeof opts.nodeId === "string" && !isValidNodeId(opts.nodeId)) {
    throw new Error(
      `acceptFlaggedQuestion: nodeId "${opts.nodeId}" is not a curriculum node — ` +
        "refusing to write an orphan."
    );
  }
  const supabase = createAdminClient();
  const patch: QuizQuestionUpdate = {
    import_status: "ok",
    import_flag_type: null,
    import_flag_reason: null,
    updated_at: new Date().toISOString(),
  };
  if (opts.nodeId !== undefined) patch.node_id = opts.nodeId;
  const { error } = await supabase.from("quiz_questions").update(patch).eq("id", questionId);
  if (error) throw error;
}

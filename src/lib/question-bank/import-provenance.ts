import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { ImportQuestionInput } from "./import-core";
import { validateReviewedAnswer } from "./reviewed-answer";
export type { ReviewedAnswerProvenance } from "./reviewed-answer";

/** Keep the printed key distinct from the independently solved active answer. */
export async function writeImportAnswerProvenance(
  supabase: SupabaseClient<Database>,
  questionId: string,
  row: ImportQuestionInput
): Promise<string[]> {
  if (row.reviewed_answer) {
    const invalid = validateReviewedAnswer(
      row.reviewed_answer,
      row.correct_answer,
      row.import_status === "needs_review"
    );
    if (invalid.length) return invalid;
  }
  const generated = row.reviewed_answer?.kind === "independently_confirmed_generated";
  const printed = generated
    ? null
    : (row.reviewed_answer?.printed_answer ?? row.correct_answer.trim());
  const status = generated ? "missing_answer_key" : "printed_key_used_no_correction";
  const disputed = Boolean(row.reviewed_answer && printed !== row.correct_answer.trim());
  const errors: string[] = [];
  const { error: keyError } = await supabase.from("answer_key_entries").insert({
    question_id: questionId,
    printed_answer: printed,
    printed_answer_crossed_out: false,
    manual_correction_present: false,
    selected_official_answer: printed,
    selection_reason: generated
      ? "independently_confirmed_generated_official_mapping_unavailable"
      : row.reviewed_answer
        ? "preserved_printed_key_with_separate_independent_solution"
        : "phase1_seed_from_printed_correct_answer",
    status,
    section: row.source_section ?? null,
    module: row.source_module ?? null,
    source_question_number: row.source_question_number ?? null,
    source_version: row.source_version ?? null,
    source_occurrence: row.source_occurrence ?? null,
    raw_model_response: generated
      ? { ...row.reviewed_answer, official_answer_available: false }
      : (row.reviewed_answer?.evidence ?? null),
    review_required: disputed,
    review_reason: generated
      ? "Independent reviews agree; official answer mapping remains unavailable"
      : disputed
        ? "Independent solution differs from preserved printed key"
        : null,
  });
  if (keyError) errors.push(`answer_key_entries insert (non-fatal): ${keyError.message}`);
  const { error: mirrorError } = await supabase
    .from("quiz_questions")
    .update({
      selected_official_answer: printed,
      answer_key_status: status,
    })
    .eq("id", questionId);
  if (mirrorError) errors.push(`answer_key mirror (non-fatal): ${mirrorError.message}`);
  return errors;
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase";
import type { ImportQuestionInput } from "./import-core";

export interface ReviewedAnswerProvenance {
  printed_answer: string;
  independently_verified_answer: string;
  evidence: Json;
}

/** Keep the printed key distinct from the independently solved active answer. */
export async function writeImportAnswerProvenance(
  supabase: SupabaseClient<Database>,
  questionId: string,
  row: ImportQuestionInput
): Promise<string[]> {
  const printed = row.reviewed_answer?.printed_answer ?? row.correct_answer.trim();
  const errors: string[] = [];
  const { error: keyError } = await supabase.from("answer_key_entries").insert({
    question_id: questionId,
    printed_answer: printed,
    printed_answer_crossed_out: false,
    manual_correction_present: false,
    selected_official_answer: printed,
    selection_reason: row.reviewed_answer
      ? "preserved_printed_key_with_separate_independent_solution"
      : "phase1_seed_from_printed_correct_answer",
    status: "printed_key_used_no_correction",
    section: row.source_section ?? null,
    module: row.source_module ?? null,
    source_question_number: row.source_question_number ?? null,
    source_version: row.source_version ?? null,
    source_occurrence: row.source_occurrence ?? null,
    raw_model_response: row.reviewed_answer?.evidence ?? null,
    review_required: Boolean(row.reviewed_answer && printed !== row.correct_answer.trim()),
    review_reason:
      row.reviewed_answer && printed !== row.correct_answer.trim()
        ? "Independent solution differs from preserved printed key"
        : null,
  });
  if (keyError) errors.push(`answer_key_entries insert (non-fatal): ${keyError.message}`);
  const { error: mirrorError } = await supabase
    .from("quiz_questions")
    .update({
      selected_official_answer: printed,
      answer_key_status: "printed_key_used_no_correction",
    })
    .eq("id", questionId);
  if (mirrorError) errors.push(`answer_key mirror (non-fatal): ${mirrorError.message}`);
  return errors;
}

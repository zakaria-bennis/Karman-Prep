import type { ImportQuestionInput, ImportQuestionOptions } from "./import-core";

/** The opt-in writer mode does not bypass reviewed input or source identity. */
export function validatePrivateDraftInput(
  row: ImportQuestionInput,
  options: ImportQuestionOptions
): string[] {
  if (!options.privateDraft) return [];
  const errors: string[] = [];
  if (options.difficultyPolicy !== "reviewed" || !row.reviewed_answer)
    errors.push("private draft requires reviewed difficulty and explicit answer provenance");
  if (
    !row.source_version ||
    row.source_identity_required !== true ||
    !row.source_section ||
    !row.source_module ||
    !Number.isInteger(row.source_question_number) ||
    (row.source_question_number ?? 0) < 1 ||
    !Number.isInteger(row.source_occurrence) ||
    (row.source_occurrence ?? 0) < 1
  )
    errors.push("private draft requires complete stable source identity");
  return errors;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================
// import-json-direct-row — pure adapter that converts a single
// extractor JSON row into an ImportQuestionInput.
//
// Lives in its own module so vitest can import it without
// triggering the CLI side-effects (env-check, process.exit,
// Supabase client construction) at module load.
//
// This file is THE place where the source_pdf injection for
// the Phase 8.1 hotfix happens. The extractor's responseSchema
// in extract-with-gemini.mjs deliberately omits source_pdf
// (it'd repeat per row), so the import side has to inject
// the value from the PDF path passed on the orchestrator's CLI.
// ============================================================

import { importQuestion, type ImportQuestionInput } from "@/lib/question-bank/import-core";
import { isValidDomain, type SATDomain } from "@/lib/question-bank/taxonomy";
import type { AnswerSource, ImportFlagType, ImportStatus } from "@/types/quiz";

export { importQuestion };

export function rowToImportInput(
  row: Record<string, any>,
  defaultSourcePdf: string,
  sourceVersion?: string
): ImportQuestionInput | { error: string } {
  if (!row.domain || !isValidDomain(String(row.domain))) {
    return { error: `unknown or missing domain "${row.domain}"` };
  }
  // Every downstream pipeline stage scopes work by the CLI source file.
  // A stale or hand-edited row override would insert a question that those
  // stages never process, so reject it before any database write.
  if (row.source_pdf != null && row.source_pdf !== defaultSourcePdf) {
    return { error: `source_pdf must match source file "${defaultSourcePdf}"` };
  }
  const sectionRaw = String(
    row.source_section ?? row.occurrence?.section ?? row.section ?? ""
  ).toLowerCase();
  const source_section =
    sectionRaw === "math"
      ? "math"
      : ["reading", "reading_writing", "reading and writing", "rw"].includes(sectionRaw)
        ? "reading"
        : undefined;
  const moduleRaw = String(
    row.source_module ?? row.occurrence?.module ?? row.module ?? row.module_number ?? ""
  ).toUpperCase();
  const source_module = ["1", "M1", "MODULE 1"].includes(moduleRaw)
    ? "M1"
    : ["2", "M2", "MODULE 2"].includes(moduleRaw)
      ? "M2"
      : undefined;
  const source_question_number = Number(
    row.source_question_number ?? row.occurrence?.visibleQuestionNumber ?? row.question_number
  );
  const source_occurrence = Number(
    row.source_occurrence ?? row.occurrence?.occurrenceIndex ?? row.occurrence_index
  );
  const hasIdentity =
    sourceVersion &&
    source_section &&
    source_module &&
    Number.isInteger(source_question_number) &&
    source_question_number > 0 &&
    Number.isInteger(source_occurrence) &&
    source_occurrence > 0;
  const missingIdentity = Boolean(sourceVersion && !hasIdentity);
  return {
    question_text: String(row.question_text ?? ""),
    correct_answer: String(row.correct_answer ?? ""),
    domain: row.domain as SATDomain,
    choice_a: row.choice_a,
    choice_b: row.choice_b,
    choice_c: row.choice_c,
    choice_d: row.choice_d,
    choice_tables: row.choice_tables,
    figure_kind: row.figure_kind,
    figure_table_data: row.figure_table_data,
    difficulty: row.difficulty,
    question_format: row.question_format,
    numeric_tolerance: row.numeric_tolerance,
    // Phase 8.1 source_pdf hotfix: the extractor's responseSchema in
    // extract-with-gemini.mjs deliberately omits source_pdf, so we
    // inject it here from the PDF path passed via CLI. The
    // A matching explicit value is accepted; an empty or different
    // value was rejected above.
    source_pdf: defaultSourcePdf,
    source_page:
      row.source_page ??
      (Number.isInteger(row.occurrence?.pageIndexStart)
        ? row.occurrence.pageIndexStart + 1
        : undefined),
    content_hash: row.content_hash,
    source_provider: row.source_provider ?? row.sourceDocument?.provider,
    source_identity_required: Boolean(sourceVersion),
    source_document_id: row.source_document_id ?? row.sourceDocument?.fileId,
    source_provider_version_id: row.source_provider_version_id ?? row.sourceVersion?.boxVersionId,
    source_version: hasIdentity ? sourceVersion : undefined,
    source_section: hasIdentity ? source_section : undefined,
    source_module: hasIdentity ? source_module : undefined,
    source_question_number: hasIdentity ? source_question_number : undefined,
    source_occurrence: hasIdentity ? source_occurrence : undefined,
    source_regions: hasIdentity ? (row.source_regions ?? row.occurrence?.regions) : undefined,
    concept_slug: row.concept_slug,
    topic_cluster: row.topic_cluster,
    passage_intro: row.passage_intro,
    passage: row.passage,
    passage_a: row.passage_a,
    passage_b: row.passage_b,
    explanation_text: row.explanation_text,
    explanation_a: row.explanation_a,
    explanation_b: row.explanation_b,
    explanation_c: row.explanation_c,
    explanation_d: row.explanation_d,
    desmos_strategy: row.desmos_strategy,
    hint: row.hint,
    answer_source: row.answer_source as AnswerSource | undefined,
    import_status: (missingIdentity ? "needs_review" : row.import_status) as
      | ImportStatus
      | undefined,
    import_flag_type: row.import_flag_type as ImportFlagType | undefined,
    import_flag_reason: missingIdentity
      ? [row.import_flag_reason, "Missing stable source question identity"]
          .filter(Boolean)
          .join("; ")
      : row.import_flag_reason,
    // The orchestrator pre-uploads images to R2 via extract-figures.mjs,
    // so image_url is already a public R2 URL by the time we get here.
    // No data-URL materialization needed (that's bulk-import's job).
    image_url: row.image_url ?? null,
    image_alt: row.image_alt,
  };
}

/** Validate the whole extracted batch before its first database write.
 * Duplicate source identities cannot be resolved by retrying or by UUID
 * order; an isolated import must stop and be corrected upstream. */
export function preflightImportRows(
  rows: Array<Record<string, any>>,
  sourcePdf: string,
  sourceVersion: string,
  requireIdentity = false
): { inputs: ImportQuestionInput[]; errors: string[] } {
  const inputs: ImportQuestionInput[] = [];
  const errors: string[] = [];
  const seen = new Map<string, number>();
  rows.forEach((row, index) => {
    if (
      row.sourceVersion?.sha256 &&
      String(row.sourceVersion.sha256).toLowerCase() !== sourceVersion
    ) {
      errors.push(`row ${index + 1}: source version checksum differs from source file`);
    }
    const input = rowToImportInput(row, sourcePdf, sourceVersion);
    if ("error" in input) {
      errors.push(`row ${index + 1}: ${input.error}`);
      return;
    }
    inputs.push(input);
    if (!input.source_version) {
      if (requireIdentity) errors.push(`row ${index + 1}: missing stable source identity`);
      return;
    }
    const key = JSON.stringify([
      input.source_version,
      input.source_section,
      input.source_module,
      input.source_question_number,
      input.source_occurrence,
    ]);
    const first = seen.get(key);
    if (first !== undefined)
      errors.push(`rows ${first} and ${index + 1}: duplicate source identity`);
    else seen.set(key, index + 1);
  });
  return { inputs, errors };
}

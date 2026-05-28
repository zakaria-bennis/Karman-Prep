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
  defaultSourcePdf: string
): ImportQuestionInput | { error: string } {
  if (!row.domain || !isValidDomain(String(row.domain))) {
    return { error: `unknown or missing domain "${row.domain}"` };
  }
  return {
    question_text: String(row.question_text ?? ""),
    correct_answer: String(row.correct_answer ?? ""),
    domain: row.domain as SATDomain,
    choice_a: row.choice_a,
    choice_b: row.choice_b,
    choice_c: row.choice_c,
    choice_d: row.choice_d,
    difficulty: row.difficulty,
    question_format: row.question_format,
    numeric_tolerance: row.numeric_tolerance,
    // Phase 8.1 source_pdf hotfix: the extractor's responseSchema in
    // extract-with-gemini.mjs deliberately omits source_pdf, so we
    // inject it here from the PDF path passed via CLI. The
    // row.source_pdf check preserves any explicit override the caller
    // may have set (e.g. hand-edited JSON), but in the orchestrator
    // path that field is always absent.
    source_pdf: row.source_pdf ?? defaultSourcePdf,
    source_page: row.source_page,
    content_hash: row.content_hash,
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
    import_status: row.import_status as ImportStatus | undefined,
    import_flag_type: row.import_flag_type as ImportFlagType | undefined,
    import_flag_reason: row.import_flag_reason,
    // The orchestrator pre-uploads images to R2 via extract-figures.mjs,
    // so image_url is already a public R2 URL by the time we get here.
    // No data-URL materialization needed (that's bulk-import's job).
    image_url: row.image_url ?? null,
    image_alt: row.image_alt,
  };
}

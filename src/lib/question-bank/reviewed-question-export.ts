import { z } from "zod";
import { rowToReviewedImportInput } from "../../../scripts/pdf-pipeline/import-json-direct-row";
import { adaptAgentDDifficulty, approvedDifficultyIdentitySchema } from "./agent-d-difficulty";
import { REVIEWED_DIFFICULTY_IMPORT_POLICY } from "./reviewed-difficulty";

const candidateSchema = z.object({
  identity: approvedDifficultyIdentitySchema,
  website_row: z.record(z.string(), z.unknown()),
});

/** Database-free final-format adapter. Does not certify other E/website gates. */
export function prepareReviewedQuestionExport(
  candidates: unknown[],
  records: unknown[],
  defaultSourcePdf: string
) {
  if (!candidates.length) throw new Error("No approved export candidates");
  const byId = new Map<string, unknown>();
  for (const record of records) {
    const id = z.object({ stable_question_id: z.string().min(1) }).parse(record).stable_question_id;
    if (byId.has(id)) throw new Error(`Duplicate D assessment identity: ${id}`);
    byId.set(id, record);
  }
  const used = new Set<string>();
  const assessments: Array<Record<string, unknown>> = [];
  const questions = candidates.map((value) => {
    const candidate = candidateSchema.parse(value);
    const id = candidate.identity.stable_question_id;
    if (used.has(id)) throw new Error(`Duplicate website candidate identity: ${id}`);
    used.add(id);
    if (!byId.has(id)) throw new Error(`Missing D assessment: ${id}`);
    const adapted = adaptAgentDDifficulty(byId.get(id), candidate.identity);
    const exported = {
      ...candidate.website_row,
      ...adapted.assessment,
      stable_question_id: id,
      difficulty: adapted.assessment.difficulty_level,
      D_output_version: candidate.identity.D_output_version,
      D_classifications_sha256: candidate.identity.D_classifications_sha256,
      source_version: candidate.identity.source_version,
    };
    const normalized = rowToReviewedImportInput(exported, defaultSourcePdf, { allowPreview: true });
    if ("error" in normalized) throw new Error(`${id}: ${normalized.error}`);
    assessments.push({
      stable_question_id: id,
      approved_identity: candidate.identity,
      original_website_row: candidate.website_row,
      original_D_record: adapted.originalRecord,
    });
    return exported;
  });
  return {
    export: {
      schema_version: 1,
      import_policy: REVIEWED_DIFFICULTY_IMPORT_POLICY,
      questions,
    },
    audit: { database_accessed: false, publication_performed: false, assessments },
  };
}

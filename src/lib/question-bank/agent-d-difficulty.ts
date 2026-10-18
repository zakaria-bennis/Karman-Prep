import { z } from "zod";
import {
  AGENT_D_DIFFICULTY_RUBRIC_VERSION,
  REVIEWED_DIFFICULTY_RUBRIC_VERSION,
  type ReviewedDifficulty,
} from "./reviewed-difficulty";

const hash = z.string().regex(/^[a-f0-9]{64}$/);

/** Actual D schema-v1.0.0 source identity; unrelated metadata is retained verbatim. */
export const difficultySourceVersionSchema = z
  .object({
    B_output_version: z.string().min(1),
    B_manifest_sha256: hash,
    B_final_version_sha256: hash,
    content_sha256: hash,
    student_content_sha256: hash,
  })
  .strict();

export const agentDDifficultySchema = z
  .object({
    stable_question_id: z.string().min(1),
    content_sha256: hash,
    difficulty_level: z.number().int().min(1).max(7),
    difficulty_rationale: z.string().trim().min(1),
    difficulty_confidence: z.number().min(0).max(1),
    difficulty_uncertain: z.boolean(),
    difficulty_selectable_for_downstream: z.boolean(),
    difficulty_rubric_version: z.literal(AGENT_D_DIFFICULTY_RUBRIC_VERSION),
    difficulty_source_version: difficultySourceVersionSchema,
  })
  .passthrough();

export const approvedDifficultyIdentitySchema = z.object({
  stable_question_id: z.string().min(1),
  source_version: difficultySourceVersionSchema,
  accepted_solution_sha256: hash,
  D_output_version: z.string().min(1),
  D_classifications_sha256: hash,
  source_quality_hold: z.literal(false),
  current_version: z.literal(true),
});

/** Actual engineering-contract-v1.0.0 from D. Never replace false readiness with true. */
export const engineeringDDifficultySchema = z
  .object({
    stable_question_id: z.string().min(1),
    D_output_version: z.string().min(1),
    D_classifications_sha256: hash,
    content_sha256: hash,
    difficulty_level: z.number().int().min(1).max(7),
    difficulty_rationale: z.string().trim().min(1),
    difficulty_confidence: z.number().min(0).max(1),
    difficulty_rubric_version: z.literal(REVIEWED_DIFFICULTY_RUBRIC_VERSION),
    D_difficulty_rubric_version: z.literal(AGENT_D_DIFFICULTY_RUBRIC_VERSION),
    difficulty_solution_sha256: hash,
    difficulty_content_sha256: hash,
    difficulty_uncertain: z.boolean(),
    skill_uncertain: z.boolean(),
    difficulty_selectable_for_downstream: z.boolean(),
    skill_selectable_for_downstream: z.boolean(),
    source_exam_readiness_withdrawn: z.boolean(),
    website_import_ready: z.literal(false),
    source_version: difficultySourceVersionSchema,
  })
  .passthrough();

export type ApprovedDifficultyIdentity = z.infer<typeof approvedDifficultyIdentitySchema>;

/** No re-rating: join D to the approved, independently verified content identity. */
export function adaptAgentDDifficulty(
  record: unknown,
  identity: unknown
): { assessment: ReviewedDifficulty; originalRecord: Record<string, unknown> } {
  const d = engineeringDDifficultySchema.parse(record);
  const approved = approvedDifficultyIdentitySchema.parse(identity);
  if (d.stable_question_id !== approved.stable_question_id)
    throw new Error("D question identity mismatch");
  if (
    d.D_output_version !== approved.D_output_version ||
    d.D_classifications_sha256 !== approved.D_classifications_sha256
  ) {
    throw new Error("D assessment release version mismatch");
  }
  for (const key of Object.keys(approved.source_version) as Array<
    keyof ApprovedDifficultyIdentity["source_version"]
  >) {
    if (d.source_version[key] !== approved.source_version[key]) {
      throw new Error(`D source version mismatch: ${key}; substantive repairs require re-review`);
    }
  }
  if (d.content_sha256 !== approved.source_version.content_sha256)
    throw new Error("D package content hash mismatch");
  if (d.difficulty_uncertain || !d.difficulty_selectable_for_downstream)
    throw new Error("D difficulty needs review");
  // Skill uncertainty is independent and cannot be cleared by a definitive difficulty rating.
  if (d.skill_uncertain || !d.skill_selectable_for_downstream) {
    throw new Error("D skill classification needs review");
  }
  if (d.source_exam_readiness_withdrawn) throw new Error("Upstream exam readiness is withdrawn");
  if (d.difficulty_solution_sha256 !== approved.accepted_solution_sha256)
    throw new Error("D verified solution hash mismatch");
  if (d.difficulty_content_sha256 !== approved.source_version.student_content_sha256)
    throw new Error("D student content hash mismatch");
  return {
    assessment: {
      difficulty_level: d.difficulty_level,
      // Preserve the exact source rationale, including its whitespace; do not rewrite D evidence.
      difficulty_rationale: (record as Record<string, unknown>).difficulty_rationale as string,
      difficulty_confidence: d.difficulty_confidence,
      difficulty_rubric_version: d.difficulty_rubric_version,
      difficulty_solution_sha256: approved.accepted_solution_sha256,
      difficulty_content_sha256: d.difficulty_content_sha256,
      difficulty_uncertain: false,
      skill_uncertain: false,
      difficulty_selectable_for_downstream: true,
      skill_selectable_for_downstream: true,
      source_exam_readiness_withdrawn: false,
      source_quality_hold: false,
      current_version: true,
      website_import_ready: false,
    },
    originalRecord: record as Record<string, unknown>,
  };
}

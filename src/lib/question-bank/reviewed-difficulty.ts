import { z } from "zod";

/** Version of the full historical Math/R&W rubric, not a measured success model. */
export const REVIEWED_DIFFICULTY_RUBRIC_VERSION = "karman-legacy-1-7-v1";
export const AGENT_D_DIFFICULTY_RUBRIC_VERSION = "KarmanGPT-historical-rubric-v1.0.0";
export const REVIEWED_DIFFICULTY_IMPORT_POLICY = "reviewed-difficulty";

/** Website export of D's assessment. Confidence is editorial, not a calibrated probability. */
export const reviewedDifficultySchema = z.object({
  difficulty_level: z.number().int().min(1).max(7),
  difficulty_rationale: z.string().trim().min(1),
  difficulty_confidence: z.number().min(0).max(1),
  difficulty_rubric_version: z.literal(REVIEWED_DIFFICULTY_RUBRIC_VERSION),
  // Tie the assessment to the verified solution and the final content it rates.
  difficulty_solution_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  difficulty_content_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  difficulty_uncertain: z.literal(false),
  skill_uncertain: z.literal(false),
  difficulty_selectable_for_downstream: z.literal(true),
  skill_selectable_for_downstream: z.literal(true),
  source_exam_readiness_withdrawn: z.literal(false),
  source_quality_hold: z.literal(false),
  current_version: z.literal(true),
  website_import_ready: z.boolean(),
});

export type ReviewedDifficulty = z.infer<typeof reviewedDifficultySchema>;

/** Original assessment evidence stays separate from the compatibility enum. */
export function validateReviewedDifficulty(
  row: Record<string, unknown>
): { ok: true; assessment: ReviewedDifficulty } | { ok: false; error: string } {
  const parsed = reviewedDifficultySchema.safeParse(row);
  if (!parsed.success) {
    return {
      ok: false,
      error: `difficulty needs review: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`,
    };
  }
  return { ok: true, assessment: parsed.data };
}

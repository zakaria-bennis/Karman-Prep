import { z } from "zod";
import type { Json } from "@/types/supabase";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const shared = {
  independently_verified_answer: z.string().min(1),
  evidence: z.custom<Json>((value) => value != null, "reviewed answer missing evidence"),
};

/** Missing official mapping stays missing, even when independent reviews agree. */
export const reviewedAnswerSchema = z.union([
  z.object({
    ...shared,
    kind: z.literal("official").optional(),
    printed_answer: z.string().refine((value) => Boolean(value.trim())),
  }),
  z.object({
    ...shared,
    kind: z.literal("independently_confirmed_generated"),
    printed_answer: z.null(),
    generated_key_artifact_sha256: digest,
    independent_review_sha256s: z
      .array(digest)
      .min(2)
      .refine((values) => new Set(values).size === values.length, "reviews must be distinct"),
  }),
]);

export type ReviewedAnswerProvenance = z.infer<typeof reviewedAnswerSchema>;

export function validateReviewedAnswer(
  value: unknown,
  activeAnswer: string,
  held: boolean
): string[] {
  const parsed = reviewedAnswerSchema.safeParse(value);
  if (!parsed.success) return ["reviewed answer provenance is incomplete or invalid"];
  const answer = parsed.data;
  const errors: string[] = [];
  if (answer.independently_verified_answer !== activeAnswer)
    errors.push("reviewed solver answer must match active correct_answer");
  if (
    answer.kind !== "independently_confirmed_generated" &&
    answer.printed_answer !== activeAnswer &&
    !held
  )
    errors.push("printed key disagreement must remain needs_review");
  return errors;
}

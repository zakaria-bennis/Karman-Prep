import { createHash } from "node:crypto";
import { z } from "zod";
import { parseNumericAnswer } from "@/lib/numeric-answer";
import type { ImportQuestionInput } from "./import-core";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const numericAnswerSetSchema = z.object({
  version: z.literal(1),
  answers: z
    .array(z.string().refine((answer) => parseNumericAnswer(answer) !== null))
    .min(1)
    .max(20),
  question_text_sha256: digest,
  raw_question_text_sha256: digest,
  source_version: z.string().min(1),
  source_section: z.literal("math"),
  source_module: z.enum(["M1", "M2"]),
  source_question_number: z.number().int().positive(),
  source_occurrence: z.number().int().positive(),
  answer_key_artifact_sha256: digest,
  independent_review_sha256s: z
    .array(digest)
    .min(2)
    .refine((v) => new Set(v).size === v.length),
  rationale: z.string().trim().min(1),
});
export type ReviewedNumericAnswerSet = z.infer<typeof numericAnswerSetSchema>;

type Binding = {
  question_text: string;
  raw_question_text?: string | null;
  correct_answer: string;
  answer_format?: string;
  source_version?: string | null;
  source_section?: string | null;
  source_module?: string | null;
  source_question_number?: number | null;
  source_occurrence?: number | null;
};
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const object = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/** Both official evidence and the generated-key envelope keep the same nested contract. */
export function numericAnswerSetFromEvidence(value: unknown): unknown {
  const record = object(value);
  const evidence = object(record?.evidence) ?? record;
  const set = evidence?.numeric_answer_set;
  if (
    set !== undefined &&
    record?.kind === "independently_confirmed_generated" &&
    object(set)?.answer_key_artifact_sha256 !== record.generated_key_artifact_sha256
  )
    throw new Error("Numeric answer set must match generated key artifact");
  return set;
}

export function reviewedNumericAnswers(binding: Binding, value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  const parsed = numericAnswerSetSchema.safeParse(value);
  if (!parsed.success) throw new Error("Invalid reviewed numeric answer set");
  const set = parsed.data;
  if (
    binding.answer_format !== "numeric_entry" ||
    set.question_text_sha256 !== hash(binding.question_text) ||
    set.raw_question_text_sha256 !== hash(binding.raw_question_text ?? binding.question_text) ||
    set.source_version !== binding.source_version ||
    set.source_section !== binding.source_section ||
    set.source_module !== binding.source_module ||
    set.source_question_number !== binding.source_question_number ||
    set.source_occurrence !== binding.source_occurrence
  )
    throw new Error("Reviewed numeric answer set does not match current source/question");
  const numbers = set.answers.map((answer) => parseNumericAnswer(answer)!);
  if (
    new Set(numbers).size !== numbers.length ||
    !numbers.includes(parseNumericAnswer(binding.correct_answer)!)
  )
    throw new Error("Reviewed numeric answer set must contain the stored key and distinct answers");
  return set.answers;
}

export function validateNumericImport(row: ImportQuestionInput): string[] {
  const errors: string[] = [];
  if (
    row.question_format === "numeric_entry" &&
    row.numeric_tolerance != null &&
    row.numeric_tolerance !== ""
  ) {
    const tolerance = Number(row.numeric_tolerance);
    if (!Number.isFinite(tolerance) || tolerance < 0)
      errors.push(`numeric_tolerance "${row.numeric_tolerance}" is not numeric or nonnegative`);
  }
  try {
    const value = numericAnswerSetFromEvidence(row.reviewed_answer);
    if (value !== undefined) {
      reviewedNumericAnswers({ ...row, answer_format: row.question_format }, value);
      if (!row.reviewed_answer) throw new Error("Numeric answer set requires reviewed provenance");
      if (
        row.reviewed_answer.kind === "independently_confirmed_generated" &&
        numericAnswerSetSchema.parse(value).answer_key_artifact_sha256 !==
          row.reviewed_answer.generated_key_artifact_sha256
      )
        throw new Error("Numeric answer set must match generated key artifact");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Invalid numeric answer set");
  }
  return errors;
}

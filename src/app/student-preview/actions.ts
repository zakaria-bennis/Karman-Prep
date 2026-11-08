"use server";

import { z } from "zod";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import { grade, previewAllowed } from "@/lib/student/preview-bank";
import type { StudentQuizReview } from "@/types/quiz";

const item = z
  .object({
    skillId: z.string().refine((id) => CATALOG_SKILLS.some((s) => s.id === id)),
    questionId: z.string().uuid(),
    answer: z.string().trim().min(1).max(40),
  })
  .strict();

/** Founder preview: grades against the published bank. Reads only; writes nothing. */
export async function actionPreviewGrade(input: unknown): Promise<StudentQuizReview | null> {
  if (!previewAllowed()) throw new Error("Not available");
  const p = item.parse(input);
  return grade(p.skillId, p.questionId, p.answer);
}

export async function actionPreviewGradeMany(
  input: unknown
): Promise<Record<string, StudentQuizReview>> {
  if (!previewAllowed()) throw new Error("Not available");
  const items = z.array(item).max(120).parse(input);
  const out: Record<string, StudentQuizReview> = {};
  for (const p of items) {
    const review = await grade(p.skillId, p.questionId, p.answer);
    if (review) out[p.questionId] = review;
  }
  return out;
}

"use server";

import { z } from "zod";
import { reviewDailyAnswer } from "@/lib/daily-challenge/server";
import { safeAuth } from "@/lib/auth/dev-auth";
import { awardForAnswer } from "@/lib/quiz/points";

const answerSchema = z
  .object({
    subject: z.enum(["math", "reading"]),
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    questionId: z.string().uuid(),
    answer: z.string().trim().min(1).max(200),
  })
  .strict();

export async function actionReviewDailyAnswer(input: unknown) {
  const parsed = answerSchema.parse(input);
  const { userId } = await safeAuth();
  return reviewDailyAnswer(
    parsed.subject,
    parsed.day,
    parsed.questionId,
    parsed.answer,
    userId ? { clerkId: userId, award: awardForAnswer } : undefined
  );
}

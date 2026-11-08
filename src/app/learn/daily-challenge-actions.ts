"use server";

import { z } from "zod";
import { reviewDailyAnswer } from "@/lib/daily-challenge/server";
import { safeAuth } from "@/lib/auth/dev-auth";
import { awardForAnswer } from "@/lib/quiz/points";
import { challengeStats, othersLine, recordChallengeAnswer } from "@/lib/daily-ten/challenge";

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
  const review = await reviewDailyAnswer(
    parsed.subject,
    parsed.day,
    parsed.questionId,
    parsed.answer,
    userId ? { clerkId: userId, award: awardForAnswer } : undefined
  );
  if (userId)
    await recordChallengeAnswer({
      day: parsed.day,
      subject: parsed.subject,
      clerkId: userId,
      questionId: parsed.questionId,
      answer: parsed.answer,
      correct: review.isCorrect,
    });
  // How everyone did, shown with the worked explanation.
  const others = othersLine(await challengeStats(parsed.day, parsed.subject, parsed.questionId));
  return { ...review, others };
}

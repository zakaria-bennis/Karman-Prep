"use server";

import { z } from "zod";
import { reviewDailyAnswer } from "@/lib/daily-challenge/server";
import { safeAuth } from "@/lib/auth/dev-auth";
import { assertQuestionsLeft, maxDifficultyFor } from "@/lib/assembler/plan-gate";
import { withPlanLimit } from "@/lib/assembler/plan-limit";
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
  return withPlanLimit(() => reviewAnswer(parsed, userId ?? null));
}

async function reviewAnswer(parsed: z.infer<typeof answerSchema>, userId: string | null) {
  // Signed-out visitors keep no record, so only signed-in students count toward Free's 100.
  if (userId) await assertQuestionsLeft(userId);
  const review = await reviewDailyAnswer(
    parsed.subject,
    parsed.day,
    parsed.questionId,
    parsed.answer,
    await maxDifficultyFor(userId),
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

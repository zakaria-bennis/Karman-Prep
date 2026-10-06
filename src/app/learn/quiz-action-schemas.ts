import { z } from "zod";

export const quizNodeIdSchema = z.string().regex(/^(rw|ma)-\d{2}$/);

export const recordQuizResponseSchema = z
  .object({
    attempt_id: z.string().uuid(),
    question_id: z.string().uuid(),
    student_answer: z.string().trim().min(1).max(32),
    response_time_seconds: z.number().int().min(0).max(86400),
  })
  .strict();

export const completeQuizSchema = z
  .object({
    attemptId: z.string().uuid(),
    nodeId: quizNodeIdSchema,
    subject: z.enum(["reading", "math"]),
  })
  .strict();

export const flagQuizQuestionSchema = z
  .object({
    question_id: z.string().uuid(),
    node_id: quizNodeIdSchema,
    flag_note: z.string().max(2000).nullable(),
  })
  .strict();

export const watchPercentageSchema = z.number().finite().min(0).max(100);

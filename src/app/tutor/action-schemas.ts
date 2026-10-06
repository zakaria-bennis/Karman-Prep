import { z } from "zod";

export const studentIdSchema = z.string().trim().min(1).max(256);
export const nodeOverrideSchema = z.object({
  student_id: studentIdSchema,
  node_id: z.string().regex(/^(rw|ma)\d+$/),
  override_status: z.enum(["locked", "unlocked", "in_progress", "partially_complete", "mastered"]),
  locked_pathway: z.boolean(),
  reason: z.string().max(4000).optional(),
});
export const checkpointSchema = z.object({
  student_id: studentIdSchema,
  checkpoint_id: z.string().regex(/^(reading|math):[1-3]$/),
  reason: z.string().max(4000).optional(),
});
export const flagTargetSchema = z.object({ studentId: studentIdSchema, flagId: z.uuid() });
export const questionPatchSchema = z.object({
  question_text: z.string().min(1).max(50000).optional(),
  difficulty: z.enum(["foundational", "intermediate", "advanced", "mastery"]).optional(),
  correct_answer: z.string().min(1).max(256).optional(),
  explanation_text: z.string().max(50000).optional(),
  explanation_per_choice: z
    .object({
      A: z.string().max(50000).optional(),
      B: z.string().max(50000).optional(),
      C: z.string().max(50000).optional(),
      D: z.string().max(50000).optional(),
    })
    .nullable()
    .optional(),
  topic_cluster: z.string().max(256).optional(),
  desmos_strategy: z.string().max(10000).optional(),
});
export const questionTargetSchema = z.object({
  studentId: studentIdSchema,
  questionId: z.uuid(),
  patch: questionPatchSchema,
});

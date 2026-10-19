import { z } from "zod";
import { catalogPoolInputSchema } from "@/lib/question-bank/catalog-question-scope";

const uuid = z.string().uuid();
const title = z.string().trim().min(1).max(140);
const dueAt = z.iso.datetime({ offset: true }).nullable();

export const createAssignmentSchema = z
  .object({
    requestId: uuid,
    studentClerkId: z.string().min(1).max(128),
    skillId: catalogPoolInputSchema.shape.skillId,
    questionIds: z.array(uuid).min(1).max(10),
    title,
    dueAt,
  })
  .strict()
  .refine((value) => new Set(value.questionIds).size === value.questionIds.length, {
    message: "Assignment needs distinct questions",
  });

export const assignmentTargetSchema = z
  .object({ assignmentId: uuid, expectedRevision: z.number().int().positive() })
  .strict();

export const updateAssignmentSchema = assignmentTargetSchema.extend({ title, dueAt });

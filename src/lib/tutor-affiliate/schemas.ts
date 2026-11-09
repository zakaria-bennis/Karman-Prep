// Zod schemas for the tutor affiliate server actions.

import { z } from "zod";
import { HOMEWORK_KINDS } from "./homework";

const uuid = z.string().uuid();

export const redeemCodeSchema = z
  .object({
    code: z.string().trim().min(1, "Enter your tutor's code.").max(20),
    switchTutor: z.boolean().optional(),
  })
  .strict();

export const removeStudentSchema = z.object({ studentUserId: uuid }).strict();

export const assignHomeworkSchema = z
  .object({
    studentClerkId: z.string().trim().min(1).max(128),
    kind: z.enum(HOMEWORK_KINDS),
    targetId: z.string().trim().min(1).max(120).nullable(),
    dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a due date."),
    note: z.string().max(500).nullable(),
  })
  .strict();

export const cancelHomeworkSchema = z.object({ homeworkId: uuid }).strict();

export const dismissNoticeSchema = z.object({ linkId: uuid }).strict();

// Zod schemas for the CRM's server actions (actions.ts). Kept apart so they can be unit-tested.
import { z } from "zod";
import { STAGES } from "@/lib/admin/crm/types";

const uuid = z.string().uuid();

/** A contact's key in the crm_* tables: a lower-cased email, or user:<users.id>. */
export const contactKey = z
  .string()
  .trim()
  .max(320)
  .refine((v) => /^user:[0-9a-f-]{36}$/.test(v) || /^[^\s@A-Z]+@[^\s@A-Z]+$/.test(v), {
    message: "Not a contact key",
  });

/** Lower-case letters, digits, spaces and dashes, 1 to 30 characters (matches the table's check). */
export const tagSchema = z
  .string()
  .transform((v) => v.trim().toLowerCase().replace(/\s+/g, " "))
  .pipe(
    z.string().regex(/^[a-z0-9][a-z0-9 -]{0,29}$/, {
      message: "Use letters, numbers and dashes, up to 30.",
    })
  );

/** One line or a few paragraphs; control characters other than new lines are dropped. */
const text = (max: number) =>
  z
    .string()
    .transform((v) => v.replace(/[^\P{C}\n]/gu, "").trim())
    .pipe(z.string().min(1, { message: "Write something first." }).max(max));

export const setStageInput = z.object({
  key: contactKey,
  /** null: back to the stage worked out from purchases. */
  stage: z.enum(STAGES).nullable(),
});

export const setOwnerInput = z.object({ key: contactKey, ownerUserId: uuid.nullable() });

export const addNoteInput = z.object({ key: contactKey, body: text(4000) });

export const deleteNoteInput = z.object({ key: contactKey, id: uuid });

export const addTaskInput = z.object({
  key: contactKey,
  title: text(200).refine((v) => !v.includes("\n"), { message: "Keep it to one line." }),
  dueOn: z.iso.date(),
});

export const setTaskDoneInput = z.object({ key: contactKey, id: uuid, done: z.boolean() });

export const tagInput = z.object({ key: contactKey, tag: tagSchema });

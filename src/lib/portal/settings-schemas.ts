/*
 * What the Settings actions accept, checked with Zod before anything is read or written. Pure, so the
 * rules are unit-tested and the page can use the same limits. (A "use server" file may export only
 * actions, so the schemas live here.)
 */
import { z } from "zod";
import { JOIN_CODE_PATTERN, normalizeJoinCode } from "@/lib/school/terms";

/** A name as a person writes it: letters, spaces, apostrophes, hyphens, accents. No markup. */
const namePart = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "That name is too long.")
    .refine((v) => !/[<>\p{Cc}]/u.test(v), "Use letters only.");

export const nameSchema = z
  .object({
    first: namePart(60).refine((v) => /\p{L}/u.test(v), "Type your first name."),
    last: namePart(60),
  })
  .strict();

/** A class code from a teacher: six letters and numbers (LKV3PQ), typed in any case or spacing. */
export const classCodeSchema = z
  .object({
    code: z
      .string()
      .max(20)
      .transform(normalizeJoinCode)
      .refine(
        (c) => JOIN_CODE_PATTERN.test(c),
        "Class codes are six letters and numbers, like LKV3PQ."
      ),
  })
  .strict();

/** Nothing to send: the action reads everything it needs on the server. */
export const emptySchema = z.object({}).strict();

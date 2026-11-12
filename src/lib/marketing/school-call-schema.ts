// The server's check of a school's call request (school-call-actions.ts): the same rules the screen runs
// (school-call.ts), again, with Zod. Names and the school's name are kept to one clean line.
import { z } from "zod";
import { okEmail, okPhone } from "./lead-rules";
import { CALL_ERRORS, CALL_TIMES, SCHOOL_ROLES, SCHOOL_SIZES, SCHOOL_STARTS } from "./school-call";

/** One line of text: control and invisible characters dropped, spaces folded, then the length checks. */
const oneLine = (max: number, message: string) =>
  z
    .string()
    .transform((v) =>
      v
        .replace(/[\p{C}]/gu, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .pipe(z.string().min(1, { message }).max(max, { message }));

const pick = <T extends readonly [string, ...string[]]>(list: T, message: string) =>
  z.enum(list, { message });

export const schoolCallSchema = z.object({
  school: oneLine(120, CALL_ERRORS.school),
  role: pick(SCHOOL_ROLES, CALL_ERRORS.role),
  students: pick(SCHOOL_SIZES, CALL_ERRORS.students),
  start: pick(SCHOOL_STARTS, CALL_ERRORS.start),
  name: oneLine(60, CALL_ERRORS.name),
  email: z
    .string()
    .trim()
    .max(254, { message: CALL_ERRORS.email })
    .refine(okEmail, { message: CALL_ERRORS.email })
    .transform((v) => v.toLowerCase()),
  phone: z
    .string()
    .trim()
    .max(24, { message: CALL_ERRORS.phone })
    .refine((v) => v === "" || okPhone(v), { message: CALL_ERRORS.phone })
    .default(""),
  callTime: z.enum(["", ...CALL_TIMES], { message: CALL_ERRORS.callTime }).default(""),
  /** A hidden field people never see; anything in it means a bot filled the form. */
  website: z.literal("").optional(),
});

export type SchoolCall = z.output<typeof schoolCallSchema>;

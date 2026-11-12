// The Schools page's "book a call" form (founder, 2026-11-12): what it asks, in two short steps, and the
// checks the screen runs as each field is left. The server runs the same checks again with Zod
// (school-call-schema.ts). No Zod here, so the visitor's screen doesn't load it.
import { okEmail, okPhone } from "./lead-rules";
import { SITE } from "./site-copy";

/** The lead source a school's call request is stored under in marketing_leads. */
export const SCHOOL_CALL_SOURCE = "school_call" as const;

export const SCHOOL_ROLES = [
  "Principal",
  "Assistant principal",
  "Counselor",
  "Teacher",
  "District office",
  "Other",
] as const;

export const SCHOOL_SIZES = [
  "Under 100",
  "100 to 250",
  "250 to 500",
  "500 to 1,000",
  "1,000 to 2,000",
  "More than 2,000",
] as const;

export const SCHOOL_STARTS = [
  "This semester",
  "Next semester",
  "Next school year",
  "Just exploring",
] as const;

/** Optional. The empty answer means any time suits them. */
export const CALL_TIMES = ["Before school", "During the school day", "After school"] as const;

export type CallField =
  | "school"
  | "role"
  | "students"
  | "start"
  | "name"
  | "email"
  | "phone"
  | "callTime";

/** Step 1 asks about the school, step 2 how to reach you: the easy answers first. */
export const CALL_STEPS: readonly (readonly CallField[])[] = [
  ["school", "role", "students", "start"],
  ["name", "email", "phone", "callTime"],
];

export const CALL_ERRORS = {
  school: "Add your school's name, so we know who we're talking to.",
  role: "Pick your role at the school.",
  students: "Pick roughly how many students would use it.",
  start: "Pick when you'd like to start. Just exploring is fine.",
  name: SITE["form error your name"],
  email: SITE["form error email"],
  phone: "That number looks short. Add the area code, or leave it blank.",
  callTime: "Pick a time from the list, or leave it on any time.",
} as const satisfies Record<CallField, string>;

const oneOf = (list: readonly string[]) => (v: string) => list.includes(v);

/** Each field's check: "" when the answer is fine, otherwise what to fix. */
export const CALL_RULES: Record<CallField, (v: string) => string> = {
  school: (v) => (v.trim() && v.trim().length <= 120 ? "" : CALL_ERRORS.school),
  role: (v) => (oneOf(SCHOOL_ROLES)(v) ? "" : CALL_ERRORS.role),
  students: (v) => (oneOf(SCHOOL_SIZES)(v) ? "" : CALL_ERRORS.students),
  start: (v) => (oneOf(SCHOOL_STARTS)(v) ? "" : CALL_ERRORS.start),
  name: (v) => (v.trim() && v.trim().length <= 60 ? "" : CALL_ERRORS.name),
  email: (v) => (okEmail(v) ? "" : CALL_ERRORS.email),
  phone: (v) => (!v.trim() || okPhone(v) ? "" : CALL_ERRORS.phone),
  callTime: (v) => (!v || oneOf(CALL_TIMES)(v) ? "" : CALL_ERRORS.callTime),
};

/** The next weekday after `from` (a Friday request is answered on Monday). YYYY-MM-DD, UTC. */
export function nextSchoolDay(from: Date): string {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  do d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  return d.toISOString().slice(0, 10);
}

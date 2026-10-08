import { z } from "zod";
import type { createCatalogPracticeService } from "./session";

/** Public action projection only: private snapshots and key evidence never enter this type. */
export type CatalogStudentSession = Awaited<
  ReturnType<ReturnType<typeof createCatalogPracticeService>["resume"]>
>;
export type CatalogSavedReview = CatalogStudentSession["reviews"][number];

export const catalogEntryQuerySchema = z
  .object({ session: z.string().uuid().optional(), assignment: z.string().uuid().optional() })
  .strict()
  .refine((input) => !(input.session && input.assignment));

export function catalogSessionHref(skillId: string, sessionId: string): string {
  return `/learn/practice/${encodeURIComponent(skillId)}?session=${encodeURIComponent(sessionId)}`;
}

/** Never show database, source-evidence or stack details in a student error. */
export function catalogPracticeError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message === "No distinct approved questions are available") {
    return "Reviewed questions are not available for this skill yet. Choose another skill or return later.";
  }
  if (/Assignment|Assigned question|Assigned practice/.test(message)) {
    return "This assignment is unavailable or has changed. Please check with your tutor.";
  }
  if (/version|no longer available|outside requested skill|Duplicate/.test(message)) {
    return "These questions have changed or are unavailable. Your saved answers remain intact; please return to the skill catalog.";
  }
  if (message === "Practice session is unavailable" || message === "Student access required") {
    return "This practice session is unavailable for your account. Return to the skill catalog.";
  }
  return "We could not finish that request. Your saved answers remain intact. Try again.";
}

export function requireEntrySkill(session: CatalogStudentSession, skillId: string): void {
  if (session.skillId !== skillId) throw new Error("Saved question is outside requested skill");
}

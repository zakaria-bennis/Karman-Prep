/*
 * Curated review homework (founder, round 2, 2026-11-22): each week Karman builds a review set from
 * the skills a Cohort or Private student has due for review (student_skill72_reviews), their tutor
 * sends it with one tap, and it is due before Saturday's exam. Its size grows with what is due, from
 * 8 to 20 questions. Students without a tutor never see one. Pure, so it is unit-tested; the server
 * side is review-sets.ts.
 */
import type { PlanId } from "@/lib/plans/catalog";
import { addDays } from "@/lib/play/reviews";

export const REVIEW_SET_MIN = 8;
export const REVIEW_SET_MAX = 20;
/** The most skills one set covers (two questions each at the most). */
export const REVIEW_SET_SKILLS = 10;

/** Only taught plans get a curated set: Cohort and Private, with a tutor. */
export const getsReviewSets = (planId: PlanId, hasTutor: boolean) =>
  hasTutor && (planId === "cohort" || planId === "private-10" || planId === "private-20");

/** The Saturday exam this week's set is due before: the next Saturday after `today` (on a Saturday,
 *  that day's exam has begun, so the set is for the next one). Days are "YYYY-MM-DD". */
export function examSaturday(today: string): string {
  const [y, m, d] = today.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return addDays(today, weekday === 6 ? 7 : 6 - weekday);
}

/** The day the set is due: the Friday before the exam. */
export const dueOnFor = (saturday: string) => addDays(saturday, -1);

/** Two questions for each skill due, never fewer than 8 or more than 20. */
export const reviewSetSize = (skillsDue: number) =>
  Math.min(REVIEW_SET_MAX, Math.max(REVIEW_SET_MIN, skillsDue * 2));

/** The skills due for review by the exam, the most overdue first, at most REVIEW_SET_SKILLS. */
export function skillsDueBy(
  reviews: readonly { skillId: string; dueOn: string }[],
  saturday: string
): string[] {
  return reviews
    .filter((r) => r.dueOn <= saturday)
    .sort((a, b) =>
      a.dueOn === b.dueOn ? (a.skillId < b.skillId ? -1 : 1) : a.dueOn < b.dueOn ? -1 : 1
    )
    .slice(0, REVIEW_SET_SKILLS)
    .map((r) => r.skillId);
}

/** How many questions each skill gets: the size shared out in turn, the most overdue first. */
export function shareOut(skillIds: readonly string[], size: number): Map<string, number> {
  const out = new Map(skillIds.map((id) => [id, 0]));
  if (!skillIds.length) return out;
  for (let i = 0; i < size; i++) {
    const id = skillIds[i % skillIds.length];
    out.set(id, (out.get(id) ?? 0) + 1);
  }
  return out;
}

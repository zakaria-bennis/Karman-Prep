// Spaced reviews inside the Daily 10 (founder, round 2, 2026-11-22). Pure.
//
// Each of the 72 skills a student has practiced is next due on a day. After a right answer the gap
// grows (1, 3, 7, 14, then every 30 days); a miss brings it back tomorrow. Practicing a skill that
// is not yet due right does not push its review further out (the gap grows only when it is
// reviewed on time), but a miss always brings it back tomorrow. Every finished portal activity
// updates the skills it touched; a skill counts as right in an activity when every answer on it was.
// The Daily 10 gives up to five of its ten to due skills, the most overdue first, each a fresh
// question of that skill that the student has never answered.

/** Days until the next review after a right answer, by step. The last repeats. */
export const REVIEW_GAPS = [1, 3, 7, 14, 30] as const;
/** At most this many of the Daily 10's ten are reviews. */
export const REVIEWS_MAX = 5;

export type ReviewState = { skillId: string; step: number; dueOn: string };

/** "YYYY-MM-DD" plus `days`. */
export function addDays(day: string, days: number): string {
  const t = Date.parse(`${day}T00:00:00Z`) + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/** A skill's review after an activity on `today`: `ok` when every answer on it was right. */
export function nextReview(
  prev: ReviewState | undefined,
  skillId: string,
  ok: boolean,
  today: string
): ReviewState {
  if (!ok) return { skillId, step: 0, dueOn: addDays(today, 1) };
  if (!prev) return { skillId, step: 0, dueOn: addDays(today, REVIEW_GAPS[0]) };
  if (prev.dueOn > today) return prev;
  const step = Math.min(prev.step + 1, REVIEW_GAPS.length - 1);
  return { skillId, step, dueOn: addDays(today, REVIEW_GAPS[step]) };
}

/** Each skill an activity touched, and whether every answer on it was right. */
export function outcomesOf(answers: readonly { skillId: string; ok: boolean }[]) {
  const out = new Map<string, boolean>();
  for (const a of answers) if (a.skillId) out.set(a.skillId, (out.get(a.skillId) ?? true) && a.ok);
  return out;
}

/** The skills due on `today`, the most overdue first, at most `max`. */
export function dueSkills(
  states: readonly ReviewState[],
  today: string,
  max = REVIEWS_MAX
): string[] {
  return states
    .filter((s) => s.dueOn <= today)
    .sort((a, b) =>
      a.dueOn < b.dueOn ? -1 : a.dueOn > b.dueOn ? 1 : a.skillId < b.skillId ? -1 : 1
    )
    .slice(0, max)
    .map((s) => s.skillId);
}

/** The ten with the reviews in: each review takes the place of the last question of its own
 *  section that is not a review (else the last that is not), so the two sections stay balanced. */
export function withReviews<T extends { questionId: string; section: string }>(
  picks: readonly T[],
  reviews: readonly T[]
): T[] {
  const out = [...picks];
  const isReview = new Set<string>();
  for (const r of reviews) {
    if (out.some((p) => p.questionId === r.questionId)) continue;
    let at = -1;
    for (let i = out.length - 1; i >= 0; i--)
      if (!isReview.has(out[i].questionId) && out[i].section === r.section) {
        at = i;
        break;
      }
    if (at < 0)
      for (let i = out.length - 1; i >= 0; i--)
        if (!isReview.has(out[i].questionId)) {
          at = i;
          break;
        }
    if (at < 0) break;
    out[at] = r;
    isReview.add(r.questionId);
  }
  return out;
}

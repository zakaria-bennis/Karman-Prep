// The challenge multiplier (founder, 2026-11-20). Pure.
//
// One Reading question and one Math question a day. The multiplier goes up 0.1 for a right answer and
// 0.05 for a wrong one, is capped at x3, and resets to x1 only when a whole day's challenge is missed
// (neither question answered). A perfect run (+0.2 a day) takes 10 days from x1 to x3; missing both
// every day (+0.1 a day) takes 20. Days are the challenge's own (UTC, as the questions are chosen).

export const MULTIPLIER_STEP = { right: 0.1, wrong: 0.05 } as const;
export const MULTIPLIER_CAP = 3;

export type ChallengeDay = { day: string; answers: readonly { ok: boolean }[] };

const two = (n: number) => Math.round(n * 100) / 100;

/** Days between two "YYYY-MM-DD" keys. */
function gap(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** The multiplier now (`today` is the challenge's day key), from every day the student answered. A
 *  day missed between two answered days resets it; so does missing all of yesterday. Today, not yet
 *  answered, is not missed. */
export function multiplierOn(days: readonly ChallengeDay[], today: string): number {
  return multiplierPath(days, today).now;
}

/** The multiplier now, and the highest it has ever been (Rewards' record). */
export function multiplierPath(
  days: readonly ChallengeDay[],
  today: string
): { now: number; top: number } {
  const sorted = [...days].filter((d) => d.answers.length > 0 && d.day <= today);
  sorted.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  let value = 1;
  let top = 1;
  let last: string | null = null;
  for (const d of sorted) {
    if (last && gap(last, d.day) > 1) value = 1;
    for (const a of d.answers)
      value = Math.min(
        MULTIPLIER_CAP,
        value + (a.ok ? MULTIPLIER_STEP.right : MULTIPLIER_STEP.wrong)
      );
    top = Math.max(top, value);
    last = d.day;
  }
  if (last && gap(last, today) > 1) value = 1;
  return { now: two(value), top: two(top) };
}

/** The challenge's answers as days (rows from daily_challenge_answers). */
export function challengeDaysOf(rows: readonly { day: string; is_correct: boolean }[]) {
  const byDay = new Map<string, { ok: boolean }[]>();
  for (const r of rows) byDay.set(r.day, [...(byDay.get(r.day) ?? []), { ok: !!r.is_correct }]);
  return [...byDay].map(([day, answers]): ChallengeDay => ({ day, answers }));
}

/*
 * What a tutor sees first about a student (founder, round 2, 2026-11-22): the weakest skills, the
 * ones that dropped or stalled, read from the student's own answers. Pure, so it is unit-tested.
 *   Dropped  right noticeably less often in the last two weeks than in the weeks before.
 *   Stalled  still Learning or Understanding after a good number of answers, and mostly missed.
 */

/** Days counted as "recent" for a drop. */
export const RECENT_DAYS = 14;
/** How far back answers are read at all. */
export const LOOK_BACK_DAYS = 60;

export type Weak = {
  skill: string;
  reason: "Dropped" | "Stalled";
  /** Share right in the recent window (or the whole look-back, for a stall), 0 to 100. */
  recent: number;
  /** Share right before the recent window, for a drop. */
  before: number | null;
  answers: number;
};

type Sitting = { day: number; asked: readonly { skill: string; right: boolean }[] };

const pct = (right: number, all: number) => Math.round((right / all) * 100);

/** Up to `most` weakest skills, the biggest drops first, then the most-missed stalls. `today` is the
 *  student's day count (the day index sittings use); `levels` the student's level on each skill. */
export function weakestSkills(
  sittings: readonly Sitting[],
  levels: Readonly<Record<string, { level: number }>>,
  today: number,
  most = 5
): Weak[] {
  const tally = new Map<string, { rRight: number; rAll: number; eRight: number; eAll: number }>();
  for (const s of sittings) {
    const ago = today - s.day;
    if (ago < 0 || ago > LOOK_BACK_DAYS) continue;
    const recent = ago < RECENT_DAYS;
    for (const q of s.asked) {
      const t = tally.get(q.skill) ?? { rRight: 0, rAll: 0, eRight: 0, eAll: 0 };
      if (recent) {
        t.rAll++;
        if (q.right) t.rRight++;
      } else {
        t.eAll++;
        if (q.right) t.eRight++;
      }
      tally.set(q.skill, t);
    }
  }
  const dropped: (Weak & { by: number })[] = [];
  const stalled: Weak[] = [];
  for (const [skill, t] of tally) {
    if (t.rAll >= 3 && t.eAll >= 3) {
      const now = pct(t.rRight, t.rAll);
      const then = pct(t.eRight, t.eAll);
      if (then - now >= 20) {
        dropped.push({
          skill,
          reason: "Dropped",
          recent: now,
          before: then,
          answers: t.rAll + t.eAll,
          by: then - now,
        });
        continue;
      }
    }
    const level = levels[skill]?.level ?? 0;
    const all = t.rAll + t.eAll;
    const right = t.rRight + t.eRight;
    if ((level === 1 || level === 2) && all >= 8 && pct(right, all) < 70)
      stalled.push({
        skill,
        reason: "Stalled",
        recent: pct(right, all),
        before: null,
        answers: all,
      });
  }
  dropped.sort((a, b) => b.by - a.by || (a.skill < b.skill ? -1 : 1));
  stalled.sort((a, b) => a.recent - b.recent || (a.skill < b.skill ? -1 : 1));
  return [...dropped.map(({ by: _by, ...w }) => w), ...stalled].slice(0, most);
}

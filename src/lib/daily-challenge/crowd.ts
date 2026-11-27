// How everyone did on one of today's challenge questions, for the challenge ending (founder,
// 2026-11-24): the share who got it right, the average time, and how many picked each answer.
// Pure, safe on the client and the server.

/** Below this many players the ending says "Too few players yet" instead of numbers. */
export const CROWD_MIN_PLAYERS = 20;
/** A time above this (left open, walked away) is not counted in the average. */
const LONGEST_MS = 10 * 60 * 1000;

export type CrowdRow = { student_answer: string; is_correct: boolean; active_ms: number | null };

export type Crowd = {
  players: number;
  /** Whole percent who got it right. */
  rightPercent: number;
  /** Average seconds, or null when no time was kept. */
  averageSeconds: number | null;
  /** Each answer given, most picked first, as whole percents of players, and whether it was
   *  graded right (a typed answer may be right in more than one form: 14/25 and 0.56). */
  picks: { answer: string; percent: number; right: boolean }[];
};

export function crowdOf(rows: CrowdRow[]): Crowd {
  const players = rows.length;
  const pct = (n: number) => (players ? Math.round((100 * n) / players) : 0);
  const times = rows
    .map((r) => r.active_ms)
    .filter((t): t is number => t !== null && t > 0 && t <= LONGEST_MS);
  const counts = new Map<string, { n: number; right: boolean }>();
  for (const r of rows) {
    const key = r.student_answer.trim();
    const was = counts.get(key);
    counts.set(key, { n: (was?.n ?? 0) + 1, right: !!was?.right || r.is_correct });
  }
  return {
    players,
    rightPercent: pct(rows.filter((r) => r.is_correct).length),
    averageSeconds: times.length
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length / 1000)
      : null,
    picks: [...counts]
      .sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]))
      .map(([answer, { n, right }]) => ({ answer, percent: pct(n), right })),
  };
}

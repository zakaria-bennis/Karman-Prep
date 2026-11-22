// How the 72 skills' levels move (founder, 2026-11-14 and 2026-11-15). Pure, shared by the server and
// the tests.
//
// Skill sets: every skill starts at Not started and moves up one level at a time. Within one skill set
// of 8 questions, a run of right answers in a row moves it up: 3 in a row to Learning, 4 to
// Understanding, 5 to Proficient. One level a set, and only a set finished in full counts. An answer
// put right with a Second chance counts as right; an answer given with a hint does not.
//
// The Daily 10 is Karman's version of Khan Academy's Mastery Challenge (founder, 2026-11-14): it
// levels several skills up, keeps skills topped up, and levels a skill down when its question is
// missed. The exact rule was not set, so this follows Khan's: a skill whose questions were all right
// moves up one level; a skill with a miss moves down one, never below Learning once it was started.
// One move a skill a Daily 10. (My call, 2026-11-22; written down for the founder.)
import type { Level72 } from "./types";

/** Right answers in a row, within one set, that reach each level (index = the level reached). */
export const RUN_TO_REACH: readonly number[] = [0, 3, 4, 5];

export const LEVEL_NAMES = ["Not started", "Learning", "Understanding", "Proficient"] as const;

export const clampLevel72 = (n: number): Level72 =>
  Math.max(0, Math.min(3, Math.round(Number.isFinite(n) ? n : 0))) as Level72;

/** The longest run of answers that count as right, in order. */
export function bestRun(answers: readonly { ok: boolean; rescued?: boolean; hint?: boolean }[]) {
  let run = 0;
  let best = 0;
  for (const a of answers) {
    run = (a.ok || a.rescued) && !a.hint ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** A finished skill set's move: up one level when its best run reaches the next level's mark. */
export function setMove(
  from: Level72,
  answers: readonly { ok: boolean; rescued?: boolean; hint?: boolean }[],
  complete: boolean
): { from: Level72; to: Level72; run: number; needed: number } {
  const run = bestRun(answers);
  const needed = RUN_TO_REACH[Math.min(3, from + 1)];
  const up = complete && from < 3 && run >= needed;
  return { from, to: (up ? from + 1 : from) as Level72, run, needed };
}

/** A finished Daily 10's moves: by skill, all right moves up one, any miss moves down one (never
 *  below Learning for a started skill; a Not started skill stays put on a miss). */
export function dailyMoves(
  levelOf: (skillId: string) => Level72,
  answers: readonly { skillId: string; ok: boolean }[]
): { skillId: string; from: Level72; to: Level72 }[] {
  const bySkill = new Map<string, boolean[]>();
  for (const a of answers) bySkill.set(a.skillId, [...(bySkill.get(a.skillId) ?? []), a.ok]);
  const moves: { skillId: string; from: Level72; to: Level72 }[] = [];
  for (const [skillId, oks] of bySkill) {
    const from = levelOf(skillId);
    const missed = oks.some((ok) => !ok);
    const to = missed ? (from <= 1 ? from : ((from - 1) as Level72)) : clampLevel72(from + 1);
    if (to !== from) moves.push({ skillId, from, to });
  }
  return moves;
}

/*
 * Skill levels: the one student-facing measure of a skill (founder, 2026-11-08).
 *
 *   0 Not started   no answer yet (an empty outline square)
 *   1 New           reached on the first try, right or wrong
 *   2 Learning      a run of 3 right in a row since reaching New
 *   3 Understanding a run of 4 right in a row since reaching Learning
 *   4 Conquered     a run of 5 right in a row since reaching Understanding
 *
 * A run counts right answers in a row, without a hint, in the same skill, across every lane
 * that grades one question at a time (the Daily 10 and practice sets). A wrong answer or a
 * hint breaks it. Each level needs its own run: the run starts again at 0 after a level-up.
 * Wrong answers never take a level away; only decay does (DECAY_WEEKS without practice drops
 * one level, never below New).
 *
 * The level names, colours and run lengths come from `SKILL_LEVELS` in
 * `src/components/portal/skill-levels.ts`; this file only applies them. Pure: no database.
 */
import { SKILL_LEVELS, clampLevel, type SkillLevel } from "@/components/portal/skill-levels";

export type { SkillLevel };

/** Weeks without practice before a skill drops one level. Each further span drops another. */
export const DECAY_WEEKS = 4;
const DAY_MS = 86_400_000;
const DECAY_MS = DECAY_WEEKS * 7 * DAY_MS;

export type LevelState = {
  level: SkillLevel;
  /** Right answers in a row, without a hint, since the last level change. */
  run: number;
  /** Every answer ever counted in this skill. */
  answered: number;
  /** ISO time of the last answer in this skill. */
  lastPracticedAt: string | null;
};

export const NOT_STARTED: LevelState = { level: 0, run: 0, answered: 0, lastPracticedAt: null };

export type LevelChange = { from: SkillLevel; to: SkillLevel } | null;

/** Right answers in a row needed to move up from `level`; null at Conquered or before New. */
export function runToNext(level: SkillLevel): number | null {
  if (level < 1 || level >= 4) return null;
  return SKILL_LEVELS[level + 1].run;
}

/** Levels lost to decay by `now`: one per DECAY_WEEKS since the last answer, never below New. */
export function decaySteps(state: LevelState, now: Date): number {
  if (state.level <= 1 || !state.lastPracticedAt) return 0;
  const idle = now.getTime() - Date.parse(state.lastPracticedAt);
  if (!Number.isFinite(idle) || idle < DECAY_MS) return 0;
  return Math.min(state.level - 1, Math.floor(idle / DECAY_MS));
}

/** The state as it stands at `now`, after decay. A decayed skill starts its run again. */
export function effective(state: LevelState, now: Date): LevelState {
  const steps = decaySteps(state, now);
  if (!steps) return state;
  return { ...state, level: clampLevel(state.level - steps), run: 0 };
}

/** When the skill next loses a level to decay, or null when it cannot (New or below). */
export function nextDecayAt(state: LevelState): string | null {
  if (state.level <= 1 || !state.lastPracticedAt) return null;
  return new Date(Date.parse(state.lastPracticedAt) + DECAY_MS).toISOString();
}

export type GradedAnswer = { correct: boolean; usedHint: boolean; at: Date };

/** One graded answer in a one-at-a-time lane (Daily 10, practice set). */
export function applyAnswer(
  stored: LevelState,
  answer: GradedAnswer
): { state: LevelState; change: LevelChange } {
  const before = effective(stored, answer.at);
  const counts = answer.correct && !answer.usedHint;
  let level = before.level;
  let run = counts ? before.run + 1 : 0;
  if (level === 0) {
    level = 1;
    run = counts ? 1 : 0;
  } else {
    const needed = runToNext(level);
    if (needed !== null && run >= needed) {
      level = clampLevel(level + 1);
      run = 0;
    }
  }
  const state: LevelState = {
    level,
    run,
    answered: before.answered + 1,
    lastPracticedAt: answer.at.toISOString(),
  };
  return { state, change: level !== stored.level ? { from: stored.level, to: level } : null };
}

/**
 * The Domain quiz rule. A quiz moves each skill it covers at most one level: a skill moves up
 * when it had at least two questions and every one was right without a hint. Any miss or hint
 * ends the skill's run. Every skill it touched counts as practised (and as New when untried).
 */
export const QUIZ_MIN_QUESTIONS = 2;
export function applyQuizSkill(
  stored: LevelState,
  answers: readonly { correct: boolean; usedHint: boolean }[],
  at: Date
): { state: LevelState; change: LevelChange } {
  if (!answers.length) return { state: stored, change: null };
  const before = effective(stored, at);
  const clean = answers.every((a) => a.correct && !a.usedHint);
  let level: SkillLevel = before.level === 0 ? 1 : before.level;
  let run = clean ? before.run : 0;
  if (clean && answers.length >= QUIZ_MIN_QUESTIONS && level < 4) {
    level = clampLevel(level + 1);
    run = 0;
  }
  const state: LevelState = {
    level: clampLevel(level),
    run,
    answered: before.answered + answers.length,
    lastPracticedAt: at.toISOString(),
  };
  return {
    state,
    change: state.level !== stored.level ? { from: stored.level, to: state.level } : null,
  };
}

/**
 * Timed tests and the diagnostic measure; they do not move levels. They still mark a skill as
 * tried (New) and as practised, so it does not decay while the student is working.
 */
export function applyMeasured(stored: LevelState, count: number, at: Date): LevelState {
  if (count <= 0) return stored;
  const before = effective(stored, at);
  return {
    level: before.level === 0 ? 1 : before.level,
    run: before.run,
    answered: before.answered + count,
    lastPracticedAt: at.toISOString(),
  };
}

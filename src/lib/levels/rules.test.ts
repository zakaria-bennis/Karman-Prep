import { describe, expect, it } from "vitest";
import {
  DECAY_DAYS,
  DECAY_WEEKS,
  NOT_STARTED,
  applyAnswer,
  applyMeasured,
  applyQuizSkill,
  decayedLevel,
  effective,
  levelFromHistory,
  nextDecayAt,
  runToNext,
  type LevelState,
} from "./rules";

const t0 = new Date("2026-11-08T15:00:00Z");
const later = (days: number) => new Date(t0.getTime() + days * 86_400_000);
const right = { correct: true, usedHint: false, at: t0 };
const wrong = { correct: false, usedHint: false, at: t0 };
const hinted = { correct: true, usedHint: true, at: t0 };

function play(answers: { correct: boolean; usedHint: boolean; at: Date }[], from = NOT_STARTED) {
  let state = from;
  const changes = [];
  for (const answer of answers) {
    const next = applyAnswer(state, answer);
    state = next.state;
    if (next.change) changes.push(next.change);
  }
  return { state, changes };
}

describe("skill levels", () => {
  it("is New on the first try, right or wrong", () => {
    expect(play([wrong]).state.level).toBe(1);
    expect(play([right]).state).toMatchObject({ level: 1, run: 1 });
  });

  it("needs runs of 3, 4 and 5 for Learning, Understanding and Conquered", () => {
    expect(runToNext(1)).toBe(3);
    expect(runToNext(2)).toBe(4);
    expect(runToNext(3)).toBe(5);
    expect(runToNext(4)).toBeNull();
    // First try (right) starts the run: 3 right in a row reaches Learning.
    expect(play([right, right, right]).state).toMatchObject({ level: 2, run: 0 });
    // Learning to Understanding needs 4 more, then 5 more to Conquered.
    expect(play(Array(7).fill(right)).state.level).toBe(3);
    expect(play(Array(11).fill(right)).state.level).toBe(3);
    expect(play(Array(12).fill(right)).state.level).toBe(4);
  });

  it("breaks the run on a wrong answer or a hint", () => {
    expect(play([right, right, wrong, right, right]).state).toMatchObject({ level: 1, run: 2 });
    expect(play([right, right, hinted, right, right]).state).toMatchObject({ level: 1, run: 2 });
    expect(play([hinted]).state).toMatchObject({ level: 1, run: 0 });
  });

  it("never takes a level away for a wrong answer", () => {
    const learning = play([right, right, right]).state;
    expect(play([wrong, wrong, wrong], learning).state.level).toBe(2);
  });

  it("reports each level change once", () => {
    expect(play(Array(7).fill(right)).changes).toEqual([
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
    ]);
  });

  it(`decays one level after ${DECAY_WEEKS} weeks without practice, never below New`, () => {
    const conquered: LevelState = {
      level: 4,
      run: 2,
      answered: 20,
      lastPracticedAt: t0.toISOString(),
    };
    expect(effective(conquered, later(27)).level).toBe(4);
    expect(effective(conquered, later(28))).toMatchObject({ level: 3, run: 0 });
    expect(effective(conquered, later(56)).level).toBe(2);
    expect(effective(conquered, later(400)).level).toBe(1);
    expect(nextDecayAt(conquered)).toBe(later(28).toISOString());
    const fresh: LevelState = { ...conquered, level: 1 };
    expect(effective(fresh, later(400)).level).toBe(1);
    expect(nextDecayAt(fresh)).toBeNull();
  });

  it("applies decay before a new answer and restarts the run", () => {
    const understanding: LevelState = {
      level: 3,
      run: 3,
      answered: 9,
      lastPracticedAt: t0.toISOString(),
    };
    const { state, change } = applyAnswer(understanding, { ...right, at: later(30) });
    expect(state).toMatchObject({ level: 2, run: 1, answered: 10 });
    expect(change).toEqual({ from: 3, to: 2 });
  });

  it("moves a quiz skill one level when every question on it was right", () => {
    const learning: LevelState = { level: 2, run: 1, answered: 5, lastPracticedAt: null };
    const clean = [
      { correct: true, usedHint: false },
      { correct: true, usedHint: false },
    ];
    expect(applyQuizSkill(learning, clean, t0).state).toMatchObject({ level: 3, run: 0 });
    expect(applyQuizSkill(learning, [clean[0]], t0).state.level).toBe(2);
    expect(
      applyQuizSkill(learning, [...clean, { correct: false, usedHint: false }], t0).state
    ).toMatchObject({ level: 2, run: 0 });
    expect(applyQuizSkill(NOT_STARTED, clean, t0).state.level).toBe(2);
    expect(applyQuizSkill({ ...learning, level: 4 }, clean, t0).state.level).toBe(4);
  });

  it("marks measured skills as tried without moving levels", () => {
    expect(applyMeasured(NOT_STARTED, 3, t0)).toMatchObject({ level: 1, answered: 3 });
    const learning: LevelState = { level: 2, run: 2, answered: 5, lastPracticedAt: null };
    expect(applyMeasured(learning, 2, t0)).toMatchObject({ level: 2, run: 2, answered: 7 });
  });
});

describe("levels from saved answers (the parent, tutor and older-practice views)", () => {
  const now = new Date("2026-11-08T12:00:00Z");
  const lvl = (a: Parameters<typeof levelFromHistory>[0], at: Date) =>
    levelFromHistory(a, at).level;
  const answers = (pattern: string, start = "2026-11-07T10:00:00Z") =>
    [...pattern].map((ch, i) => ({
      correct: ch !== "0",
      usedHint: ch === "h",
      at: Date.parse(start) + i * 60_000,
    }));

  it("replays answers through the same run rule as live practice", () => {
    expect(lvl([], now)).toBe(0);
    expect(lvl(answers("0"), now)).toBe(1);
    expect(lvl(answers("111"), now)).toBe(2);
    expect(lvl(answers("1111111"), now)).toBe(3);
    expect(lvl(answers("111111111111"), now)).toBe(4);
    expect(lvl(answers("11h1"), now)).toBe(1);
    expect(lvl(answers("0111").reverse(), now)).toBe(2);
  });

  it("decays saved and replayed levels after DECAY_DAYS idle, never below New", () => {
    expect(DECAY_DAYS).toBe(28);
    expect(decayedLevel(4, "2026-11-01T12:00:00Z", now)).toBe(4);
    expect(decayedLevel(4, "2026-10-01T12:00:00Z", now)).toBe(3);
    expect(decayedLevel(4, "2025-01-01T12:00:00Z", now)).toBe(1);
    expect(decayedLevel(0, null, now)).toBe(0);
    expect(lvl(answers("111", "2026-09-01T10:00:00Z"), now)).toBe(1);
  });
});

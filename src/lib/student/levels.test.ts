import { describe, expect, it } from "vitest";
import {
  DECAY_DAYS,
  climb,
  decay,
  levelCounts,
  levelFromAnswers,
  levelFromBand,
  levelProgress,
  strongCount,
  type LevelAnswer,
} from "./levels";

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-08T12:00:00Z");
const run = (pattern: string, startDaysAgo = 1): LevelAnswer[] =>
  [...pattern].map((ch, i) => ({
    correct: ch === "1" || ch === "h",
    hint: ch === "h",
    at: NOW - startDaysAgo * DAY + i * 60_000,
  }));

describe("skill levels", () => {
  it("starts at not started, and any first answer is New", () => {
    expect(levelFromAnswers([], NOW)).toBe(0);
    expect(levelFromAnswers(run("0"), NOW)).toBe(1);
    expect(levelFromAnswers(run("1"), NOW)).toBe(1);
  });

  it("needs 3, then 4 more, then 5 more right in a row", () => {
    expect(levelFromAnswers(run("111"), NOW)).toBe(2);
    expect(levelFromAnswers(run("111" + "111"), NOW)).toBe(2);
    expect(levelFromAnswers(run("111" + "1111"), NOW)).toBe(3);
    expect(levelFromAnswers(run("111" + "1111" + "1111"), NOW)).toBe(3);
    expect(levelFromAnswers(run("111" + "1111" + "11111"), NOW)).toBe(4);
  });

  it("a wrong answer or a hint resets the run", () => {
    expect(levelFromAnswers(run("11011"), NOW)).toBe(1);
    expect(levelFromAnswers(run("11h11"), NOW)).toBe(1);
    expect(climb(run("1101")).run).toBe(1);
  });

  it("reads answers in time order, whatever order they arrive in", () => {
    const answers = run("0111").reverse();
    expect(levelFromAnswers(answers, NOW)).toBe(2);
  });

  it("drops a level for each idle stretch, never below New", () => {
    expect(decay(4, NOW - (DECAY_DAYS + 1) * DAY, NOW)).toBe(3);
    expect(decay(4, NOW - (3 * DECAY_DAYS + 1) * DAY, NOW)).toBe(1);
    expect(decay(4, NOW - 30 * DECAY_DAYS * DAY, NOW)).toBe(1);
    expect(decay(1, NOW - 30 * DECAY_DAYS * DAY, NOW)).toBe(1);
    expect(levelFromAnswers(run("111" + "1111", DECAY_DAYS + 2), NOW)).toBe(2);
  });

  it("maps the older mastery bands", () => {
    expect(levelFromBand(null, 0)).toBe(0);
    expect(levelFromBand(null, 2)).toBe(1);
    expect(levelFromBand("struggling", 5)).toBe(1);
    expect(levelFromBand("developing", 5)).toBe(2);
    expect(levelFromBand("proficient", 9)).toBe(3);
    expect(levelFromBand("mastered", 12)).toBe(4);
  });

  it("counts, progress and strong skills", () => {
    expect(levelCounts([0, 1, 1, 4])).toEqual({ 0: 1, 1: 2, 2: 0, 3: 0, 4: 1 });
    expect(levelProgress([])).toBe(0);
    expect(levelProgress([4, 4, 0, 0])).toBe(0.5);
    expect(strongCount([2, 3, 4, 1])).toBe(2);
  });
});

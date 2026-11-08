import { describe, expect, it } from "vitest";
import { initialRewards, rewardFor, rewardReducer, showsDots } from "./rewards";

const graded = (key: string, index: number, correct: boolean, points = correct ? 10 : 0) => ({
  kind: "graded" as const,
  key,
  index,
  correct,
  points,
});

describe("rewards", () => {
  it("the same graded answer twice changes nothing", () => {
    const once = rewardReducer(initialRewards(5), graded("a", 0, true));
    expect(rewardReducer(once, graded("a", 0, true))).toBe(once);
    expect(once.setPoints).toBe(10);
  });
  it("shows the streak from 3 in a row", () => {
    let s = initialRewards(10);
    s = rewardReducer(s, graded("a", 0, true));
    s = rewardReducer(s, graded("b", 1, true));
    expect(rewardFor(s).showStreak).toBe(false);
    s = rewardReducer(s, graded("c", 2, true));
    expect(rewardFor(s).showStreak).toBe(true);
  });
  it("every fifth in a row is the richer reward", () => {
    let s = initialRewards(12);
    for (let i = 0; i < 5; i++) s = rewardReducer(s, graded(`k${i}`, i, true));
    expect(rewardFor(s).tier).toBe("streak5");
    s = rewardReducer(s, graded("k5", 5, true));
    expect(rewardFor(s).tier).toBe("correct");
    for (let i = 6; i < 10; i++) s = rewardReducer(s, graded(`k${i}`, i, true));
    expect(rewardFor(s).tier).toBe("streak5");
  });
  it("a wrong answer resets the streak and fills its dot as wrong", () => {
    let s = rewardReducer(initialRewards(3), graded("a", 0, true));
    s = rewardReducer(s, graded("b", 1, false));
    expect(s.streak).toBe(0);
    expect(s.dots).toEqual(["correct", "wrong", "open"]);
    expect(rewardFor(s).tier).toBe("none");
  });
  it("uses dots for sets of 12 or fewer", () => {
    expect(showsDots(12)).toBe(true);
    expect(showsDots(13)).toBe(false);
  });
});

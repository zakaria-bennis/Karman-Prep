import { describe, expect, it } from "vitest";
import { coursePercent, skillLevelFromAnswers } from "./progress-rules";

describe("skill level from answers in order", () => {
  it("is not started with no answers", () => {
    expect(skillLevelFromAnswers([])).toBe(0);
  });
  it("is New once tried, below a run of 3", () => {
    expect(skillLevelFromAnswers([true, true, false])).toBe(1);
  });
  it("climbs at runs of 3, 4 and 5 right answers in a row", () => {
    expect(skillLevelFromAnswers([true, true, true])).toBe(2);
    expect(skillLevelFromAnswers([false, true, true, true, true])).toBe(3);
    expect(skillLevelFromAnswers([true, true, true, true, true, false])).toBe(4);
  });
});

describe("course percent", () => {
  it("is the share of the way to Conquered across every skill", () => {
    expect(coursePercent([0, 0, 0, 0])).toBe(0);
    expect(coursePercent([4, 4, 0, 0])).toBe(50);
    expect(coursePercent([1, 2, 3, 4])).toBe(63);
    expect(coursePercent([])).toBe(0);
  });
});

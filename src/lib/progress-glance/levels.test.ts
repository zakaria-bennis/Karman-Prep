import { describe, expect, it } from "vitest";
import {
  buildProgressGlance,
  coursePercent,
  decayed,
  predictedScore,
  skillLevelFromAnswers,
} from "./levels";

describe("skillLevelFromAnswers", () => {
  it("is not started with no answers and New after any answer", () => {
    expect(skillLevelFromAnswers([])).toBe(0);
    expect(skillLevelFromAnswers([false])).toBe(1);
    expect(skillLevelFromAnswers([true, true])).toBe(1);
  });

  it("moves up on runs of 3, 4 and 5 right answers in a row", () => {
    expect(skillLevelFromAnswers([true, true, true])).toBe(2);
    expect(skillLevelFromAnswers([true, false, true, true, true, true])).toBe(3);
    expect(skillLevelFromAnswers([false, true, true, true, true, true])).toBe(4);
  });
});

describe("decayed", () => {
  const now = new Date("2026-11-08T12:00:00Z");
  it("drops one level per three idle weeks, never below New", () => {
    expect(decayed(4, "2026-11-01T12:00:00Z", now)).toBe(4);
    expect(decayed(4, "2026-10-17T12:00:00Z", now)).toBe(3);
    expect(decayed(4, "2026-09-01T12:00:00Z", now)).toBe(1);
    expect(decayed(2, "2025-01-01T12:00:00Z", now)).toBe(1);
    expect(decayed(0, null, now)).toBe(0);
  });
});

describe("buildProgressGlance", () => {
  it("groups every catalog skill by Domain and counts levels", () => {
    const now = new Date("2026-11-08T12:00:00Z");
    const answers = [true, true, true, true, true].map((correct, i) => ({
      skillId: "ma-skill-percentages",
      correct,
      at: `2026-11-07T10:0${i}:00Z`,
    }));
    const glance = buildProgressGlance(answers, now);
    expect(glance.domains).toHaveLength(8);
    const all = glance.domains.flatMap((d) => d.skills);
    expect(all.find((s) => s.id === "ma-skill-percentages")?.level).toBe(4);
    expect(glance.counts[4]).toBe(1);
    expect(glance.counts[0]).toBe(all.length - 1);
    expect(glance.coursePercent.math).toBeGreaterThan(0);
    expect(glance.coursePercent.reading).toBe(0);
  });

  it("never carries question ids or answers", () => {
    const glance = buildProgressGlance([
      { skillId: "rw-skill-transitions", correct: false, at: "2026-11-07T10:00:00Z" },
    ]);
    expect(JSON.stringify(glance)).not.toMatch(/correct|question|answer/i);
  });
});

describe("coursePercent and predictedScore", () => {
  it("measures the way to Conquered", () => {
    expect(coursePercent([])).toBe(0);
    expect(coursePercent([4, 4])).toBe(100);
    expect(coursePercent([2, 0])).toBe(25);
  });

  it("gives one score from a range, rounded to 10", () => {
    expect(predictedScore(1255, 1335)).toBe(1300);
    expect(predictedScore(1150, 1230)).toBe(1190);
    expect(predictedScore(1580, 1640)).toBe(1600);
  });
});

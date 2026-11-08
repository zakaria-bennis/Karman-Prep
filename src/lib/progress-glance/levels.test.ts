import { describe, expect, it } from "vitest";
import { buildProgressGlance, coursePercent, predictedScore } from "./levels";

describe("buildProgressGlance", () => {
  it("groups every catalog skill by Domain and counts levels", () => {
    const now = new Date("2026-11-08T12:00:00Z");
    // 3, then 4, then 5 right in a row (src/lib/levels/rules.ts): Conquered.
    const answers = Array.from({ length: 12 }, (_, i) => ({
      skillId: "ma-skill-percentages",
      correct: true,
      at: `2026-11-07T10:${String(i).padStart(2, "0")}:00Z`,
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

  it("follows the one level rule: each level needs its own run, and idle weeks decay", () => {
    const now = new Date("2026-11-08T12:00:00Z");
    const at = (day: string, i: number) => `${day}T10:${String(i).padStart(2, "0")}:00Z`;
    const level = (
      answers: { correct: boolean; at: string }[],
      stored?: Map<string, 0 | 1 | 2 | 3 | 4>
    ) =>
      buildProgressGlance(
        answers.map((a) => ({ ...a, skillId: "ma-skill-percentages" })),
        now,
        stored
      )
        .domains.flatMap((d) => d.skills)
        .find((s) => s.id === "ma-skill-percentages")?.level;
    const right = (n: number, day = "2026-11-07") =>
      Array.from({ length: n }, (_, i) => ({ correct: true, at: at(day, i) }));
    expect(level(right(5))).toBe(2);
    expect(level(right(7))).toBe(3);
    // Learning reached on Sep 1, then more than 4 weeks idle: back to New.
    expect(level(right(3, "2026-09-01"))).toBe(1);
    // A higher level saved by the quiz flows wins.
    expect(level(right(3), new Map([["ma-skill-percentages", 4]]))).toBe(4);
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

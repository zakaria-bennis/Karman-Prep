import { describe, expect, it } from "vitest";
import { buildProgressGlance, coursePercent, predictedScore } from "./levels";

describe("levels follow the one rule (src/lib/levels/rules.ts)", () => {
  const now = new Date("2026-11-08T12:00:00Z");
  const answers = (skillId: string, pattern: string, day = "2026-11-07") =>
    [...pattern].map((ch, i) => ({
      skillId,
      correct: ch === "1",
      at: `${day}T10:${String(i).padStart(2, "0")}:00Z`,
    }));
  const levelOf = (list: ReturnType<typeof answers>, at = now) =>
    buildProgressGlance(list, at)
      .domains.flatMap((d) => d.skills)
      .find((s) => s.id === list[0].skillId)?.level;

  it("needs 3, then 4 more, then 5 more right in a row", () => {
    expect(levelOf(answers("ma-skill-probability-and-conditional-probability", "0"))).toBe(1);
    expect(levelOf(answers("ma-skill-probability-and-conditional-probability", "111"))).toBe(2);
    expect(levelOf(answers("ma-skill-probability-and-conditional-probability", "11111"))).toBe(2);
    expect(levelOf(answers("ma-skill-probability-and-conditional-probability", "1111111"))).toBe(3);
    expect(
      levelOf(answers("ma-skill-probability-and-conditional-probability", "111111111111"))
    ).toBe(4);
  });

  it("drops one level per 4 idle weeks, never below New", () => {
    const learning = answers(
      "ma-skill-probability-and-conditional-probability",
      "111",
      "2026-10-01"
    );
    expect(levelOf(learning, new Date("2026-10-20T12:00:00Z"))).toBe(2);
    expect(levelOf(learning, new Date("2026-11-08T12:00:00Z"))).toBe(1);
  });
});

describe("buildProgressGlance", () => {
  it("groups every sub-skill by Domain and counts levels", () => {
    const now = new Date("2026-11-08T12:00:00Z");
    const answers = [true, true, true, true, true].map((correct, i) => ({
      skillId: "ma-skill-probability-and-conditional-probability",
      correct,
      at: `2026-11-07T10:0${i}:00Z`,
    }));
    const glance = buildProgressGlance(answers, now);
    expect(glance.domains).toHaveLength(8);
    const all = glance.domains.flatMap((d) => d.skills);
    expect(
      all.find((s) => s.id === "ma-skill-probability-and-conditional-probability")?.level
    ).toBe(2);
    expect(glance.counts[2]).toBe(1);
    expect(glance.counts[0]).toBe(all.length - 1);
    expect(glance.coursePercent.math).toBeGreaterThan(0);
    expect(glance.coursePercent.reading).toBe(0);
  });

  it("shows a higher level the quiz flows saved", () => {
    const now = new Date("2026-11-08T12:00:00Z");
    const answers = [true, true, true].map((correct, i) => ({
      skillId: "ma-skill-probability-and-conditional-probability",
      correct,
      at: `2026-11-07T10:0${i}:00Z`,
    }));
    const level = (stored?: Map<string, 0 | 1 | 2 | 3 | 4>) =>
      buildProgressGlance(answers, now, stored)
        .domains.flatMap((d) => d.skills)
        .find((s) => s.id === "ma-skill-probability-and-conditional-probability")?.level;
    expect(level()).toBe(2);
    expect(level(new Map([["ma-skill-probability-and-conditional-probability", 4]]))).toBe(4);
    expect(level(new Map([["ma-skill-probability-and-conditional-probability", 1]]))).toBe(2);
  });

  it("places answers in their sub-skill's square", () => {
    const glance = buildProgressGlance(
      [true, true, true].map((correct, i) => ({
        skillId: "ma-skill-percentages",
        subSkillId: "ma-skill-percentages--change",
        correct,
        at: `2026-11-07T10:0${i}:00Z`,
      })),
      new Date("2026-11-08T12:00:00Z")
    );
    const all = glance.domains.flatMap((d) => d.skills);
    expect(all.find((s) => s.id === "ma-skill-percentages--change")?.level).toBe(2);
    expect(all.find((s) => s.id === "ma-skill-percentages--of")?.level).toBe(0);
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

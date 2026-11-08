import { describe, expect, it } from "vitest";
import { pointsForAnswer, summarisePoints } from "./skill-points";

describe("pointsForAnswer", () => {
  it("matches the quiz-engine rule", () => {
    expect(pointsForAnswer(true, 4)).toBe(10);
    expect(pointsForAnswer(true, 5)).toBe(15);
    expect(pointsForAnswer(false, 7)).toBe(0);
  });
});

describe("summarisePoints", () => {
  const now = Date.parse("2026-10-27T12:00:00Z");
  it("sums per skill, overall and for the last seven days, once per award key", () => {
    const s = summarisePoints(
      [
        { awardKey: "a", skillId: "ma-skill-x", points: 10, createdAt: "2026-10-26T00:00:00Z" },
        { awardKey: "a", skillId: "ma-skill-x", points: 10, createdAt: "2026-10-26T00:00:00Z" },
        { awardKey: "b", skillId: "ma-skill-x", points: 15, createdAt: "2026-10-01T00:00:00Z" },
        { awardKey: "c", skillId: "rw-skill-y", points: 10, createdAt: "2026-10-25T00:00:00Z" },
        { awardKey: "d", skillId: null, points: 10, createdAt: "2026-10-25T00:00:00Z" },
      ],
      now
    );
    expect(s.total).toBe(45);
    expect(s.week).toBe(30);
    expect(s.bySkill.get("ma-skill-x")).toEqual({ total: 25, week: 10 });
    expect(s.bySkill.get("rw-skill-y")).toEqual({ total: 10, week: 10 });
  });
});

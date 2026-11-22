import { describe, expect, it } from "vitest";
import type { EngineItem } from "@/lib/sat-engine/params";
import { buildPacing, expectedSeconds, markOf, median } from "./pacing";
import { missCosts, reinforceSkills, type ScoredAnswer } from "./reinforce";

const item = (n: number, difficulty: number): EngineItem => ({
  id: `q${n}`,
  section: "math",
  domainId: "algebra",
  skillId: "ma-skill-linear-functions",
  difficulty,
  format: "multiple-choice",
  family: `q${n}`,
});

const answers = (pattern: string, skills: string[]): ScoredAnswer[] =>
  [...pattern].map((c, i) => ({
    section: "math",
    item: item(i, 1 + (i % 7)),
    correct: c === "1",
    trial: false,
    skill72: skills[i % skills.length],
  }));

describe("Reinforce", () => {
  it("costs nothing for right answers and something for each miss", () => {
    const list = answers("1101101110011101101101", ["m-linear-functions"]);
    const costs = missCosts(list);
    list.forEach((a, i) =>
      a.correct ? expect(costs[i]).toBe(0) : expect(costs[i]).toBeGreaterThan(0)
    );
  });

  it("puts the skill whose misses cost the most first", () => {
    // Every miss is in the first skill; the second has one.
    const list = answers("0101010101010101011111", ["m-circles", "m-percentages"]);
    list[1].correct = false;
    const skills = reinforceSkills(list);
    expect(skills[0].skillId).toBe("m-circles");
    expect(skills[0].name).toBe("Circles");
    expect(skills.every((s) => s.points >= 1)).toBe(true);
  });
});

describe("pacing", () => {
  it("expects more time for harder questions and uses a learned median when there is one", () => {
    expect(expectedSeconds("m-circles", 7, new Map())).toBeGreaterThan(
      expectedSeconds("m-circles", 1, new Map())
    );
    expect(expectedSeconds("m-circles", 4, new Map([["m-circles|medium", 61]]))).toBe(61);
  });

  it("marks too fast, on pace, too slow and blank, and names the slowest three", () => {
    expect(markOf(10, 100, true)).toBe("fast");
    expect(markOf(100, 100, true)).toBe("pace");
    expect(markOf(200, 100, true)).toBe("slow");
    expect(markOf(0, 100, false)).toBe("blank");
    const p = buildPacing(
      [30, 400, 90, 500, 300, 600].map((seconds) => ({
        module: "m1",
        skill72: "m-circles",
        difficulty: 4,
        seconds,
        answered: true,
      })),
      new Map()
    );
    expect(p.modules[0].marks).toEqual(["fast", "slow", "pace", "slow", "slow", "slow"]);
    expect(p.slowest.map((s) => s.number)).toEqual([6, 4, 2]);
    expect(median([5, 1, 3])).toBe(3);
  });
});

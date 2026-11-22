import { describe, expect, it } from "vitest";
import type { EngineItem } from "@/lib/sat-engine/params";
import {
  EXAM_COINS,
  buildResult,
  chooseRoute,
  examCoins,
  nextSteps,
  type GradedAnswer,
} from "./result";
import type { ModuleKey } from "./plan";

const item = (
  n: number,
  section: "reading" | "math",
  difficulty: number,
  skillId: string
): EngineItem => ({
  id: `q${n}`,
  section,
  domainId: section === "math" ? "algebra" : "info_ideas",
  skillId,
  difficulty,
  format: "multiple-choice",
  family: `q${n}`,
});

function module(
  key: ModuleKey,
  section: "reading" | "math",
  size: number,
  right: number,
  skill = section === "math" ? "ma-skill-linear-functions" : "rw-skill-inferences"
): GradedAnswer[] {
  return Array.from({ length: size }, (_, i) => ({
    module: key,
    item: item(i + key.length * 100, section, 1 + (i % 7), skill),
    correct: i < right,
    trial: i === 5 || i === 9,
    answered: true,
    seconds: 60,
  }));
}

describe("exam routing and scoring", () => {
  it("routes a strong Module 1 harder and a weak one easier", () => {
    expect(chooseRoute("reading", module("rw1", "reading", 27, 25))).toBe("harder");
    expect(chooseRoute("reading", module("rw1", "reading", 27, 4))).toBe("easier");
    expect(chooseRoute("math", module("m1", "math", 22, 21))).toBe("harder");
    expect(chooseRoute("math", module("m1", "math", 22, 2))).toBe("easier");
  });

  it("scores 200 to 800 per section, more right scoring higher, trial questions left out", () => {
    const strong = buildResult({
      form: 1,
      answers: [
        ...module("rw1", "reading", 27, 26),
        ...module("rw2", "reading", 27, 25),
        ...module("m1", "math", 22, 21),
        ...module("m2", "math", 22, 20),
      ],
      routes: { reading: "harder", math: "harder" },
      minutes: { rw1: 30, rw2: 31, m1: 33, m2: 34 },
      previousTotal: null,
      earlier: [],
      completedAt: new Date("2026-11-28T18:00:00Z"),
    });
    const weak = buildResult({
      form: 1,
      answers: [
        ...module("rw1", "reading", 27, 8),
        ...module("rw2", "reading", 27, 7),
        ...module("m1", "math", 22, 6),
        ...module("m2", "math", 22, 5),
      ],
      routes: { reading: "easier", math: "easier" },
      minutes: { rw1: 30, rw2: 31, m1: 33, m2: 34 },
      previousTotal: null,
      earlier: [],
      completedAt: new Date("2026-11-28T18:00:00Z"),
    });
    for (const r of [strong, weak]) {
      expect(r.reading.score).toBeGreaterThanOrEqual(200);
      expect(r.math.score).toBeLessThanOrEqual(800);
      expect(r.total).toBe(r.reading.score + r.math.score);
      expect(r.reading.scored).toBe(50); // 54 asked, 4 trial
      expect(r.math.scored).toBe(40);
      expect(r.total % 10).toBe(0);
    }
    expect(strong.total).toBeGreaterThan(weak.total + 300);
    expect(strong.coins).toBe(EXAM_COINS.first);
  });

  it("pays coins by improvement over the last exam", () => {
    expect(examCoins(1200, null)).toBe(EXAM_COINS.first);
    expect(examCoins(1180, 1200)).toBe(EXAM_COINS.finished);
    expect(examCoins(1250, 1200)).toBe(EXAM_COINS.finished + 50 * EXAM_COINS.perPoint);
    expect(examCoins(1600, 400)).toBe(EXAM_COINS.most);
  });

  it("shows the predicted score once there are two scored exams", () => {
    const base = {
      form: 2,
      answers: [...module("rw1", "reading", 27, 15), ...module("m1", "math", 22, 12)],
      routes: { reading: "easier", math: "easier" } as const,
      minutes: { rw1: 1, rw2: 1, m1: 1, m2: 1 },
      previousTotal: null,
      completedAt: new Date(),
    };
    expect(buildResult({ ...base, earlier: [] }).predicted).toEqual({ before: null, after: null });
    const one = buildResult({ ...base, earlier: [1010] });
    expect(one.predicted).toEqual({ before: null, after: one.total });
    const two = buildResult({ ...base, earlier: [1010, 1090] });
    expect(two.predicted).toEqual({ before: 1090, after: two.total });
  });

  it("names the three skills with the most misses", () => {
    const answers = [
      ...module("rw1", "reading", 10, 2, "rw-skill-transitions"),
      ...module("rw2", "reading", 10, 6, "rw-skill-inferences"),
      ...module("m1", "math", 10, 8, "ma-skill-circles"),
      ...module("m2", "math", 10, 10, "ma-skill-percentages"),
    ];
    const steps = nextSteps(answers);
    expect(steps.map((s) => s.skillId)).toEqual([
      "rw-skill-transitions",
      "rw-skill-inferences",
      "ma-skill-circles",
    ]);
    expect(steps[0].name).toBe("Transitions");
  });
});

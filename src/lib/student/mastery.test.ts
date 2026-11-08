import { describe, expect, it } from "vitest";
import { estimateSkill, recencyWeight, type Observation } from "./mastery";
import type { QuizDifficultyLevel } from "@/types/quiz";

const o = (correct: boolean, difficulty: number, ageDays = 0): Observation => ({
  correct,
  difficulty: difficulty as QuizDifficultyLevel,
  ageDays,
});
const many = (n: number, f: (i: number) => Observation) =>
  Array.from({ length: n }, (_, i) => f(i));

describe("estimateSkill", () => {
  it("gives no band with too little evidence", () => {
    expect(estimateSkill([o(true, 4), o(true, 4)]).band).toBeNull();
    expect(estimateSkill([]).mastery).toBe(Math.round(100 / (1 + Math.exp(0.55))));
  });
  it("halves the weight of an answer every 30 days", () => {
    expect(recencyWeight(30)).toBeCloseTo(0.5);
    expect(recencyWeight(60)).toBeCloseTo(0.25);
  });
  it("rewards a hard right answer more than an easy one", () => {
    const easy = estimateSkill([...many(6, () => o(true, 2)), o(false, 4)]);
    const hard = estimateSkill([...many(6, () => o(true, 6)), o(false, 4)]);
    expect(hard.ability).toBeGreaterThan(easy.ability);
  });
  it("punishes an easy miss more than a hard miss", () => {
    const base = many(8, () => o(true, 5));
    const easyMiss = estimateSkill([...base, o(false, 1)]);
    const hardMiss = estimateSkill([...base, o(false, 7)]);
    expect(easyMiss.ability).toBeLessThan(hardMiss.ability);
  });
  it("lets recent answers outweigh old ones", () => {
    const oldWrongNewRight = estimateSkill([
      ...many(8, () => o(false, 4, 120)),
      ...many(8, () => o(true, 4, 1)),
    ]);
    const oldRightNewWrong = estimateSkill([
      ...many(8, () => o(true, 4, 120)),
      ...many(8, () => o(false, 4, 1)),
    ]);
    expect(oldWrongNewRight.mastery).toBeGreaterThan(oldRightNewWrong.mastery);
  });
  it("needs hard right answers for mastered", () => {
    const easyOnly = estimateSkill(many(30, () => o(true, 3)));
    expect(easyOnly.band).not.toBe("mastered");
    const hardToo = estimateSkill(many(30, (i) => o(true, i % 2 ? 6 : 4)));
    expect(hardToo.band).toBe("mastered");
  });
  it("orders bands by performance", () => {
    const struggling = estimateSkill(many(12, (i) => o(i % 5 === 0, 4)));
    const developing = estimateSkill(many(12, (i) => o(i % 2 === 0, 4)));
    const proficient = estimateSkill(many(16, (i) => o(i % 5 !== 0, 5)));
    expect(struggling.band).toBe("struggling");
    expect(developing.band).toBe("developing");
    expect(proficient.band).toBe("proficient");
  });
  it("stays finite on all-right and all-wrong histories", () => {
    for (const correct of [true, false]) {
      const e = estimateSkill(many(50, () => o(correct, 4)));
      expect(Number.isFinite(e.ability)).toBe(true);
      expect(e.mastery).toBeGreaterThanOrEqual(0);
      expect(e.mastery).toBeLessThanOrEqual(100);
    }
  });
});

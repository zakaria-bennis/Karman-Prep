import { describe, expect, it } from "vitest";
import { pickPracticeQuestions, stableHash, type AnsweredQuestion } from "./picker";

function pool(size: number, levels = 7) {
  return Array.from({ length: size }, (_, index) => ({
    questionId: `q-${String(index).padStart(4, "0")}`,
    difficulty: (index % levels) + 1,
  }));
}
const base = { studentId: "student-1", day: "2026-11-08" };

describe("practice question picker", () => {
  it("is a stable 32-bit hash", () => {
    expect(stableHash("a")).toBe(stableHash("a"));
    expect(stableHash("a")).not.toBe(stableHash("b"));
    expect(stableHash("anything")).toBeGreaterThanOrEqual(0);
    expect(stableHash("anything")).toBeLessThan(2 ** 32);
  });

  it("picks ten distinct questions spread across every difficulty level", () => {
    const picked = pickPracticeQuestions(pool(200), [], base);
    expect(picked).toHaveLength(10);
    expect(new Set(picked).size).toBe(10);
    const levels = new Set(picked.map((id) => (Number(id.slice(2)) % 7) + 1));
    expect(levels.size).toBe(7);
  });

  it("orders the session from easier to harder", () => {
    const candidates = pool(200);
    const level = new Map(candidates.map((item) => [item.questionId, item.difficulty]));
    const levels = pickPracticeQuestions(candidates, [], base).map((id) => level.get(id)!);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });

  it("does not depend on the order the pool arrives in", () => {
    const candidates = pool(120);
    expect(pickPracticeQuestions([...candidates].reverse(), [], base)).toEqual(
      pickPracticeQuestions(candidates, [], base)
    );
  });

  it("varies by student and by UTC day, not only by question id", () => {
    const candidates = pool(300);
    const first = pickPracticeQuestions(candidates, [], base);
    expect(pickPracticeQuestions(candidates, [], { ...base, studentId: "student-2" })).not.toEqual(
      first
    );
    expect(pickPracticeQuestions(candidates, [], { ...base, day: "2026-11-09" })).not.toEqual(
      first
    );
    expect(first).not.toEqual(candidates.slice(0, 10).map((item) => item.questionId));
  });

  it("serves unanswered questions before answered ones", () => {
    const candidates = pool(14);
    const history: AnsweredQuestion[] = candidates
      .slice(0, 10)
      .map((item) => ({ questionId: item.questionId, answeredAt: "2026-11-01T00:00:00Z" }));
    const picked = pickPracticeQuestions(candidates, history, base);
    expect(picked).toHaveLength(10);
    for (const item of candidates.slice(10)) expect(picked).toContain(item.questionId);
  });

  it("fills from the least recently answered when fewer than ten are unseen", () => {
    const candidates = pool(12);
    const history: AnsweredQuestion[] = candidates.map((item, index) => ({
      questionId: item.questionId,
      // q-0000 answered longest ago, q-0011 most recently.
      answeredAt: new Date(Date.UTC(2026, 9, 1 + index)).toISOString(),
    }));
    history.push({ questionId: "q-0000", answeredAt: "2026-11-07T00:00:00Z" });
    const picked = pickPracticeQuestions(candidates, history, base);
    expect(picked).toHaveLength(10);
    // Most recent answer counts: q-0000 was seen again yesterday, so it is left out with q-0011.
    expect(picked).not.toContain("q-0000");
    expect(picked).not.toContain("q-0011");
  });

  it("returns the whole pool when it holds fewer than ten questions", () => {
    expect(pickPracticeQuestions(pool(4), [], base).sort()).toEqual(
      pool(4).map((item) => item.questionId)
    );
    expect(pickPracticeQuestions([], [], base)).toEqual([]);
  });

  it("ignores history for questions no longer in the pool and duplicate pool entries", () => {
    const candidates = pool(3);
    const picked = pickPracticeQuestions(
      [...candidates, candidates[0]],
      [{ questionId: "gone", answeredAt: "2026-11-01T00:00:00Z" }],
      base
    );
    expect(picked.sort()).toEqual(candidates.map((item) => item.questionId));
  });

  it("reaches every question of a skill when a student keeps practising", () => {
    // The audit's reachability idea, replayed on the picker: answer every served question
    // in each session and check that the whole pool is eventually served.
    for (const size of [13, 44, 391, 623]) {
      const candidates = pool(size);
      const history: AnsweredQuestion[] = [];
      const served = new Set<string>();
      const sessions = Math.ceil(size / 10);
      for (let session = 0; session < sessions; session++) {
        const at = new Date(Date.UTC(2026, 10, 1, 0, session)).toISOString();
        const day = at.slice(0, 10);
        for (const id of pickPracticeQuestions(candidates, history, { ...base, day })) {
          served.add(id);
          history.push({ questionId: id, answeredAt: at });
        }
      }
      expect(served.size).toBe(size);
    }
  });

  it("reaches every question across days even when nothing is answered", () => {
    const candidates = pool(120);
    const served = new Set<string>();
    for (let day = 1; day <= 120; day++) {
      const key = new Date(Date.UTC(2026, 0, day)).toISOString().slice(0, 10);
      for (const id of pickPracticeQuestions(candidates, [], { ...base, day: key })) served.add(id);
    }
    expect(served.size).toBe(candidates.length);
  });
});

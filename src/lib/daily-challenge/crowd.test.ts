import { describe, expect, it } from "vitest";
import { crowdOf } from "./crowd";

describe("crowdOf", () => {
  it("counts right answers, average time and picks", () => {
    const c = crowdOf([
      { student_answer: "A", is_correct: true, active_ms: 40_000 },
      { student_answer: "A", is_correct: true, active_ms: 60_000 },
      { student_answer: "B", is_correct: false, active_ms: null },
      { student_answer: "C", is_correct: false, active_ms: 3_600_000 },
    ]);
    expect(c.players).toBe(4);
    expect(c.rightPercent).toBe(50);
    expect(c.averageSeconds).toBe(50);
    expect(c.picks).toEqual([
      { answer: "A", percent: 50, right: true },
      { answer: "B", percent: 25, right: false },
      { answer: "C", percent: 25, right: false },
    ]);
  });
  it("is empty with no players", () => {
    expect(crowdOf([])).toEqual({ players: 0, rightPercent: 0, averageSeconds: null, picks: [] });
  });
});

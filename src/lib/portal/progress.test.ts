import { describe, expect, it } from "vitest";
import { activity, predict } from "@/app/dev/shell/progressData";
import { buildStudent, type ProgressInput } from "./progress";

// noon in Central time, so the day keys are stable
const NOW = Date.parse("2026-11-21T18:00:00Z");
const at = (day: string, hour = 18) => `${day}T${String(hour).padStart(2, "0")}:00:00Z`;

const base: ProgressInput = {
  nowMs: NOW,
  answers: [],
  exams: [],
  dailyDays: [],
  challengeDays: [],
  sets: [],
  bursts: [],
  testDate: null,
  proficientAt: (answers) => Math.floor(answers.length / 2),
  proficientNow: 0,
};

describe("a real student's Progress record", () => {
  it("is blank with nothing answered", () => {
    const s = buildStudent(base);
    expect(s.blank).toBe(true);
    expect(s.days).toBe(0);
    expect(activity(s)).toHaveLength(1);
  });

  it("counts days from the first answer and logs each day", () => {
    const s = buildStudent({
      ...base,
      answers: [
        { at: at("2026-11-18"), correct: true, seconds: 60 },
        { at: at("2026-11-18"), correct: false, seconds: 600 },
        { at: at("2026-11-20"), correct: true, seconds: 30 },
      ],
      dailyDays: ["2026-11-20"],
      challengeDays: ["2026-11-18"],
      sets: [at("2026-11-18")],
      testDate: "2026-12-05",
      proficientNow: 4,
    });
    expect(s.days).toBe(3);
    expect(s.testIn).toBe(14);
    const log = activity(s);
    expect(log.map((l) => l.questions)).toEqual([2, 0, 1, 0]);
    expect(log[0]).toMatchObject({ correct: 1, sets: 1, challenge: true, daily10: false });
    // a long answer counts for two minutes at most: 60 + 120 seconds
    expect(log[0].minutes).toBe(3);
    expect(log[0].pace).toBe(90);
    expect(log[2].daily10).toBe(true);
    expect(log.map((l) => l.proficient)).toEqual([1, 1, 1, 4]);
  });

  it("draws the score straight between real exams, with their own sections", () => {
    const s = buildStudent({
      ...base,
      exams: [
        { at: at("2026-11-11"), total: 1200, rw: 600, math: 600, right: 70, asked: 98 },
        { at: at("2026-11-21"), total: 1300, rw: 640, math: 660, right: 80, asked: 98 },
      ],
    });
    expect(s.exams.map((e) => e.day)).toEqual([0, 10]);
    expect(s.now).toBe(1300);
    const line = predict(s);
    expect(line[0]).toEqual({ day: 0, total: 1200, rw: 600, math: 600 });
    expect(line[5]).toEqual({ day: 5, total: 1250, rw: 620, math: 630 });
    expect(line.at(-1)).toEqual({ day: 10, total: 1300, rw: 640, math: 660 });
    expect(activity(s)[10]).toMatchObject({ exam: 2, questions: 98, correct: 80 });
  });

  it("has no prediction with one exam", () => {
    const s = buildStudent({ ...base, exams: [{ at: at("2026-11-20"), total: 1100 }] });
    expect(s.now).toBe(0);
    expect(predict(s)).toEqual([]);
  });
});

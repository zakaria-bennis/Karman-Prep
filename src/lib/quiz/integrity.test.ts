import { describe, expect, it } from "vitest";
import { findings, readSitting, type Answered } from "./integrity";
import type { AnswerSignals } from "./signals";

const base: AnswerSignals = {
  questionId: "00000000-0000-4000-8000-000000000001",
  position: 0,
  order: ["A", "B", "C", "D"],
  activeMs: 60_000,
  awayMs: 0,
  idleMs: 0,
  aways: 0,
  firstActionMs: 40_000,
  answeredMs: 60_000,
  picks: [{ choice: "B", at: 58_000 }],
  crossed: [],
  calculatorOpens: 0,
  calculatorMs: 0,
  explanationMs: 0,
  visits: 1,
  pastes: 0,
  copies: 0,
  marked: false,
  input: "mouse",
};
const answered = (over: Partial<AnswerSignals>, right = true, words = 120): Answered => ({
  signals: { ...base, ...over },
  right,
  words,
});
const flags = (a: Answered) => findings(a).map((f) => f.flag);

describe("what a tutor may want to look at", () => {
  it("finds nothing in an ordinary answer", () => {
    expect(findings(answered({}))).toEqual([]);
  });

  it("notes a right answer given sooner than the question could be read", () => {
    expect(
      flags(answered({ answeredMs: 3000, activeMs: 3000, picks: [{ choice: "B", at: 2500 }] }))
    ).toEqual(["fast-right"]);
    // a wrong answer that fast is a guess, not a concern
    expect(flags(answered({ answeredMs: 3000, activeMs: 3000 }, false))).toEqual([]);
    // and a short question can honestly be answered fast
    expect(flags(answered({ answeredMs: 3000, activeMs: 3000 }, true, 12))).toEqual([]);
  });

  it("notes a long time away followed by a quick right answer", () => {
    const a = answered({
      awayMs: 90_000,
      aways: 1,
      activeMs: 14_000,
      answeredMs: 14_000,
      picks: [{ choice: "B", at: 12_000 }],
    });
    expect(flags(a)).toEqual(["away-then-right"]);
    // the same time away with real work on the question after it is not noted
    expect(
      flags(answered({ awayMs: 90_000, aways: 1, activeMs: 120_000, answeredMs: 120_000 }))
    ).toEqual([]);
  });

  it("notes pasting, copying and leaving again and again, with the facts", () => {
    const found = findings(answered({ pastes: 1, copies: 2, aways: 5 }));
    expect(found.map((f) => f.flag)).toEqual(["pasted", "many-aways", "copied"]);
    expect(found[0].detail).toBe("Pasted 1 time.");
    expect(found[1].detail).toBe("Left the page 5 times on this question.");
  });

  it("calls it a pattern only when it happens on several questions", () => {
    const fast = (n: number) =>
      answered({ questionId: base.questionId.slice(0, -1) + n, answeredMs: 2500, activeMs: 2500 });
    const fine = (n: number) => answered({ questionId: base.questionId.slice(0, -2) + "9" + n });
    expect(readSitting([fast(1), fine(1), fine(2), fine(3), fine(4)]).pattern).toBe(false);
    const many = readSitting([fast(1), fast(2), fast(3), fine(1), fine(2)]);
    expect(many.pattern).toBe(true);
    expect(many.flagged).toBe(3);
    expect(many.answered).toBe(5);
  });
});

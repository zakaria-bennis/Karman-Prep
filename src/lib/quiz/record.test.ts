import { describe, expect, it } from "vitest";
import {
  IDLE_AFTER_MS,
  begin,
  changeOf,
  changedMind,
  note,
  totals,
  type Happened,
  type Sitting,
} from "./record";

const device = { width: 390, height: 844, touch: true, utcOffset: 360 };
const T0 = 1_800_000_000_000;
const start = () => begin("run-1", { mode: "practice-set", skill: "Circles", device }, T0);
/** Plays a list of [seconds from the start, what happened]. */
const play = (steps: [number, Happened][], from: Sitting = start()) =>
  steps.reduce((s, [at, what]) => note(s, what, T0 + at * 1000), from);
const shown = (questionId: string): Happened => ({
  type: "shown",
  questionId,
  order: ["A", "B", "C", "D"],
  level: 4,
});
const pick = (choice: string): Happened => ({ type: "picked", choice, input: "touch" });

describe("a question's record", () => {
  it("keeps the time worked, the first thing done and the answer", () => {
    const s = play([
      [0, shown("q1")],
      [12, pick("B")],
      [20, { type: "answered", right: true }],
    ]);
    const q = s.record.questions[0];
    expect(q).toMatchObject({
      questionId: "q1",
      position: 0,
      level: 4,
      order: ["A", "B", "C", "D"],
      firstActionMs: 12_000,
      answer: "B",
      right: true,
      answeredMs: 20_000,
      activeMs: 20_000,
      visits: 1,
      input: "touch",
    });
  });

  it("keeps every change of mind, in order, and says which way it went", () => {
    const s = play([
      [0, shown("q1")],
      [5, pick("C")],
      [9, pick("C")],
      [14, pick("A")],
      [15, { type: "answered", right: false }],
    ]);
    const q = s.record.questions[0];
    expect(q.picks).toEqual([
      { choice: "C", at: 5000 },
      { choice: "A", at: 14_000 },
    ]);
    expect(changedMind(q)).toBe(true);
    expect(changeOf(q, "C")).toBe("to-wrong");
    expect(changeOf(q, "A")).toBe("to-right");
    expect(changeOf(q, "D")).toBe("wrong-wrong");
  });

  it("does not count time away from the page as time worked, and counts the leaving", () => {
    const s = play([
      [0, shown("q1")],
      [10, { type: "away" }],
      [70, { type: "back" }],
      [75, pick("D")],
      [80, { type: "answered", right: true }],
    ]);
    const q = s.record.questions[0];
    expect(q.aways).toBe(1);
    expect(q.awayMs).toBe(60_000);
    expect(q.activeMs).toBe(20_000);
    // the pick came 15 working seconds in, not 75
    expect(q.picks[0].at).toBe(15_000);
  });

  it("counts a long spell with nothing touched as idle, past the limit", () => {
    const s = play([
      [0, shown("q1")],
      [100, pick("A")],
    ]);
    const q = s.record.questions[0];
    expect(q.idleMs).toBe(100_000 - IDLE_AFTER_MS);
    expect(q.activeMs).toBe(IDLE_AFTER_MS);
  });

  it("times the calculator and the explanation", () => {
    const s = play([
      [0, shown("q1")],
      [4, { type: "calculator", open: true }],
      [24, { type: "calculator", open: false }],
      [26, { type: "calculator", open: true }],
      [30, pick("B")],
      [30, { type: "answered", right: false }],
      [30, { type: "calculator", open: false }],
      [30, { type: "explanation", open: true }],
      [48, { type: "touched" }],
      [50, shown("q2")],
    ]);
    const q = s.record.questions[0];
    expect(q.calculatorOpens).toBe(2);
    expect(q.calculatorMs).toBe(24_000);
    expect(q.explanationMs).toBe(20_000);
    // the question's own time stops when it is answered
    expect(q.activeMs).toBe(30_000);
    expect(s.record.questions[1].position).toBe(1);
  });

  it("adds up the visits to a question that is come back to", () => {
    const s = play([
      [0, shown("q1")],
      [10, shown("q2")],
      [25, shown("q1")],
      [31, pick("A")],
      [40, { type: "ended" }],
    ]);
    const [q1, q2] = s.record.questions;
    expect(q1.visits).toBe(2);
    expect(q1.activeMs).toBe(25_000);
    expect(q2.activeMs).toBe(15_000);
    expect(q1.position).toBe(0);
    expect(s.record.endedAt).toBe(T0 + 40_000);
  });

  it("counts crossing out, marking, pasting and copying", () => {
    const s = play([
      [0, shown("q1")],
      [3, { type: "crossed", choice: "D", on: true }],
      [4, { type: "crossed", choice: "D", on: false }],
      [5, { type: "marked", on: true }],
      [6, { type: "pasted" }],
      [7, { type: "copied" }],
      [7, { type: "copied" }],
    ]);
    const q = s.record.questions[0];
    expect(q.crossed).toHaveLength(2);
    expect(q.firstActionMs).toBe(3000);
    expect(q.marked).toBe(true);
    expect(q.pastes).toBe(1);
    expect(q.copies).toBe(2);
  });

  it("ignores a pick after the answer is in", () => {
    const s = play([
      [0, shown("q1")],
      [5, pick("A")],
      [6, { type: "answered", right: true }],
      [9, pick("B")],
    ]);
    expect(s.record.questions[0].picks).toHaveLength(1);
    expect(s.record.questions[0].answer).toBe("A");
  });

  it("sums a sitting", () => {
    const s = play([
      [0, shown("q1")],
      [5, pick("A")],
      [6, pick("B")],
      [8, { type: "answered", right: true }],
      [10, shown("q2")],
      [15, pick("C")],
      [16, { type: "answered", right: false }],
    ]);
    expect(totals(s.record)).toMatchObject({ asked: 2, answered: 2, right: 1, changed: 1 });
  });
});

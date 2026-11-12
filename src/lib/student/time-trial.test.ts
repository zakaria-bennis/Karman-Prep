import { describe, expect, it } from "vitest";
import {
  FIRST_STANDING,
  TRIAL_FLOOR,
  TRIAL_MODULE,
  accuracyHolds,
  formatClock,
  formatMultiplier,
  nextStanding,
  scoreRound,
  trialSeconds,
  type TrialStanding,
} from "./time-trial";

describe("TRIAL_MODULE", () => {
  it("is one real SAT module per section", () => {
    expect(TRIAL_MODULE.reading).toEqual({ questions: 27, seconds: 1920 });
    expect(TRIAL_MODULE.math).toEqual({ questions: 22, seconds: 2100 });
  });
});

describe("trialSeconds", () => {
  it("starts at 1.25 times the real module time", () => {
    expect(trialSeconds("reading", 1.25)).toBe(2400);
    expect(trialSeconds("math", 1.25)).toBe(2625);
  });
  it("ends at 0.75 times", () => {
    expect(trialSeconds("reading", 0.75)).toBe(1440);
    expect(trialSeconds("math", 0.75)).toBe(1575);
  });
  it("keeps the real per-question pace for a shorter round", () => {
    expect(trialSeconds("math", 1, 11)).toBe(1050);
  });
});

describe("accuracyHolds", () => {
  it("needs 70% in the first round", () => {
    expect(accuracyHolds(0.7, null)).toBe(true);
    expect(accuracyHolds(0.69, null)).toBe(false);
  });
  it("needs the accuracy of the round that earned this pace", () => {
    expect(accuracyHolds(0.8, 0.8)).toBe(true);
    expect(accuracyHolds(0.78, 0.8)).toBe(false);
    expect(accuracyHolds(0.6, 0.5)).toBe(false);
  });
});

function round(standing: TrialStanding, correct: number, answered = 27, elapsed = 1800) {
  return scoreRound({
    section: "reading",
    standing,
    limitSeconds: 2400,
    elapsedSeconds: elapsed,
    correct,
    answered,
    questions: 27,
  });
}

describe("scoreRound", () => {
  it("tightens by 0.05 when accuracy holds", () => {
    const r = round(FIRST_STANDING, 21);
    expect(r).toMatchObject({ round: 1, multiplier: 1.25, held: true, nextMultiplier: 1.2 });
    expect(r.nextReferenceAccuracy).toBeCloseTo(21 / 27);
  });
  it("keeps the pace and the reference when accuracy slips", () => {
    const start = { round: 3, multiplier: 1.15, referenceAccuracy: 0.8 };
    const r = round(start, 20);
    expect(r).toMatchObject({ held: false, nextMultiplier: 1.15, nextReferenceAccuracy: 0.8 });
  });
  it("never goes below 0.75", () => {
    const r = round({ round: 11, multiplier: TRIAL_FLOOR, referenceAccuracy: 0.7 }, 25);
    expect(r).toMatchObject({ held: true, nextMultiplier: 0.75 });
  });
  it("scores what was answered at time-up; unanswered count as missed", () => {
    const r = round(FIRST_STANDING, 15, 17, 2600);
    expect(r).toMatchObject({ answered: 17, elapsedSeconds: 2400, timeUp: true, held: false });
    expect(r.accuracy).toBeCloseTo(15 / 27);
  });
  it("is not time-up when every question was answered", () => {
    expect(round(FIRST_STANDING, 20, 27, 2400).timeUp).toBe(false);
  });
  it("clamps impossible counts", () => {
    const r = round(FIRST_STANDING, 40, 3);
    expect(r).toMatchObject({ correct: 27, answered: 27 });
  });
});

describe("nextStanding", () => {
  it("starts at round one, 1.25", () => {
    expect(nextStanding(null)).toEqual({ round: 1, multiplier: 1.25, referenceAccuracy: null });
  });
  it("walks from 1.25 to 0.75 in ten held rounds, without float drift", () => {
    let standing = nextStanding(null);
    const seen = [standing.multiplier];
    for (let i = 0; i < 12; i++) {
      standing = nextStanding(round(standing, 27));
      seen.push(standing.multiplier);
    }
    expect(seen.slice(0, 11)).toEqual([1.25, 1.2, 1.15, 1.1, 1.05, 1, 0.95, 0.9, 0.85, 0.8, 0.75]);
    expect(seen.slice(11)).toEqual([0.75, 0.75]);
    expect(standing.round).toBe(13);
  });
});

describe("formatting", () => {
  it("formats the multiplier and the clock", () => {
    expect(formatMultiplier(1.2)).toBe("1.20×");
    expect(formatClock(2465)).toBe("41:05");
  });
});

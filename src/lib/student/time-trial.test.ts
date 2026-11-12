import { describe, expect, it } from "vitest";
import {
  ACCURACY_TOLERANCE,
  BASELINE_DEFAULT,
  BASELINE_WINDOW_ANSWERS,
  DEFAULT_BASELINE,
  FIRST_STANDING,
  TRIAL_FLOOR,
  TRIAL_MODULE,
  accuracyBar,
  accuracyHolds,
  barLine,
  baselineAccuracy,
  formatClock,
  formatMultiplier,
  nextStanding,
  scoreRound,
  trialSeconds,
  type TrialBaseline,
  type TrialStart,
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

const day = 86_400_000;
const NOW = Date.parse("2026-11-12T12:00:00Z");
const history = (section: "reading" | "math", right: number, total: number, daysAgo = 1) =>
  Array.from({ length: total }, (_, i) => ({
    section,
    correct: i < right,
    at: NOW - daysAgo * day - i * 60_000,
  }));

describe("baselineAccuracy", () => {
  it("is 80% with fewer than 30 answers in the section", () => {
    const b = baselineAccuracy("math", history("math", 29, 29), NOW);
    expect(b).toEqual({ accuracy: BASELINE_DEFAULT, basis: "default", sample: 29 });
  });
  it("is the student's own accuracy with enough history, so a low scorer gets a low bar", () => {
    const b = baselineAccuracy("math", history("math", 18, 40), NOW);
    expect(b).toMatchObject({ basis: "history", sample: 40 });
    expect(b.accuracy).toBeCloseTo(0.45);
    expect(accuracyBar(b)).toBe(0.4);
  });
  it("counts only the section asked for", () => {
    const answers = [...history("reading", 40, 40), ...history("math", 10, 20)];
    expect(baselineAccuracy("math", answers, NOW).basis).toBe("default");
    expect(baselineAccuracy("reading", answers, NOW).accuracy).toBe(1);
  });
  it("reads the newest 100 answers from the last 90 days", () => {
    const old = history("reading", 0, 50, 120);
    const newer = history("reading", 60, 120, 1);
    const b = baselineAccuracy("reading", [...old, ...newer], NOW);
    expect(b.sample).toBe(BASELINE_WINDOW_ANSWERS);
    expect(b.accuracy).toBe(0.6);
    expect(baselineAccuracy("reading", old, NOW).basis).toBe("default");
  });
});

const fromHistory = (accuracy: number): TrialBaseline => ({
  accuracy,
  basis: "history",
  sample: 100,
});

describe("accuracyHolds", () => {
  it("holds at the baseline minus the 5-point tolerance, and not a point under", () => {
    expect(ACCURACY_TOLERANCE).toBe(0.05);
    expect(accuracyHolds(0.63, fromHistory(0.68))).toBe(true);
    expect(accuracyHolds(0.62, fromHistory(0.68))).toBe(false);
  });
  it("needs 75% with the 80% default", () => {
    expect(accuracyHolds(0.75, DEFAULT_BASELINE)).toBe(true);
    expect(accuracyHolds(0.74, DEFAULT_BASELINE)).toBe(false);
  });
});

describe("barLine", () => {
  it("names the bar in plain words", () => {
    expect(barLine(fromHistory(0.73))).toBe(
      "Keep at least 68% right. Your untimed accuracy is 73%."
    );
    expect(barLine(DEFAULT_BASELINE)).toMatch(/^Keep at least 75% right\. That's our starting bar/);
  });
});

function round(start: TrialStart, correct: number, answered = 27, elapsed = 1800) {
  return scoreRound({
    section: "reading",
    start,
    limitSeconds: 2400,
    elapsedSeconds: elapsed,
    correct,
    answered,
    questions: 27,
  });
}

const first: TrialStart = { ...FIRST_STANDING, baseline: fromHistory(0.6) };

describe("scoreRound", () => {
  it("tightens by 0.05 when accuracy holds", () => {
    const r = round(first, 15); // 56%, bar 55%
    expect(r).toMatchObject({
      round: 1,
      multiplier: 1.25,
      held: true,
      nextMultiplier: 1.2,
      bar: 0.55,
    });
  });
  it("keeps the pace when accuracy slips under the bar", () => {
    const r = round({ round: 3, multiplier: 1.15, baseline: fromHistory(0.6) }, 14); // 52%
    expect(r).toMatchObject({ held: false, nextMultiplier: 1.15 });
  });
  it("never goes below 0.75", () => {
    const r = round({ round: 11, multiplier: TRIAL_FLOOR, baseline: fromHistory(0.6) }, 25);
    expect(r).toMatchObject({ held: true, nextMultiplier: 0.75 });
  });
  it("scores what was answered at time-up; unanswered count as missed", () => {
    const r = round(first, 13, 17, 2600);
    expect(r).toMatchObject({ answered: 17, elapsedSeconds: 2400, timeUp: true, held: false });
    expect(r.accuracy).toBeCloseTo(13 / 27);
  });
  it("is not time-up when every question was answered", () => {
    expect(round(first, 20, 27, 2400).timeUp).toBe(false);
  });
  it("clamps impossible counts", () => {
    const r = round(first, 40, 3);
    expect(r).toMatchObject({ correct: 27, answered: 27 });
  });
});

describe("nextStanding", () => {
  it("starts at round one, 1.25", () => {
    expect(nextStanding(null)).toEqual({ round: 1, multiplier: 1.25 });
  });
  it("walks from 1.25 to 0.75 in ten held rounds, without float drift", () => {
    let standing = nextStanding(null);
    const seen = [standing.multiplier];
    for (let i = 0; i < 12; i++) {
      standing = nextStanding(round({ ...standing, baseline: DEFAULT_BASELINE }, 27));
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

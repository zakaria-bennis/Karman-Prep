/*
 * Time trials: one section against the clock (founder, site-copy section 6 and the 2026-11-09
 * handover). "It starts at 1.25 times the real SAT time and tightens by 5% a round, down to
 * 0.75, as long as accuracy holds." Pure, so the server, the result screen and the tests share
 * one rule.
 */
import { SECTION_SHAPE, type Section } from "@/lib/assembler/forms";

export type TrialSection = Section;

/** The real SAT module each round is timed against: one module's questions and minutes, from the
 *  full-length assembler (Digital SAT: Reading and Writing 27 in 32 minutes, Math 22 in 35). */
export const TRIAL_MODULE: Record<TrialSection, { questions: number; seconds: number }> = {
  reading: {
    questions: SECTION_SHAPE.reading.perModule,
    seconds: SECTION_SHAPE.reading.minutes * 60,
  },
  math: { questions: SECTION_SHAPE.math.perModule, seconds: SECTION_SHAPE.math.minutes * 60 },
};

export const TRIAL_START = 1.25;
export const TRIAL_STEP = 0.05;
export const TRIAL_FLOOR = 0.75;
/**
 * PLACEHOLDER (founder to confirm): what "accuracy holds" means. A round holds when its accuracy
 * is at least 70% and at least the accuracy of the round that earned this pace (the student's
 * previous round at the slower pace). The first round only needs 70%.
 */
export const ACCURACY_FLOOR = 0.7;

/** Two decimals, so repeated 0.05 steps never drift (1.2000000000000002). */
const two = (n: number) => Math.round(n * 100) / 100;

export const trialSectionTitle = (section: TrialSection) => SECTION_SHAPE[section].title;

/** "1.20×" for the screen. */
export const formatMultiplier = (multiplier: number) => `${two(multiplier).toFixed(2)}×`;

/** Seconds on the clock: the real per-question pace, times the round's multiplier. */
export function trialSeconds(
  section: TrialSection,
  multiplier: number,
  questions = TRIAL_MODULE[section].questions
): number {
  const perQuestion = TRIAL_MODULE[section].seconds / TRIAL_MODULE[section].questions;
  return Math.round(perQuestion * questions * multiplier);
}

/** Where the student stands in one section before a round. */
export type TrialStanding = {
  round: number;
  multiplier: number;
  /** Accuracy to match at this pace: the round that earned it. Null before any round holds. */
  referenceAccuracy: number | null;
};

export const FIRST_STANDING: TrialStanding = {
  round: 1,
  multiplier: TRIAL_START,
  referenceAccuracy: null,
};

export function accuracyHolds(accuracy: number, referenceAccuracy: number | null): boolean {
  if (accuracy < ACCURACY_FLOOR) return false;
  return referenceAccuracy === null || accuracy >= referenceAccuracy;
}

/** One finished round, as stored with the run's result. */
export type TrialRoundResult = {
  section: TrialSection;
  round: number;
  multiplier: number;
  referenceAccuracy: number | null;
  limitSeconds: number;
  elapsedSeconds: number;
  correct: number;
  answered: number;
  questions: number;
  accuracy: number;
  held: boolean;
  /** The clock ran out before every question had an answer. */
  timeUp: boolean;
  nextMultiplier: number;
  nextReferenceAccuracy: number | null;
};

/** Scores a round. Unanswered questions count as missed, so a round cut short by time-up
 *  scores what was answered. */
export function scoreRound(input: {
  section: TrialSection;
  standing: TrialStanding;
  limitSeconds: number;
  elapsedSeconds: number;
  correct: number;
  answered: number;
  questions: number;
}): TrialRoundResult {
  const { standing } = input;
  const questions = Math.max(0, Math.round(input.questions));
  const correct = Math.min(questions, Math.max(0, Math.round(input.correct)));
  const answered = Math.min(questions, Math.max(correct, Math.round(input.answered)));
  const accuracy = questions ? correct / questions : 0;
  const held = questions > 0 && accuracyHolds(accuracy, standing.referenceAccuracy);
  const elapsed = Math.min(input.limitSeconds, Math.max(0, Math.round(input.elapsedSeconds)));
  return {
    section: input.section,
    round: standing.round,
    multiplier: two(standing.multiplier),
    referenceAccuracy: standing.referenceAccuracy,
    limitSeconds: input.limitSeconds,
    elapsedSeconds: elapsed,
    correct,
    answered,
    questions,
    accuracy,
    held,
    timeUp: answered < questions && elapsed >= input.limitSeconds,
    nextMultiplier: held
      ? Math.max(TRIAL_FLOOR, two(standing.multiplier - TRIAL_STEP))
      : two(standing.multiplier),
    nextReferenceAccuracy: held ? accuracy : standing.referenceAccuracy,
  };
}

/** The standing for the next round, from the latest finished round in the section. */
export function nextStanding(latest: TrialRoundResult | null): TrialStanding {
  if (!latest) return FIRST_STANDING;
  return {
    round: latest.round + 1,
    multiplier: Math.min(TRIAL_START, Math.max(TRIAL_FLOOR, two(latest.nextMultiplier))),
    referenceAccuracy: latest.nextReferenceAccuracy,
  };
}

/** "6:05" from seconds. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

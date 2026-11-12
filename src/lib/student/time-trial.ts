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

/*
 * "Accuracy holds" (founder, 2026-11-12): faster must not cost accuracy, judged against the
 * student's own accuracy, not a fixed bar ("you're not gonna have 80% accuracy if you're scoring
 * 1100"). The baseline is the student's accuracy in that section when untimed (catalog practice,
 * Daily 10, practice sets, Domain quizzes) and on the diagnostic and full-length tests. With thin
 * history it is 80%. A round holds at the baseline minus a small tolerance. A miss keeps the pace.
 */
/** Baseline with too little history (founder: "by default ... 80%"). */
export const BASELINE_DEFAULT = 0.8;
/** FOUNDER DECISION: fewer answers than this in the section and the default applies. */
export const BASELINE_MIN_ANSWERS = 30;
/** FOUNDER DECISION: the baseline reads the newest this-many answers... */
export const BASELINE_WINDOW_ANSWERS = 100;
/** ...from the last this-many days. */
export const BASELINE_WINDOW_DAYS = 90;
/** FOUNDER DECISION: a round holds at the baseline minus this many points. */
export const ACCURACY_TOLERANCE = 0.05;

/** Two decimals, so repeated 0.05 steps never drift (1.2000000000000002). */
const two = (n: number) => Math.round(n * 100) / 100;

export const trialSectionTitle = (section: TrialSection) => SECTION_SHAPE[section].title;

/** "1.20×" for the screen. */
export const formatMultiplier = (multiplier: number) => `${two(multiplier).toFixed(2)}×`;

/** "68%" for the screen. */
export const formatPercent = (share: number) => `${Math.round(share * 100)}%`;

/** Seconds on the clock: the real per-question pace, times the round's multiplier. */
export function trialSeconds(
  section: TrialSection,
  multiplier: number,
  questions = TRIAL_MODULE[section].questions
): number {
  const perQuestion = TRIAL_MODULE[section].seconds / TRIAL_MODULE[section].questions;
  return Math.round(perQuestion * questions * multiplier);
}

/** The student's own accuracy in a section, the yardstick for every round. */
export type TrialBaseline = {
  accuracy: number;
  /** "history" from the student's answers, "default" (80%) with too few. */
  basis: "history" | "default";
  /** Answers it was read from. */
  sample: number;
};

export type BaselineAnswer = { section: TrialSection; correct: boolean; at: string | number };

/** The newest BASELINE_WINDOW_ANSWERS answers in the section from the last BASELINE_WINDOW_DAYS. */
export function baselineAccuracy(
  section: TrialSection,
  answers: readonly BaselineAnswer[],
  nowMs = Date.now()
): TrialBaseline {
  const since = nowMs - BASELINE_WINDOW_DAYS * 86_400_000;
  const time = (at: string | number) => (typeof at === "number" ? at : Date.parse(at));
  const recent = answers
    .filter((a) => a.section === section && time(a.at) >= since && time(a.at) <= nowMs)
    .sort((a, b) => time(b.at) - time(a.at))
    .slice(0, BASELINE_WINDOW_ANSWERS);
  if (recent.length < BASELINE_MIN_ANSWERS)
    return { accuracy: BASELINE_DEFAULT, basis: "default", sample: recent.length };
  const right = recent.filter((a) => a.correct).length;
  return { accuracy: right / recent.length, basis: "history", sample: recent.length };
}

/** The accuracy a round needs to hold: the baseline minus the tolerance. */
export const accuracyBar = (baseline: TrialBaseline) =>
  two(Math.max(0, baseline.accuracy - ACCURACY_TOLERANCE));

/** One plain line naming the bar, for the intro and the result. */
export function barLine(baseline: TrialBaseline): string {
  const bar = formatPercent(accuracyBar(baseline));
  return baseline.basis === "history"
    ? `Keep at least ${bar} right. Your untimed accuracy is ${formatPercent(baseline.accuracy)}.`
    : `Keep at least ${bar} right. That's our starting bar until you have ${BASELINE_MIN_ANSWERS} untimed answers in this section.`;
}

export const accuracyHolds = (accuracy: number, baseline: TrialBaseline) =>
  accuracy >= accuracyBar(baseline);

/** Where the student stands in one section before a round. */
export type TrialStanding = { round: number; multiplier: number };

export const FIRST_STANDING: TrialStanding = { round: 1, multiplier: TRIAL_START };

/** What a round was started with: its pace and the baseline frozen for it. */
export type TrialStart = TrialStanding & { baseline: TrialBaseline };

export const DEFAULT_BASELINE: TrialBaseline = {
  accuracy: BASELINE_DEFAULT,
  basis: "default",
  sample: 0,
};

/** One finished round, as stored with the run's result. */
export type TrialRoundResult = {
  section: TrialSection;
  round: number;
  multiplier: number;
  baseline: TrialBaseline;
  /** The accuracy this round needed. */
  bar: number;
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
};

/** Scores a round. Unanswered questions count as missed, so a round cut short by time-up
 *  scores what was answered. Held: 0.05 faster (never below 0.75). Missed: the same pace. */
export function scoreRound(input: {
  section: TrialSection;
  start: TrialStart;
  limitSeconds: number;
  elapsedSeconds: number;
  correct: number;
  answered: number;
  questions: number;
}): TrialRoundResult {
  const { start } = input;
  const questions = Math.max(0, Math.round(input.questions));
  const correct = Math.min(questions, Math.max(0, Math.round(input.correct)));
  const answered = Math.min(questions, Math.max(correct, Math.round(input.answered)));
  const accuracy = questions ? correct / questions : 0;
  const held = questions > 0 && accuracyHolds(accuracy, start.baseline);
  const elapsed = Math.min(input.limitSeconds, Math.max(0, Math.round(input.elapsedSeconds)));
  return {
    section: input.section,
    round: start.round,
    multiplier: two(start.multiplier),
    baseline: start.baseline,
    bar: accuracyBar(start.baseline),
    limitSeconds: input.limitSeconds,
    elapsedSeconds: elapsed,
    correct,
    answered,
    questions,
    accuracy,
    held,
    timeUp: answered < questions && elapsed >= input.limitSeconds,
    nextMultiplier: held
      ? Math.max(TRIAL_FLOOR, two(start.multiplier - TRIAL_STEP))
      : two(start.multiplier),
  };
}

/** The standing for the next round, from the latest finished round in the section. */
export function nextStanding(
  latest: Pick<TrialRoundResult, "round" | "nextMultiplier"> | null
): TrialStanding {
  if (!latest) return FIRST_STANDING;
  return {
    round: latest.round + 1,
    multiplier: Math.min(TRIAL_START, Math.max(TRIAL_FLOOR, two(latest.nextMultiplier))),
  };
}

/** "6:05" from seconds. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

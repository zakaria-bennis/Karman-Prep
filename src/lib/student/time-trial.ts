import { limitSeconds, type TimingAccommodation } from "@/lib/quiz/timer";

/** Spec: Time Trial. Pure, so the server, the demo and the tests share one rule. */
export type TrialSection = "reading" | "math";

/** College Board module length and time at standard timing. */
export const CB_MODULE: Record<TrialSection, { questions: number; seconds: number }> = {
  reading: { questions: 27, seconds: 32 * 60 },
  math: { questions: 22, seconds: 35 * 60 },
};

export const SQUEEZE = 0.2;
export const SNAP_SECONDS = 15;
export const MIN_HISTORY = 10;
export const HISTORY_WINDOW = 120;
/** A beat needs accuracy no worse than this below the student's untimed accuracy. */
export const ACCURACY_SLACK = 0.15;

export function goalSeconds(section: TrialSection, accommodation: TimingAccommodation): number {
  return limitSeconds(CB_MODULE[section].seconds, accommodation);
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Mean of the times left after an extreme-outlier fence (3 x IQR) on log seconds. */
export function robustMeanSeconds(times: readonly number[]): {
  mean: number | null;
  kept: number;
  dropped: number;
} {
  const valid = times.filter((t) => Number.isFinite(t) && t > 0);
  if (valid.length === 0) return { mean: null, kept: 0, dropped: times.length };
  const logs = valid.map(Math.log).sort((a, b) => a - b);
  const q1 = quantile(logs, 0.25);
  const q3 = quantile(logs, 0.75);
  const iqr = q3 - q1;
  const lo = q1 - 3 * iqr;
  const hi = q3 + 3 * iqr;
  const kept = valid.filter((t) => Math.log(t) >= lo && Math.log(t) <= hi);
  const mean = kept.reduce((n, t) => n + t, 0) / kept.length;
  return { mean, kept: kept.length, dropped: times.length - kept.length };
}

const round5 = (s: number) => Math.round(s / 5) * 5;

export type StartingTarget = {
  seconds: number;
  goal: number;
  /** "history" when it came from the student's own times, "starting_pace" otherwise. */
  basis: "history" | "starting_pace";
  sample: number;
};

/** Untimed answer times are newest first; only the last HISTORY_WINDOW count. */
export function startingTarget(
  section: TrialSection,
  untimedSeconds: readonly number[],
  accommodation: TimingAccommodation
): StartingTarget {
  const goal = goalSeconds(section, accommodation);
  const recent = untimedSeconds.slice(0, HISTORY_WINDOW);
  const { mean, kept } = robustMeanSeconds(recent);
  if (mean === null || kept < MIN_HISTORY) {
    return { seconds: round5(goal * 1.5), goal, basis: "starting_pace", sample: kept };
  }
  const raw = mean * CB_MODULE[section].questions;
  const seconds = Math.min(goal * 3, Math.max(goal, round5(raw)));
  return { seconds, goal, basis: "history", sample: kept };
}

export type TrialOutcome = {
  target: number;
  goal: number;
  elapsedSeconds: number;
  finished: boolean;
  correct: number;
  questions: number;
  /** The student's untimed accuracy in this section, 0 to 1, or null with no history. */
  baselineAccuracy: number | null;
};

export type TrialVerdict = {
  beat: boolean;
  reason: "beat" | "over_time" | "unfinished" | "rushed";
  nextTarget: number;
};

export function nextTarget(o: TrialOutcome): TrialVerdict {
  const accuracy = o.questions > 0 ? o.correct / o.questions : 0;
  const floor = o.baselineAccuracy === null ? 0 : o.baselineAccuracy - ACCURACY_SLACK;
  const reason: TrialVerdict["reason"] = !o.finished
    ? "unfinished"
    : o.elapsedSeconds > o.target
      ? "over_time"
      : accuracy < floor
        ? "rushed"
        : "beat";
  if (reason !== "beat") return { beat: false, reason, nextTarget: Math.max(o.goal, o.target) };
  const moved = o.target - SQUEEZE * (o.target - o.goal);
  const next = moved - o.goal < SNAP_SECONDS ? o.goal : Math.round(moved);
  return { beat: true, reason, nextTarget: Math.max(o.goal, next) };
}

/** Where the student should be: questions done by now at this target's even pace. */
export function expectedDone(elapsedSeconds: number, target: number, questions: number): number {
  if (target <= 0) return questions;
  return Math.min(questions, (elapsedSeconds / target) * questions);
}

/** Positive is ahead of pace, in whole questions. */
export function paceDelta(
  done: number,
  elapsedSeconds: number,
  target: number,
  questions: number
): number {
  return Math.round(done - expectedDone(elapsedSeconds, target, questions));
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(Math.abs(totalSeconds)));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export type TrialRun = {
  id: string;
  section: TrialSection;
  target: number;
  elapsedSeconds: number;
  correct: number;
  questions: number;
  beat: boolean;
  nextTarget: number;
  finishedAt: string;
};

/** The target the next trial in this section uses: the latest run's result, or the start. */
export function currentTarget(
  section: TrialSection,
  runs: readonly TrialRun[],
  start: StartingTarget
): number {
  const latest = runs
    .filter((r) => r.section === section)
    .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))[0];
  return latest ? Math.max(start.goal, latest.nextTarget) : start.seconds;
}

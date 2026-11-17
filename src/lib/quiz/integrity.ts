// Things in how a question was answered that a tutor may want to look at (founder, 2026-11-17:
// "know with as much information as possible if the student is cheating").
//
// Every one of these has innocent explanations: a fast right answer can be a question seen
// before, time away can be a parent at the door, a paste can be a number carried over from the
// calculator. So nothing here says a student cheated, nothing here changes a grade or a level,
// and nothing here is ever shown to the student. It is a list of what happened, with the facts
// behind each line, for a person to judge. A pattern across many questions means far more than
// any single line.
import type { AnswerSignals } from "./signals";

export type Flag =
  | "fast-right" // answered right sooner than the question could be read
  | "away-then-right" // left the page for a while, then answered right soon after coming back
  | "pasted" // something was pasted into the answer
  | "many-aways" // left the page again and again on one question
  | "copied"; // copied from the question (it may have been taken elsewhere)

export interface Finding {
  flag: Flag;
  questionId: string;
  /** The facts, in plain words, for the tutor. */
  detail: string;
}

export interface Answered {
  signals: AnswerSignals;
  right: boolean;
  /** How many words the question and its passage have: a rough measure of reading time. */
  words: number;
}

/** A quick reader takes in about five words a second; nobody takes in twelve. */
const WORDS_A_SECOND = 12;
const AWAY_LONG_MS = 20_000;
const SOON_AFTER_MS = 8000;
const seconds = (ms: number) => `${Math.round(ms / 100) / 10}s`;

export function findings({ signals: s, right, words }: Answered): Finding[] {
  const out: Finding[] = [];
  const add = (flag: Flag, detail: string) => out.push({ flag, questionId: s.questionId, detail });
  const tooFast = Math.max(2000, (words / WORDS_A_SECOND) * 1000);
  if (right && s.answeredMs !== null && s.answeredMs < tooFast)
    add(
      "fast-right",
      `Right in ${seconds(s.answeredMs)}; ${words} words would take at least ${seconds(tooFast)} to read.`
    );
  if (right && s.awayMs >= AWAY_LONG_MS && s.answeredMs !== null) {
    const last = s.picks.at(-1);
    // the answer was chosen with little working time left after the time away
    if (last && s.answeredMs - last.at <= SOON_AFTER_MS && s.activeMs < s.awayMs)
      add(
        "away-then-right",
        `Away from the page for ${seconds(s.awayMs)}, worked on it for ${seconds(s.activeMs)}, then right.`
      );
  }
  if (s.pastes > 0) add("pasted", `Pasted ${s.pastes} time${s.pastes === 1 ? "" : "s"}.`);
  if (s.aways >= 4) add("many-aways", `Left the page ${s.aways} times on this question.`);
  if (s.copies > 0) add("copied", `Copied ${s.copies} time${s.copies === 1 ? "" : "s"}.`);
  return out;
}

export interface SittingReading {
  findings: Finding[];
  /** Questions with at least one finding, out of those answered. */
  flagged: number;
  answered: number;
  /** Worth a tutor's look: a pattern, not one odd question. */
  pattern: boolean;
}

/** A whole sitting read at once. One finding is noise; the same thing on several questions, or
 *  on a good share of them, is a pattern. */
export function readSitting(answers: Answered[]): SittingReading {
  const all = answers.flatMap(findings);
  const flagged = new Set(all.map((f) => f.questionId)).size;
  const serious = all.filter((f) => f.flag === "fast-right" || f.flag === "away-then-right");
  const seriousQuestions = new Set(serious.map((f) => f.questionId)).size;
  return {
    findings: all,
    flagged,
    answered: answers.length,
    pattern: seriousQuestions >= 3 && seriousQuestions >= answers.length * 0.3,
  };
}

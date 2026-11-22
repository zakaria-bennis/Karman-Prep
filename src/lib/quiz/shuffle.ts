// Answer shuffling (founder, 2026-11-17: "Shuffle answers ... now", one of the measures against
// sharing answers). A multiple-choice question shows its choices in an order fixed by a hash of a
// seed and the question's id, so the same student sees the same order every time, and so do the
// Mistake Log and a tutor looking at the student's work. Letters go by place, A to D from the
// top, as on the real test.
//
// The quiz screen draws a question re-lettered by `shuffleQuestion` and its review re-lettered by
// `reviewForDisplay`. What it keeps and what it hands back (the answer picked, what was crossed
// out) uses the question's own letters, through the `LetterMap`. Typed answers never move.
// Pure: no React, no browser.
import type { AnswerLetter, StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";

/** Whether a map has a letter of its own (not one it inherits). */
const has = (map: Readonly<Record<string, string>>, key: string) =>
  Object.prototype.hasOwnProperty.call(map, key);

/** FNV-1a: a small 32-bit hash of a string, the same on every device. */
export function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: a run of numbers in [0, 1) that a 32-bit seed fixes. */
function numbers(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The order a question's choices are shown in: its own letters, top to bottom. The same seed
 *  and question always give the same order; every order is as likely as any other. */
export function choiceOrder(
  seed: string,
  questionId: string,
  letters: readonly string[]
): string[] {
  const order = [...letters].sort();
  const next = numbers(hash32(`${seed}:${questionId}`));
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** How one question's letters were moved. */
export type LetterMap = {
  /** The question's own letters in the order they were shown: what a tutor needs to rebuild the
   *  screen the student saw. */
  order: readonly string[];
  /** Its own letter to the letter shown. */
  display: Readonly<Record<string, string>>;
  /** The letter shown to its own letter. */
  original: Readonly<Record<string, string>>;
};

/** The map for an order: the letters shown are the question's own letters again, by place. */
export function letterMap(order: readonly string[]): LetterMap {
  const places = [...order].sort();
  const display: Record<string, string> = {};
  const original: Record<string, string> = {};
  order.forEach((own, i) => {
    display[own] = places[i];
    original[places[i]] = own;
  });
  return { order: [...order], display, original };
}

/** A letter as it is shown. Anything that is not one of the question's letters (a typed answer,
 *  an empty answer) is left as it is. */
export function toDisplay(map: LetterMap | null, letter: string): string;
export function toDisplay(map: LetterMap | null, letter: string | null): string | null;
export function toDisplay(map: LetterMap | null, letter: string | null): string | null {
  if (!map || letter === null) return letter;
  return has(map.display, letter) ? map.display[letter] : letter;
}

/** A letter as the question itself has it. */
export function toOriginal(map: LetterMap | null, letter: string): string;
export function toOriginal(map: LetterMap | null, letter: string | null): string | null;
export function toOriginal(map: LetterMap | null, letter: string | null): string | null {
  if (!map || letter === null) return letter;
  return has(map.original, letter) ? map.original[letter] : letter;
}

/** A choice that points at other choices by place ("All of the above", "Both A and B") would
 *  stop making sense in another order, so its question keeps its own order. */
const POINTS_AT_A_PLACE =
  /\b(?:(?:all|none|both|neither) of (?:the )?(?:above|below|choices|options|these)|(?:choices?|options?)\s+\(?[A-D]\)?(?![A-Za-z0-9])|(?:both|either|neither)\s+\(?[A-D]\)?\s+(?:and|or|nor)\s+\(?[A-D]\)?(?![A-Za-z0-9]))/i;

/** A multiple-choice question re-lettered for the screen, with the map back to its own letters.
 *  A typed answer, an empty seed, or choices that cannot move come back as they were, with no
 *  map. */
export function shuffleQuestion(
  q: StudentQuizQuestion,
  seed: string | undefined
): { question: StudentQuizQuestion; map: LetterMap | null } {
  if (!seed || q.answer_format !== "multiple_choice") return { question: q, map: null };
  const letters = q.answer_choices.map((c) => c.letter);
  if (letters.length < 2 || new Set(letters).size !== letters.length)
    return { question: q, map: null };
  if (q.answer_choices.some((c) => POINTS_AT_A_PLACE.test(c.choice_text ?? "")))
    return { question: q, map: null };
  const map = letterMap(choiceOrder(seed, q.id, letters));
  const byLetter = new Map(q.answer_choices.map((c) => [c.letter as string, c]));
  const answer_choices = map.order.map((own) => ({
    ...byLetter.get(own)!,
    letter: map.display[own] as AnswerLetter,
  }));
  return { question: { ...q, answer_choices }, map };
}

// ---- naming a choice by its letter, in an explanation ----

/** One letter in a list: "B" or "(B)", standing alone. */
const LETTER = String.raw`\(?[A-D]\)?(?![A-Za-z0-9])`;
/** Between letters in a list: "A and B", "A, B, and C", "A or B", "A/B". */
const JOIN = String.raw`(?:\s*,\s*(?:(?:and|or)\s+)?|\s+(?:and|or)\s+|\s*[/&]\s*)`;
const LIST = String.raw`${LETTER}(?:${JOIN}${LETTER})*`;
/** The words that put a letter after them: "Choice B", "choices A and C", "Option (D)", "the
 *  answer is B", "answer choice C", "Choice: B". */
const NAMED = String.raw`\b(?:[Aa]nswers?(?:\s+[Cc]hoices?)?(?:\s+(?:is|was))?|[Cc]hoices?|[Oo]ptions?)(?:\s*:\s*|\s+)`;
/** What a sentence says of a bare letter that is a choice: "B is incorrect", "C and D are wrong",
 *  "A is the best answer", "So D must be true". (A sentence that starts "A is" is never the word
 *  "a".) */
const VERDICT = String.raw`\s+(?:(?:is|are|was|were)\s+(?:not\s+|also\s+|both\s+|all\s+)?(?:(?:in)?correct\b|wrong\b|true\b|false\b|right\b|the\s+(?:best|correct|right)\s+(?:answer|choice)\b)|(?:must|should|cannot|can't|could)\s+(?:not\s+)?be\s+(?:true|false|correct|right|wrong)\b)`;

// Written without look-behind, which older iPhones cannot read: the character before is kept in
// a group and put back. Groups: 1 named words, 2 their list; 3 before, 4 a lone "(B)"; 5 line
// start, 6 its indent, 7 a letter that starts a line ("B." or "B)"), 8 its mark; 9 before,
// 10 a bare list said to be right or wrong.
const MENTION = new RegExp(
  [
    String.raw`(${NAMED})(${LIST})`,
    String.raw`(^|[^A-Za-z0-9_)\]}])\(([A-D])\)`,
    String.raw`(^|\n)([ \t]*)([A-D])([.):])(?=[ \t])`,
    String.raw`(^|[^A-Za-z0-9_'’(])((?:[A-D])(?:${JOIN}[A-D])*)(?![A-Za-z0-9])(?=${VERDICT})`,
  ].join("|"),
  "g"
);

/** Every place an explanation names a choice by its letter ("Choice B", "choices A and C",
 *  "Option (D)", "the answer is B", "(B)", a line that starts "B.", "B is incorrect"), with the
 *  letter changed to the one shown. All letters change at once, so A to B and B to A never run
 *  into each other. A bare capital in a sentence ("A student...") and a letter inside a function,
 *  such as P(A), are left alone. */
export function remapLetterMentions(text: string, display: Readonly<Record<string, string>>) {
  if (!text) return text;
  const swap = (s: string) => s.replace(/[A-D]/g, (l) => (has(display, l) ? display[l] : l));
  return text.replace(
    MENTION,
    (
      all: string,
      named?: string,
      list?: string,
      before?: string,
      lone?: string,
      lineStart?: string,
      indent?: string,
      starts?: string,
      mark?: string,
      bareBefore?: string,
      bare?: string
    ) => {
      if (named !== undefined) return named + swap(list ?? "");
      if (lone !== undefined) return `${before ?? ""}(${swap(lone)})`;
      if (starts !== undefined) return `${lineStart ?? ""}${indent ?? ""}${swap(starts)}${mark}`;
      if (bare !== undefined) return (bareBefore ?? "") + swap(bare);
      return all;
    }
  );
}

/** A review re-lettered to match the question as it was shown: the right answer, the student's
 *  answer, the note on each choice (moved to the letter shown), and every letter its
 *  explanations name. */
export function reviewForDisplay(
  review: StudentQuizReview,
  map: LetterMap | null
): StudentQuizReview {
  if (!map) return review;
  const perChoice = review.explanation_per_choice as Record<string, string | undefined> | null;
  const remap = (text: string | null | undefined) =>
    typeof text === "string" ? remapLetterMentions(text, map.display) : text;
  return {
    ...review,
    correct_answer: toDisplay(map, review.correct_answer),
    studentAnswer: toDisplay(map, review.studentAnswer),
    explanation_text: remap(review.explanation_text) as string,
    explanation_per_choice: perChoice
      ? (Object.fromEntries(
          Object.entries(perChoice).map(([letter, note]) => [toDisplay(map, letter), remap(note)])
        ) as StudentQuizReview["explanation_per_choice"])
      : review.explanation_per_choice,
    desmos_strategy: remap(review.desmos_strategy) as string | null,
  };
}

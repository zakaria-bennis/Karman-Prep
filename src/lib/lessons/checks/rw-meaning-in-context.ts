import type { LessonChecks } from "./types";

// Solved blind by a second reader: a word of our own in place of the underlined one, then the match.
const checks: LessonChecks = {
  examples: [
    // the theory did not hold below freezing, where "her predictions failed": stay true
    { index: 2 },
    // "no surprise and no strong feeling": lacking excitement
    { index: 1 },
  ],
  // "both wanted ... both backed the same site": a point of agreement
  check: { index: 3 },
  quiz: [
    // "flat voice", "no pictures, no stories and no jokes": dull
    { index: 2 },
    // cover the choices and put in a word of their own, such as last
    { index: 0 },
    // a real meaning of address, but here she deals with the problems
    { index: 3 },
    // "As used in the text, what does the word ... most nearly mean" is the words-in-context question
    { index: 1 },
    // the shelves "struck her with a sadness": filled her with it
    { index: 2 },
  ],
};

export default checks;

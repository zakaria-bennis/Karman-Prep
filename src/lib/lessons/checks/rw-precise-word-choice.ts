import type { LessonChecks } from "./types";

// Solved blind by a second reader: the clue in the text, then the word that matches it exactly.
const checks: LessonChecks = {
  examples: [
    // "by contrast" with crowded and complicated; "just six plates" with few ingredients
    { index: 1 },
    // one extra hour that "most users would barely notice"
    { index: 3 },
  ],
  // "Instead" of nervous, "chatting and joking"
  check: { index: 1 },
  quiz: [
    // expected 2,000, nearly 9,000 came: they guessed too low
    { index: 1 },
    // cover the choices and find the clue: although contrasts with serious
    { index: 3 },
    // "but" plus a few branches after the colon call for a word like minor
    { index: 0 },
    // "yet" sets the blank against steep and rocky
    { index: 2 },
    // "limited to a careful cleaning and a fresh coat of wax"
    { index: 1 },
  ],
};

export default checks;

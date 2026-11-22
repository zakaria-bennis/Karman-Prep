import type { LessonChecks } from "./types";

// Solved blind by a second reader: what the underlined sentence does for the sentences around it.
const checks: LessonChecks = {
  examples: [
    // "however" marks a drawback; "To solve this problem" in the next sentence answers it
    { index: 2 },
    // "rarely spoke ... But whenever a storm": an exception to his silence
    { index: 1 },
  ],
  // "popular belief" then "The real cause is simpler": a mistaken idea the next sentence corrects
  check: { index: 0 },
  quiz: [
    // "always loud" then "though, it was silent": a contrast with one quiet hour
    { index: 3 },
    // function comes from the sentences just before and after the underlined one
    { index: 2 },
    // the answer restates the sentence instead of naming its job (an example of almost no rain)
    { index: 0 },
    // "Lately ... tried the opposite": a newer approach unlike dikes and pumps
    { index: 1 },
    // "Yet ... no real sun could cast" complicates the critics' view that she is a realist
    { index: 2 },
  ],
};

export default checks;

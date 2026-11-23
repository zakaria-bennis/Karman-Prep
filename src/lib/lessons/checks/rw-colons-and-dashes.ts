import type { LessonChecks } from "./types";

// Solved blind by a second reader: a colon or dash only after a full sentence, never after a verb or
// "such as".
const checks: LessonChecks = {
  examples: [
    // "the volunteers asked for three kinds of donations" is complete, then the list: a colon
    { index: 1 },
    // "The reason ... was that" runs on to the verb's own words: no mark
    { index: 1 },
  ],
  // two full sentences, the second explaining the first: a colon (a comma would splice)
  check: { index: 0 },
  quiz: [
    // "are" needs its list right away: no mark after the verb
    { index: 2 },
    // a colon needs a full sentence before it
    { index: 0 },
    // a colon cannot follow "such as"
    { index: 3 },
    // a single dash can introduce an explanation after a full sentence, like a colon
    { index: 1 },
    // "must complete the following" is complete, then the list: a colon
    { index: 0 },
  ],
  // check-ins, solved blind: [check-in, twin] per example
  checkIns: [
    [{ index: 3 }, { index: 0 }],
    [{ index: 2 }, { index: 0 }],
  ],
};

export default checks;
